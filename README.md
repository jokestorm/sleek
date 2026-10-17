# Idle Gambling Game — Design

## Concept

A simple web idle clicker about building a silly, questionable business empire. Players earn points by clicking, invest in risky passive income sources, and gamble those sources through combinations. They can submit their score at any time to end the run and compete on leaderboards.

The game should be attention grabbing and easy to understand, without demanding fast reflexes or heavy mental effort. Meaningful choices should emerge roughly every 10–20 seconds during ordinary play, but the player controls when to act. There is no enforced decision timer.

The original idea of a 15-minute competition has evolved into open-ended runs with multiple leaderboard categories. There is no fixed run limit.

## Core Loop

1. Click to earn initial points.
2. Spend points on clicker upgrades or passive earners.
3. Collect passive income while earners age and become more likely to die.
4. Choose between purchasing more earners, increasing their payouts, upgrading clicks, and gambling on combinations.
5. Rebuild through clicking after losses, or submit the current score to finish the run.

Points are both the spendable currency and the potential submitted score. Investing reduces the score available to submit in exchange for greater earning potential.

## Clicking and the Upgrade Tree

- A button awards points on each click.
- Clicking has no gambling risk.
- Its upgrades scale earning power and persist within the current run.
- The upgrade tree contains exclusive branches, giving players different specializations across runs.
- The clicker tree is separate from passive earners. Click income does not receive a percentage of passive production or scale directly from owning earners.

Stronger individual clicks versus a bonus every tenth click is one possible branch choice, not a finalized tree.

Clicking provides initial capital, useful ongoing income, and a recovery path when passive earners die. The exact upgrade tree and costs remain to be designed.

## Passive Earners

Players may own an unlimited number of earners. The initial types are:

| Type | Role |
| --- | --- |
| Standard | A baseline balance of income and survival. |
| Fragile | Higher output with greater mortality risk. |

Each additional purchase of a type increases the price of future purchases of that type. Prices remain elevated after deaths; losing earners does not reset purchase progression.

Players can spend points on direct payout upgrades for individual earners. Purchasing, upgrading, and combining are deliberate actions; automated management is outside the agreed initial scope.

### Aging and Death

- Each earner has its own age.
- Every second of active play, each earner receives a death roll.
- Its death probability slowly increases with its own age, rather than the age of the run.
- Display the exact current chance of death per second as a percentage.
- Death removes the earner and its future income.

Death does not automatically end a run. The clicker remains available to fund recovery, including when every earner has died.

The starting probabilities, aging curves, and order of income payments and death rolls remain balancing and implementation decisions.

## Combining Earners

Any two earners may be combined, including different types or production levels.

- Combining is a gamble with fixed, disclosed success odds. Age and extra spending do not improve the odds.
- Failure destroys both selected earners.
- Success replaces them with one stronger earner.
- The resulting age is the arithmetic average of the parents' ages.
- The result randomly inherits one parent's type. When types differ, each has a 50% chance; matching types retain that type.
- Direct payout upgrades on the parents are consumed. Their purchased bonuses do not carry into the result's payout or improve success odds.

A successful combination improves base earning potential beyond the two parents' combined base production. For example, two unupgraded earners producing 10 points per second each could produce one earning 30 per second. These numbers are illustrative. Because purchased upgrades are consumed, combining upgraded parents may reduce current income even on success.

Show success odds, possible inherited types, resulting age, and resulting payout before the player commits. The success percentage and payout formula remain to be tuned, including combinations between earners of different strengths.

## Runs, Saving, and Submission

- Runs are open ended and continue until the player chooses to submit.
- Leaving the game saves and pauses the run.
- Returning restores points, earners, ages, upgrades, and progression.
- There is no offline income, aging, or mortality.
- Submitting ends the run and records its results.

Saving should let players return to the same run rather than lose progress on closing the browser. Storage technology, background-tab behavior, and the precise definition of active play are deferred platform decisions.

## Leaderboards

Provide separate rankings for different goals:

- **Most points:** points held when the run is submitted.
- **Longest run:** active run duration, excluding saved time away.
- **Most points per minute:** submitted points divided by active run minutes.

These boards reward accumulation, endurance, and efficiency respectively. A minimum active duration for points-per-minute eligibility is proposed to prevent very short lucky openings from dominating; its threshold is undecided. Further categories can follow once the scoring model is tested.

## Balance Goals

Both clicking and passive earners should remain worth using:

- Clicking offers reliable progress and recovery, with meaningful investment choices.
- A healthy passive engine should offer substantially greater income potential, balanced by purchase costs, aging, and losses.
- Direct upgrades offer predictable payout improvements while concentrating investment in a mortal earner.
- Combinations offer tempting gains with a clearly stated chance of losing both inputs.
- Rising purchase prices discourage endlessly replacing cheap earners and make combination decisions consequential.
- Exclusive clicker branches should support distinct viable approaches.

Unlimited earners can smooth individual losses into predictable aggregate income. Test whether purchase scaling and valuable combined earners preserve meaningful risk at large collection sizes. Also test whether averaging ages makes combining a trivial way to avoid mortality.

All numerical values require playtesting: click payouts, upgrade costs, purchase scaling, production rates, mortality curves, combination odds, and combination output. No balance values are finalized.

## Theme and Scope

The initial tone is silly. A questionable business empire with unstable money-making contraptions and uninsured mergers is a working theme, not a finalized setting or name.

Platform technology, visual design, implementation architecture, hosting, accounts, and leaderboard integrity have not yet been discussed. Those decisions follow this gameplay design. This repository currently documents the concept; it does not yet contain a playable implementation.
