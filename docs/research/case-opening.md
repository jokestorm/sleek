# Case-opening design research

Researched 17 October 2026 using first-party technical documentation and Valve's workshop materials. README describes the implemented game. This note records the evidence and the limits of the comparison; Sleek uses original artwork and explicitly chosen rules rather than claiming to reproduce Counter-Strike exactly.

## Agreed direction

- Free unlimited openings with one starter case and five rarity tiers.
- Editable JSON stores rarity weights separately from catalog items.
- Each awarded item is a unique local instance with its own float and condition.
- A horizontal reel takes approximately five seconds, with Skip available.
- Ticks and reveal audio have a mute control.
- Original weapon- and knife-inspired art, rather than Valve assets.

## Keep rarity probability independent of item count

First select a tier from fixed integer weights, then choose uniformly among its eligible items. With tier weight `w`, total weight `W`, and `n` items in the selected tier, tier probability is `w/W` and each item's probability is `w/(W*n)`. Adding or removing an item redistributes probability only within its tier. These are mathematical properties of the chosen model, not verified Valve rules.

Reject catalogs containing empty positive-weight tiers, duplicate item IDs, unknown tiers, invalid weights, or a nonpositive total. Never silently skip an empty tier or reroll until a populated tier appears: that changes the odds. Sleek's current validator requires every tier to have a positive integer weight and at least one item, with weights totaling 10,000. Supporting disabled zero-weight tiers or additional cases would require an explicit change to this model.

Browser `crypto.getRandomValues()` supplies random integer words. Use rejection sampling for unbiased bounded integers: for unsigned 32-bit words and positive bound `n <= 2^32`, set `limit = floor(2^32/n)*n`, reject words at or above `limit`, then return the remainder modulo `n`. The accepted interval contains the same number of each remainder. Inject the bounded draw for deterministic tests. Node's `crypto.randomInt` explicitly avoids modulo bias but is not a browser API. [MDN: getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues), [Node: randomInt](https://nodejs.org/api/crypto.html#cryptorandomintmin-max-callback), [Lemire: bounded random-integer generation](https://arxiv.org/abs/1805.10941).

Display odds from the same configuration the draw uses. Animation duration, skipping, duplicates, previous openings, and catalog population must not modify tier weights. No exact Valve rarity odds were established in this research.

## The reel presents a committed outcome

`Element.animate()` starts an animation and returns a controllable Animation object. Its `finished` promise resolves at completion; `finish()` jumps to the endpoint. Cancellation can reject the pending finished promise, so handle cleanup explicitly. [MDN: animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate), [finished](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finished), [finish](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finish), [cancel](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel).

Select and commit an outcome once when Open is accepted, before visual motion. Generate decorative reel entries separately and insert the committed outcome at the landing index. Skip, reload, image failure, resize, and hidden-tab transitions must not draw again or grant twice. Keep the latest committed result available for restoration.

Use one clipped horizontal track with a fixed center pointer and animate its transform. Google's browser guidance recommends transform and opacity to avoid expensive layout or paint, and cautions against indiscriminate layer promotion. [web.dev: high-performance animations](https://web.dev/articles/animations-guide).

An initial timeline to tune through play is fast travel followed by continuous deceleration over about five seconds, then a brief readable stop and item reveal. This timing is a Sleek choice, not a verified optimal curve or Valve implementation. Avoid reverse movement across card boundaries. A safe small landing offset inside the winning card adds variation without changing the award. Do not deliberately manufacture rare neighboring cards to imply near misses.

Freeze card pitch for a spin. Position the track origin at viewport center; for card width `c`, gap `g`, winner index `k`, and interior offset `d`, the target translation is `-(k*(c+g)+c/2+d)`. This keeps the pointer on the winner if the viewport resizes. Preload a small image set, retain fallback art, and use the animation's completion signal rather than a guessed timeout. React state need not update every frame.

## Accessible motion and sound

W3C's AAA criterion 2.3.3 calls for disabling interaction-triggered motion unless essential; its C39 technique documents respecting `prefers-reduced-motion`. Present the same result without reel travel when motion is reduced. Use native buttons, text rarity/condition labels, and one final live-region announcement; decorative cards should not be announced. [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions), [Technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html).

Browser autoplay policies can block sound without user interaction and differ between browsers. Initialize or resume audio from the Open action when enabled, retain mute, and continue silently if sound fails. [MDN: autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

Frame callbacks follow display refresh and usually stop in hidden tabs. Page visibility changes are observable, but background timers may be throttled. Use elapsed animation time rather than frame count. Stop ticking audio when hidden/skipped and never emit accumulated missed ticks on return. Completing the cosmetic reel when hidden is a simple policy that preserves the immutable outcome. [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

## Float and visual wear

Valve's workshop guide documents random wear within per-finish ranges and independently placed scratch/grime patterns. Greater wear reveals more scratches and grime; durability masks change which parts expose underlying material. [Valve: Weapon Finishes Guide](https://www.counter-strike.net/workshop/workshopfinishes).

Valve's Custom Paint example sets `wear_remap_min` to `0.02` and `wear_remap_max` to `0.46`; its Patina example uses `0.0–1.0` and distinct colours for metal, fresh patina, aged patina, and grime. This supports configurable ranges and different visual interpretations of wear. [Valve: Custom Paint](https://www.counter-strike.net/workshop/wf_custompaint), [Patina](https://www.counter-strike.net/workshop/wf_patina).

Valve's 2014 GDC presentation says wear was assigned when an item was granted, rather than increasing with use, and describes a bell-curve distribution. That historical statement does not verify the current CS2 distribution. Uniform sampling within a range is therefore a transparent Sleek design choice. [Valve: Building the Content that Drives the Counter-Strike Economy, p. 67](https://steamcdn-a.akamaihd.net/apps/valve/2014/gdc_2014_grimes_csgo_econ_content.pdf).

Valve's accessible guide prints these condition ranges: Factory New `0–0.07`, Minimal Wear `0.07–0.15`, Field-Tested `0.15–0.37`, Well-Worn `0.37–0.44`, Battle-Scarred `0.44–1`. The last two cutoffs conflict with the widely repeated `0.38/0.45`; this investigation did not resolve exact current runtime boundaries. Any Sleek cutoffs must be documented as its own rules. [Valve: wear ranges](https://www.counter-strike.net/workshop/workshopfinishes).

Sleek rolls an independent uniform float in `[0,1)` for every item; the current catalog has no per-finish float ranges. If ranges are added later, validate finite endpoints with `0 <= min <= max <= 1` and sample using `min + u*(max-min)` with `u` in `[0,1)`. Derive condition from the stored full float, never a rounded display. Do not reroll when catalog settings change. Keep rarity and condition distinct: a worn rare item is still rare.

Visible wear should remain stable for the instance and stay inside the weapon silhouette. Preserve finish readability. A uniform darkening of the whole card is a weak substitute for chipped paint and exposed metal. Store or derive a stable visual seed if scratch placement varies; render larger details in inspection rather than burdening every reel thumbnail.

## Validation

Check deterministic tier boundaries, empty-tier rejection, duplicate IDs, unbiased bounded draws, catalog edits preserving tier probability, float bounds/condition boundaries, save restoration, and one award per opening. Manually test narrow screens, zoom, resize mid-spin, repeated Skip, hidden-tab return, reduced motion, keyboard-only play, blocked/muted audio, failed images, and low frame rates. Verify that the card under the pointer always matches the awarded instance. Infinite unique instances also require storage failure handling and a collection view that remains usable as it grows.
