# Replace game sounds

Put your MP3 or WAV files in this folder, then edit `src/audio.json`. A file named `legendary.mp3` is referenced as `/audio/legendary.mp3`:

```json
"reveal-legendary": { "src": "/audio/legendary.mp3", "volume": 0.8 }
```

Available events: `open`, `tick`, `reveal-common`, `reveal-uncommon`, `reveal-rare`, `reveal-epic`, and `reveal-legendary`. Each accepts a local `/audio/` path and volume from 0 to 1. Set `src` to `null` to use the built-in synthesized sound. Set volume to 0 to silence an event. Renaming a rarity ID means adding its matching `reveal-<id>` entry.

Custom audio replaces the built-in sound for that event. Files preload and decode once; until ready, or if missing/unsupported, the built-in sound plays immediately. No delayed custom sound plays over a later opening. Mute stops active and scheduled sounds, and starting another opening clears the previous reveal.

Keep ticks short: playback is capped at 120 ms to prevent overlapping long clips. Other events are capped at five seconds. Use short, trimmed files without leading silence. The example MP3 is a filename to supply yourself; no sound files are required because built-in synthesis works by default.

In development, refresh after replacing a sound file. For the hosted game, rebuild and deploy after changing files or configuration.
