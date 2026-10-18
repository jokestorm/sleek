# Gameplay Playtesting

> Archived: this document describes the retired clicker. Mechanics, code paths, and reproduction commands below are historical. See the [current game guide](../../README.md) and [case-opening validation](../research/case-playtesting.md).


The final clicker economy is documented in [Count-based earners](#count-based-earners). Earlier sections retain evidence from preceding clicker designs. None of these economy or pacing results describe the case-opening game.

## Method

Tested the actual exported game rules with `scripts/simulate.ts`. No simulation injects gold, bypasses discovery, grants free makers, skips failure rolls, or fabricates elapsed production. The simulator uses a seeded random stream and the same purchases, research, combination, contract, prestige, restart, and tick functions as the browser.

All times below are active seconds: a visible, unpaused game. Closing or hiding the browser still pauses gameplay. These are automated economy tests, not a claim that long-term retention or enjoyment has been proven.

| Profile | Gold clicks | Economic decisions | Prestige policy |
| --- | --- | --- | --- |
| Active | Two per second | Up to three investments every three seconds | At least 30 minutes per run; collect at least three points or 25% of current prestige |
| Sparse | Two per second for the first minute, then one per 50 seconds | Up to three investments every 30 seconds | Same policy |
| Unattended | Two per second for the first minute, then none | No purchases, clearing, contracts, combination, or prestige after the first minute | Stay in the existing run |

The managed policies prefer production gained per gold spent, retain a 20% cash buffer per investment, clear failures before investing, claim completed contracts, and attempt matching combinations every two minutes. They are useful repeatable strategies, not optimal play. Sparse input deliberately includes the cost of rebuilding from zero after prestige.

## Historical Results

The seed-42 matrix runs each duration independently from a new game. Earnings below are for the current run at the checkpoint; prestige starts a new run. Income and gold are rounded for display. The final nine-family build was exercised for 291 simulated hours across the matrix, additional seeds, and a 48-hour sparse run.

| Profile | Active hours | Gold | Income/sec | Healthy makers | Prestige points | Research: efficiency / touch | Highest fusion | Ended runs |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| Active | 1 | 4.09e+08 | 4.48e+07 | 36 | 5 | 15 / 14 | 2 | 0 |
| Active | 8 | 1.53e+12 | 6.53e+09 | 36 | 107 | 18 / 17 | 2 | 0 |
| Active | 24 | 1.51e+43 | 2.06e+38 | 36 | 168 | 50 / 50 | 4 | 0 |
| Sparse | 1 | 6,732 | 62 | 6 | 3 | 1 / 0 | 0 | 0 |
| Sparse | 8 | 1.47e+08 | 122,762 | 15 | 24 | 7 / 1 | 2 | 0 |
| Sparse | 24 | 1.99e+13 | 9.78e+08 | 15 | 38 | 13 / 8 | 5 | 0 |
| Unattended | 1 | 54,284 | 17 | 4 | 0 | 0 / 0 | 0 | 0 |
| Unattended | 8 | 144,319 | -2 | 0 | 0 | 0 / 0 | 0 | 0 |
| Unattended | 24 | 38,503 | -2 | 0 | 0 | 0 / 0 | 0 | 0 |
| Sparse | 48 | 5.62e+10 | 1.97e+07 | 15 | 75 | 10 / 4 | 3 | 0 |

## Discovery and First Purchase

Discovery is distinct from ownership. This table compares both events across the active 24-hour run and sparse 48-hour run. Times are cumulative active hours, including earlier runs before prestige.

| Family | Active unlock | Active first purchase | Sparse unlock | Sparse first purchase |
| --- | ---: | ---: | ---: | ---: |
| Standard | 0.00 h | 0.00 h | 0.00 h | 0.00 h |
| Fragile | 0.00 h | 0.01 h | 0.00 h | 0.01 h |
| Clockwork | 0.02 h | 0.05 h | 0.03 h | 0.33 h |
| Prism | 0.07 h | 0.10 h | 0.18 h | 4.88 h |
| Stellar | 0.17 h | 0.23 h | 0.76 h | 6.79 h |
| Singularity | 0.39 h | 2.14 h | 6.75 h | 45.08 h |
| Aurora | 3.62 h | 5.07 h | 31.19 h | 31.21 h |
| Continuum | 6.30 h | 6.40 h | Not reached | Not reached |
| Genesis | 9.05 h | 9.10 h | Not reached | Not reached |

The three late families create additional discoveries after the early workshop is established. Active play discovers Aurora after 3.6 hours, Continuum after 6.3 hours, and Genesis after 9.0 hours; each is eventually purchased. Sparse play discovers and purchases Aurora after 31.2 hours, while Continuum and Genesis remain undiscovered at 48 hours.

The sparse policy buys Aurora before its first Singularity: its lower families and fusion ranks provide competitive immediate returns, and Aurora becomes attractive when available. The active policy delays its first Singularity purchase until 2.1 hours even though discovery occurs much earlier. This distinction prevents treating an unlock notification as proof that a family immediately improves the workshop.

Unattended play discovers Clockwork after 1.5 minutes and Prism after 110.5 minutes but cannot buy them because the policy performs no further actions.

## Failures and Recovery

Active and sparse profiles survive all 24-hour runs for seeds 42, 9, and 2026. The 48-hour sparse seed-42 run also survives. Active play has no startup starvation. Sparse play spends roughly 30 minutes total waiting for enough startup gold across voluntary prestiges, then rebuilds without free resources. That delay is a strategy cost rather than a permanent deadlock.

Unattended workshops eventually lose their initial four makers. Seed 42 retains 38,503 gold after 24 hours despite draining failures, so paid clearing and recovery remain possible. Seed 9 crosses below zero and ends its run, verifying that unattended failure risk has consequences. Seed 2026 survives with a positive reserve. This profile leaves the visible game running; closing or hiding the tab pauses losses.

## Refinements Driven by Testing

- The original uncapped maker purchase scaling leaves maker income at zero during long runs; replacement price scaling now has a cap.
- The first prestige formula grants billions of permanent points within eight hours. Logarithmic rewards remove that runaway while preserving a clear replay benefit.
- Increasing research limits and escalating prices supports longer upgrade progression. The sparse profile has many research levels remaining after 48 hours; aggressive active play reaches the current research caps by 24 hours.
- Repeatable commission choices give short objectives and retain productive work between major discoveries. Tests verify that claiming resets every choice and cannot pay out twice.
- Aurora, Continuum, and Genesis extend discoveries beyond the six early families. Their observed first purchases verify that they are actual economic choices.
- Production milestones at one, eight, and 24 hours and mastery bonuses for commission completion and higher fusion ranks reward additional types of progress.
- Submission records now score retained gold rather than all gold ever earned during a run; a regression test covers the distinction.

## Remaining Balance Findings

An aggressive player making two gold clicks per second and nearly one investment per second can discover all nine families in about nine hours and reach current research caps within a day. This profile is a stress test rather than a plausible continuous human session. Slower management spreads meaningful discoveries across days, with two families still ahead at 48 hours. Fusion, commissions, workshop composition, and prestige remain repeatable after the final discovery.

Safety research makes late-run failures uncommon. This supports relaxed play, but means failure is chiefly an early-game and unattended consideration. A player prioritizing immediate income can delay newly discovered families for hours; family purchase value should continue to be assessed alongside fusion and upgrades.

These deterministic economy tests cannot establish enjoyment, retention, accessibility, or balance across every human strategy. Browser interaction and presentation checks are reported separately.

## Reproduction

```sh
npm test
npm run build
npm run simulate -- 1 2 42
npm run simulate -- 8 2 42
npm run simulate -- 24 2 42
npm run simulate -- 24 0.02 42 60 30
npm run simulate -- 48 0.02 42 60 30
npm run simulate -- 24 0 42 60 0
```

Arguments are hours, ongoing clicks per second, seed, initial seconds at two clicks per second, and economic decision interval. An interval of zero stops economic decisions after the initial period. The default decision interval is three seconds.

Rule coverage includes save/pause behavior, failed drains and paid clearing, purchased slots, negative-gold endings, exclusive click paths, discovery gates, upgrades retaining maker age, both combination outcomes, prestige persistence, frozen submissions with retained-gold scores, one-time contract rewards, migration from older saves, corrupt-save rejection, and retirement without inflated earnings. Build and all 17 rule tests pass.

## Historical Browser Validation

Chromium interaction checks passed for a two-minute playthrough using real clicks, timed maker income, purchases, a commission claim, and research without injected gold. Additional checks exercised pause, save/reload, fusion, discoveries, cancellation and confirmation of prestige, voluntary submission, ended-save restoration, restart, retirement, paused confirmation dialogs, backup export, valid restore, and invalid-backup rejection. Every tab fits widths of 1440, 840, 390, and 320 pixels without horizontal overflow or page errors. Large values switch to scientific notation to keep the interface legible.

## Interface Rework Verification

Removed automatic output bonuses from commission rounds, elapsed active time, and fusion mastery, plus the special commission reward bonus at round 25. Maker output now has only explicit factors: family base output, purchased maker levels, fusion rank, production research, legacy, and failure drains. Commissions award gold without modifying output. The next unlock follows the next lifetime-gold threshold rather than switching between unrelated progress fractions.

Re-ran the same active and sparse strategies, seed 42, and decision budgets without changing the simulator policy. These six independent runs cover another 66 simulated active hours. The UI structure does not affect these rule-level tests; browser checks for the single-workshop interface are performed separately.

| Profile | Active hours | Gold | Income/sec | Working makers | Prestige points | Efficiency / touch research | Ended runs |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| Active | 1 | 4.01e+07 | 4.46e+06 | 36 | 4 | 13 / 12 | 0 |
| Active | 8 | 6.94e+11 | 5.13e+10 | 36 | 59 | 22 / 21 | 0 |
| Active | 24 | 8.78e+39 | 9.54e+35 | 36 | 147 | 50 / 50 | 0 |
| Sparse | 1 | 15 | 0 | 0 | 3 | 0 / 0 | 0 |
| Sparse | 8 | 6.32e+06 | 7,341 | 11 | 24 | 5 / 0 | 0 |
| Sparse | 24 | 7.01e+10 | 5.85e+06 | 14 | 38 | 11 / 6 | 0 |

| Family | Active unlock | Active first purchase | Sparse unlock | Sparse first purchase |
| --- | ---: | ---: | ---: | ---: |
| Standard | 0.00 h | 0.00 h | 0.00 h | 0.00 h |
| Fragile | 0.00 h | 0.01 h | 0.00 h | 0.01 h |
| Clockwork | 0.02 h | 0.05 h | 0.03 h | 0.33 h |
| Prism | 0.07 h | 0.11 h | 0.19 h | 0.80 h |
| Stellar | 0.19 h | 0.27 h | 0.86 h | 7.26 h |
| Singularity | 0.77 h | 3.21 h | 7.36 h | Not reached in 24 h |
| Aurora | 4.54 h | 6.97 h | Not reached in 24 h | Not reached in 24 h |
| Continuum | 11.00 h | 11.24 h | Not reached in 24 h | Not reached in 24 h |
| Genesis | 13.57 h | 16.04 h | Not reached in 24 h | Not reached in 24 h |

Removing the hidden multipliers slows progression while leaving each income change explainable. The active policy buys Aurora at 7.0 hours, Continuum at 11.2 hours, and Genesis at 16.0 hours, compared with 5.1, 6.4, and 9.1 hours in the historical build. Genesis is discovered at 13.6 hours; the delay before buying is a consequence of this strategy’s spending and prestige choices.

Sparse play still has Aurora, Continuum, and Genesis ahead after 24 hours. Its one-hour checkpoint falls just after a prestige, so zero maker income there represents rebuilding; the policy subsequently recovers without injected gold. Across its nine prestiges it waits 28.5 minutes total for startup funds, with no ended runs. It buys four Stellar makers by 24 hours, while its discovered Singularity remains an unpurchased option. The historical 48-hour sparse result has not been revalidated for these simplified rules.

Both profiles retain fusion, research, commissions for gold, maker composition, and prestige choices. The aggressive 24-hour strategy reaches the current research caps and fusion rank five; the sparse strategy still has many research levels and three families remaining. No non-finite economy values occurred. These runs verify economic reachability and recovery rather than human enjoyment or retention.

Focused rule tests verify that commission claims do not change income, elapsed time and commission counts do not alter output, crossing the former fusion-mastery rank adds no extra bonus, round 25 introduces no hidden commission reward increase, and the production breakdown matches both maker output and settled tick gold. Tests also verify a stable next unlock while time, clicks, combinations, commissions, and spending change. All 20 rule tests pass, including 14 progression tests run directly with Node.

## Current Workshop Browser Verification

The single-screen rework passed `scripts/browser-check.mjs` in Chromium against the local Vite server. Initial purchases are funded through real click-button interactions. Later fixtures exercise controls without being counted as economy evidence.

- One-click maker buying deducts the quoted cost, fills the first available slot, and selects the new maker. A full workshop blocks buying and offers explicit expansion.
- Maker inspection, improvement previews, production research previews, output breakdowns, and stable next-unlock tracking agree with the game rules.
- Fusion offers only working partners of the same family and rank. Retirement pauses for confirmation, clears stale selection, and preserves earnings. Failed makers require paid clearing.
- Settings pause the simulation. Prestige and submission support cancellation, confirmation, ended-save reload, and restart. Manual pause preserves state.
- Backup export, invalid-import rejection, restore cancellation and confirmation, and keyboard focus restoration pass.
- The workshop and settings fit widths of 320, 390, 768, and 1440 pixels with 36 makers and a gold balance of 1e43. No horizontal overflow or page errors occurred.

Run the app on port 5174, then execute `node scripts/browser-check.mjs /absolute/path/to/@playwright/test/index.mjs`, or omit the module path when Playwright is installed in the project. `BASE_URL` selects another local server. Desktop and mobile screenshots were also inspected visually.

## Earners Without Combining

The current game uses earners throughout its rules and interface. Combining, fusion ranks, partner selection, related orders, and the fusion unlock have been removed. Only click and gold goals remain in optional orders. Output uses family base, purchased levels, production research, legacy, and failure drains.

Save format six migrates older local saves. Format-five migration preserves gold, ages, purchased levels, research, lifetime earnings, legacy, order progress, and run records while discarding combination ranks and counters. Historical record counts migrate to the earner terminology. Tests cover this migration for a completed run as well as the earlier format-three and format-four migrations.

The simulator now uses retirement followed by a normal purchase when a full workshop would benefit from replacing its weakest earner. It pays all normal prices and receives only the normal retirement refund. This replaces the simulator's former combination actions; it does not add an automatic replacement feature to the game.

Two independent 24-hour seed-42 simulations, one active and one sparse, completed without ended runs or non-finite balances. The active policy bought Aurora after 4.5 hours, Continuum after 6.4 hours, and Genesis after 9.2 hours. Sparse play bought Aurora after 14.5 hours and Continuum after 22.9 hours; Genesis remained undiscovered at 24 hours. These are reachable strategies rather than guarantees about human playtime, and should not be compared directly with the older policy that freed slots through combining.

All 20 rule tests pass. The updated browser check exercises earner controls and verifies that combining controls, partner selectors, and combination orders are absent.

## Count-Based Earners

The current model replaces individual units with one owned count and upgrade level per type. Buying adds a unit; upgrading doubles every current and future unit of that type. Capacity limits, ages, failures, drains, clearing, retirement, individual detail panels, and global research are removed. No older save compatibility code remains.

Nine focused rule tests and the updated Chromium workflow pass. Browser checks cover real initial clicks and buying, whole-type upgrades, upgraded future purchases, more than 36 owned earners, absence of upkeep controls, pause, current saves, prestige, orders, backup restoration, submission, keyboard focus, and widths of 320, 390, 768, and 1440 pixels.

Three independent 24-hour simulations exercise active play, sparse management, and a workshop left running unattended after its first minute. Every purchase and upgrade uses real earned gold. There is no randomness in the current economy.

| Profile | Ongoing clicks/sec | Decisions | Earners at 24h | Income/sec at 24h | Legacy points |
| --- | ---: | --- | ---: | ---: | ---: |
| Active | 2 | Every 3 seconds | 869 | 3.20e10 | 53 |
| Sparse | 0.02 | Every 30 seconds | 1,352 | 3.05e14 | 68 |
| Unattended | 0 | None after minute one | 11 | 15 | 0 |

All profiles use two clicks per second for the first minute. The unattended workshop keeps exactly the same 11 earners and 15 gold/sec afterward; it has about 1.30 million gold after 24 hours, with no maintenance or losses. Hidden tabs still pause production, so this profile represents leaving the visible game running.

The active policy discovers Aurora after 8.7 hours but keeps buying affordable alternatives instead of saving for its first Aurora purchase within the 24-hour window. Sparse management banks more gold between decisions and buys Aurora after 10.8 hours. Continuum and Genesis remain ahead for both profiles. These different spending choices demonstrate that the simulator is one legal strategy, not an optimal policy or a guarantee of human pacing.

Reproduce with `npm run simulate -- 24 2 3`, `npm run simulate -- 24 0.02 30`, and `npm run simulate -- 24 0 0`. The arguments are now hours, ongoing clicks per second, and management interval. No seed is required because earners no longer have random outcomes.
