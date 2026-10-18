let context: AudioContext | null = null;
let muted = false;
export function setMuted(value: boolean) { muted = value; }
export function unlockAudio() {
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => { });
  }
  catch { /* Audio is optional. */ }
}
function tone(frequency: number, duration: number, volume: number, delay = 0) {
  if (!context || muted || context.state !== 'running')
    return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator(), gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(start);
  oscillator.stop(start + duration);
}
export function tick() { tone(1100, .025, .035); }
export function reveal() { tone(440, .35, .09); tone(660, .45, .07, .08); tone(880, .6, .05, .16); }
