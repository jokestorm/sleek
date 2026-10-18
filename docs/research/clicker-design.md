# Clicker design research

Researched 17 October 2026 for Sleek. This note separates observations from proposed gameplay. README remains the authoritative implemented design. The sources are developer writing, developer interviews, an official press kit, and the publisher's product description. They suggest useful patterns; they do not prove that any one mechanic causes popularity or retention.

## Findings

### Discovery changes the activity

A Dark Room's developers describe a game that begins with one button and gradually reveals new interactions, requiring the player to change strategy as the world expands. Its official press kit reports unexpected viral success on the web and a later number-one iOS chart position. That supports studying the combination of a legible beginning and surprising mechanical expansion, rather than treating an initially large upgrade menu as discovery. [Source: doublespeak games press kit](https://press.doublespeakgames.com/adr/index.html).

For Sleek, the useful inference is to begin with gold, clicking, slots, and two maker types, then introduce distinct decisions: specialization, maker improvement, contracts, combination, automation, and a voluntary restart. Reveal the next milestone's requirement before its reward arrives. Unlocking a differently named maker with identical tradeoffs provides less novelty than unlocking a new way to use existing makers.

### Production has to overtake costs periodically

Anthony Pecorella models incremental progression as alternating production surges and rising purchase costs. With exponential costs and slower production growth, purchases eventually become impractical unless multipliers or resets intervene. He also shows that carefully placed upgrades can change which generator offers the best investment, keeping older generators relevant. [Source: Kongregate, The Math of Idle Games, Part I](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-i).

The inference for Sleek is to measure time to the next meaningful purchase, rather than merely growing gold totals. Maker families need different moments of usefulness. A cheap standard maker can remain valuable through a reliability bonus, a collection objective, or a combination recipe even after expensive makers arrive. Avoid universal multipliers that make every choice improve identically.

### Long games need more than long waits

Cookie Clicker's official Steam description advertises maker variety, hundreds of upgrades and achievements, minigames, and persistent upgrades. This is direct evidence of a mature game's breadth, not evidence that Sleek needs hundreds of manually authored entries. [Source: official Cookie Clicker product page](https://store.steampowered.com/app/1454400/Cookie_Clicker/).

The inference is to make a small number of complementary systems generate changing goals. Contracts can ask for different compositions, upgrades can reward investment, and combination can free scarce slots. These overlap naturally with Sleek's existing economy and require less infrastructure than unrelated minigames.

### Restarting should open strategic options

In a developer interview, Playsaurus emphasizes strategic depth beyond clicking and waiting, says player feedback led to adding Ascension, and recommends obtaining feedback early. The same first-party article describes two reset layers and different builds. These are practitioner observations rather than controlled retention findings. [Source: interview with Playsaurus CEO Austin Oblouk](https://blog.clickerheroes.com/the-evolution-and-success-of-clicker-heroes-interview-with-playsaurus/).

For Sleek, the inference is to make a voluntary submission reward persistent progress and a new build, rather than only resetting numbers. Disclose the reward before submission. Permanent discoveries should persist even when makers and gold reset; the beginning of the next run should accelerate visibly.

### Scope and expectations matter

Playsaurus's Clicker Heroes 2 retrospective identifies expanded scope, repeated core redesigns, and insufficient launch content relative to player expectations among its mistakes. The developers describe how those problems slowed improvement. [Source: The State of Clicker Heroes 2](https://blog.playsaurus.com/2021/06/28/the-state-of-clicker-heroes-2/).

For Sleek, build depth around the current economy, label any finite content horizon honestly, and test full progression before claiming long-term completeness. No research note or short automated run establishes months of enjoyable play.

## Proposed design: the questionable workshop

These are recommendations and experimental targets, not agreed mechanics or measured balance.

| Layer | Decision introduced | Why it remains relevant |
| --- | --- | --- |
| First makers | Standard reliability versus fragile output | The player learns that income and risk are different quantities |
| Specialization | Reliable click income versus periodic bursts | Active play has a run identity |
| Workshop improvements | Upgrade one maker or buy another slot | Scarce slots create an investment tradeoff |
| Additional maker families | Reliable, powerful, supportive, or volatile makers | The roster changes composition instead of only getting larger |
| Contracts | Meet a production, composition, improvement, or combination objective | A short objective gives a reason to try another strategy |
| Combination | Consume two makers for a disclosed chance at concentrated production | Slots and aging create a reason to combine beyond a larger number |
| Automation | Pay for clearing failures and replenishing makers | Familiar chores become strategic budget choices |
| Submission and legacy | Bank a run for persistent upgrades | A plateau becomes a deliberate new beginning |

Use a discovery ledger with known goals and evocative hints for unrevealed rewards. Keep essential rules, failure costs, and combination odds visible. Mystery belongs in content, not in financial consequences.

Contracts should have several alternative objectives, so an unlucky failure cannot permanently block progression. Avoid requirements tied solely to elapsed time: a player should usually advance by doing something. A repeatable endgame contract can raise its target and reward without presenting itself as newly authored content.

Make failure a bounded management problem. Show net production after drains, failed-maker clearing costs, and a warning when the balance is shrinking. Early clearing must remain affordable through active play. Later automation should remove repetitive clicking without removing the need to fund reserves. A combination failure can consume its ingredients if that loss and its exact odds are disclosed before selection; it should not hide additional penalties.

## Pacing and gameplay validation

The following are provisional playtest targets, not research-backed universal timings.

- First purchase within about 30 seconds of ordinary active play; first strategic branch within two minutes.
- Introduce a new mechanic every few minutes early on, with a next-goal hint available throughout.
- Reach contracts, upgrades, and combination in a representative first session instead of burying them behind hours of passive waiting.
- Let later play grow from optimization and persistent choices. Do not stretch early costs merely to claim more content.
- Preserve pause-on-hide and no offline losses. Add no daily streaks, expiring rewards, or penalties for taking a break. These are design preferences for respectful pacing, not causal findings from the sources.

Test complete runs with deterministic randomness using at least a cautious standard-maker strategy, an aggressive fragile-maker strategy, and an active-click strategy. Record first-purchase time, each discovery time, longest interval without an affordable useful action, failure recovery cost, submission reward, and time to regain the previous peak after restarting. Compare several seeds: success under average luck does not establish recovery under bad luck.

Manual play still matters. Check whether buying an upgrade feels different from buying a maker, whether the next discovery is understandable, whether a failure prompts a useful choice, and whether the next run feels meaningfully faster. Automated simulations can expose stalls and dominant strategies; they cannot establish that the game is fun.
