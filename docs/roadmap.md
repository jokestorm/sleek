# Planned game features

These are requested future directions, separate from the implemented game in [README](../README.md). The demo currently uses 2D inspection and browser-local inventory. This plan adds no backend or 3D dependency yet.

## 360-degree item inspection

Let players drag or swipe to rotate a weapon through a full 360 degrees, with zoom and a reset-view control. Keep the item's rarity, condition, and precise float visible alongside the viewer.

This needs original 3D weapon assets and material information for every supported archetype. The model must show the same finish and deterministic wear as the owned instance. Rotating the current flat PNG is not a substitute for inspecting its other side. Custom catalog artwork will keep a 2D fallback when no compatible model exists.

Choose a model format, renderer, material pipeline, and asset budget when implementation starts. Load the viewer on demand so opening cases stays fast. Verify touch and keyboard controls, full rotation, consistent wear after reload, and a usable fallback on devices without supported graphics.

## Live opening log

Show other players' real case-opening results in a compact live feed. Entries should identify the player, item, rarity, condition, float, and opening time. The feed should update without interrupting the local reel or stealing scroll position.

Real shared results require a backend event stream; the current static site and local inventory cannot provide them. Decide how players are identified and how openings are published when this feature is built. Publish each completed reveal once, so the feed does not spoil an item before its owner sees it. Use a stable event ID to deduplicate reconnects and a bounded recent history to catch up after a connection drops.

Choose storage and a real-time transport during implementation. Display connection status, handle offline play, and keep rendering work bounded during busy periods. Test two independent browser sessions receiving one another's results, reconnect recovery without duplicates, and safe display of player names. Inventory deletion should remain separate from historical opening events. The feed should represent actual published openings rather than simulated other players.

## Economy

Add currency, a way to earn it, and case costs in a later pass. Unlimited free openings remain the current rule. Define earning pace, costs, and recovery before replacing it.
