# Planned game features

These are requested directions and their implementation status. [README](../README.md) describes the implemented game. The demo now has 3D inspection for built-in items and browser-local inventory; the shared feed and economy remain future work.

## 360-degree item inspection: implemented

Players can drag or swipe to rotate built-in weapons through a full 360 degrees, zoom, reset, and use keyboard controls. Rarity, condition, and float remain visible alongside the viewer. Three.js and four original solid models load on demand; graphics failures and custom artwork retain a 2D fallback.

The initial models are procedural interpretations of the weapon archetypes. Paint materials use the owned instance's colors, float, and wear seed. They are not exact reconstructions of the generated PNGs, and their surface wear has a different projection from the 2D overlays.

Remaining refinements include authored model assets, closer alignment of 2D/3D appearance, and a catalog model format for custom finishes. See [inspection implementation](inspection.md) for controls, model construction, resource handling, and validation.

## Live opening log

Show other players' real case-opening results in a compact live feed. Entries should identify the player, item, rarity, condition, float, and opening time. The feed should update without interrupting the local reel or stealing scroll position.

Real shared results require a backend event stream; the current static site and local inventory cannot provide them. Decide how players are identified and how openings are published when this feature is built. Publish each completed reveal once, so the feed does not spoil an item before its owner sees it. Use a stable event ID to deduplicate reconnects and a bounded recent history to catch up after a connection drops.

Choose storage and a real-time transport during implementation. Display connection status, handle offline play, and keep rendering work bounded during busy periods. Test two independent browser sessions receiving one another's results, reconnect recovery without duplicates, and safe display of player names. Inventory deletion should remain separate from historical opening events. The feed should represent actual published openings rather than simulated other players.

## Economy

Add currency, a way to earn it, and case costs in a later pass. Unlimited free openings remain the current rule. Define earning pace, costs, and recovery before replacing it.
