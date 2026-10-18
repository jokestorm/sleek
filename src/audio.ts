import configSource from './audio.json?raw';

type Sound = { src: string | null; volume: number };
const sounds: Record<string, Sound> = {};
try {
  const raw = JSON.parse(configSource);
  for (const [key, value] of Object.entries(raw)) {
    const sound = value as Sound;
    if (sound && (sound.src === null || (typeof sound.src === 'string' && /^\/audio\/[a-z\d_./-]+$/i.test(sound.src) && !sound.src.split('/').includes('..')))
      && Number.isFinite(sound.volume) && sound.volume >= 0 && sound.volume <= 1) sounds[key] = sound;
  }
} catch { /* Invalid sound configuration keeps synthesized defaults available. */ }
let context: AudioContext | null = null;
let muted = false;
const buffers = new Map<string, AudioBuffer>();
const files = new Map<string, Promise<ArrayBuffer | null>>();
const decoding = new Set<string>();
const voices = new Set<AudioScheduledSourceNode>();

export function stopAudio() {
  for (const voice of voices) {
    try { voice.stop(); } catch { /* Already ended. */ }
  }
  voices.clear();
}
export function setMuted(value: boolean) {
  muted = value;
  if (value) stopAudio();
}
// Fetch early; decode after the first user gesture creates the audio context.
export function prepareAudio() {
  for (const sound of Object.values(sounds)) {
    if (!sound.src || files.has(sound.src)) continue;
    files.set(sound.src, fetch(sound.src).then(response => response.ok ? response.arrayBuffer() : null).catch(() => null));
  }
}
export function unlockAudio() {
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
    prepareAudio();
    for (const [src, file] of files) {
      if (buffers.has(src) || decoding.has(src)) continue;
      decoding.add(src);
      void file.then(async data => {
        if (data && context) buffers.set(src, await context.decodeAudioData(data));
      }).catch(() => {}).finally(() => decoding.delete(src));
    }
  } catch { /* Audio is optional. */ }
}
function connect(source: AudioScheduledSourceNode, volume: number) {
  const gain = context!.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(context!.destination);
  voices.add(source);
  source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
  return gain;
}
function playable() { return !!context && !muted && !document.hidden && context.state === 'running'; }
function custom(key: string): boolean {
  if (!playable()) return true;
  const sound = sounds[key];
  const buffer = sound?.src ? buffers.get(sound.src) : null;
  if (!buffer) return false;
  const source = context!.createBufferSource();
  source.buffer = buffer;
  connect(source, sound.volume);
  source.start();
  // A mislabeled long file must not accumulate dozens of overlapping reel ticks.
  source.stop(context!.currentTime + Math.min(buffer.duration, key === 'tick' ? .12 : 5));
  return true;
}
function tone(key: string, frequency: number, duration: number, volume: number, delay = 0, type: OscillatorType = 'sine', endFrequency = frequency) {
  if (!playable() || sounds[key]?.volume === 0) return;
  const start = context!.currentTime + delay;
  const oscillator = context!.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  const gain = connect(oscillator, volume * (sounds[key]?.volume ?? .6));
  gain.gain.setValueAtTime(.001, context!.currentTime);
  gain.gain.setValueAtTime(.001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(.001, volume * (sounds[key]?.volume ?? .6)), start + .006);
  gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  oscillator.start(start);
  oscillator.stop(start + duration);
}
export function openingSound() {
  stopAudio();
  if (!custom('open')) { tone('open', 160, .18, .18, 0, 'triangle', 50); tone('open', 2100, .035, .06); }
}
export function tick() {
  if (!custom('tick')) { tone('tick', 1600, .022, .1, 0, 'triangle', 900); }
}
export function reveal(rarityId: string, level: number) {
  stopAudio();
  const key = `reveal-${rarityId}`;
  if (custom(key)) return;
  // Higher tiers add bass, harmony, then a rising sparkle rather than just volume.
  const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760];
  tone(key, 110, .25 + level * .07, .12, 0, 'sine', 55);
  notes.slice(0, 2 + level).forEach((note, i) => tone(key, note, .35 + level * .12, .065, i * .065));
  if (level >= 2) [880, 1318.51, 1760, 2217.46].slice(0, level).forEach((note, i) => tone(key, note, .3, .035, .3 + i * .09));
}
