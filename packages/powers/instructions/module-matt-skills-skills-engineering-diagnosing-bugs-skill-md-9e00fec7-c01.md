---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-engineering-diagnosing-bugs-skill-md-9e00fec7-c01"
title: "matt-skills: skills/engineering/diagnosing-bugs/SKILL.md module"
summary: "Carrier for 4 atomic instructions from matt-skills:skills/engineering/diagnosing-bugs/SKILL.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/engineering/diagnosing-bugs/SKILL.md\"}"
atom_ids:
  - build-a-tight-feedback-loop
  - instrument-one-variable-at-a-time
  - minimise-the-reproduction
  - rank-falsifiable-hypotheses
atom_count: 4
atoms: "[{\"atom_id\":\"build-a-tight-feedback-loop\",\"file_sha256\":\"a4eeeb90b241926aa47da1ab8768d52162c76ff649f08c509540082d2123b653\",\"content_sha256\":\"daceb479a171956bc1dfd501f5b59463d0a814ac71a20d48fe8428e11d33fa93\",\"file_bytes\":4906,\"body_bytes\":3825},{\"atom_id\":\"instrument-one-variable-at-a-time\",\"file_sha256\":\"d32a83502cd0449d5fe8f2def96a622a58265f774541f27ab64947762b15e569\",\"content_sha256\":\"88723dc79be6575c1a10d29d251d429e9b46fce308ba3b7df6fdc1c793e67f7d\",\"file_bytes\":1794,\"body_bytes\":702},{\"atom_id\":\"minimise-the-reproduction\",\"file_sha256\":\"ca537b7f9cc687acc9dc0851a6bf2247913e5b8c8739f714815046670f6d59f4\",\"content_sha256\":\"5b51459f395101b9622f48858cc2f43bc292b6a9b8b277444e07bbe62e9a472b\",\"file_bytes\":2079,\"body_bytes\":1077},{\"atom_id\":\"rank-falsifiable-hypotheses\",\"file_sha256\":\"924b77b2bd4d2d46afeb63dd758b2b811df36a55700cdb43e3010d363a1172ec\",\"content_sha256\":\"0ab44df4a1b368cea4a3311d37e9c9de8975fb35c86c9633128f8c8d8d7ac7ef\",\"file_bytes\":1747,\"body_bytes\":724}]"
carrier_sha256: 63501bf2f1912913bab3d0d0ee1e6b18a3dc12b63d125a911fc701dbf7d9bb84
carrier_bytes: 10981
revision: 1
status: active
---
<!-- vpmodule:atom:begin build-a-tight-feedback-loop -->
---
instruction_id: build-a-tight-feedback-loop
title: Build a tight feedback loop
summary: "Build one fast, deterministic, red-capable feedback loop before any hypothesis, and keep it tight."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A hard bug or a performance regression must be diagnosed.
conditions_does_not_apply_when: "The cause is already known, or a red-capable loop cannot be built and the user was asked."
artifact_contract_output_type: feedback-loop
artifact_contract_required_data:
  - loop command
  - observed output
  - tightness properties
artifact_contract_verified_by: "the loop is red on the exact symptom and is deterministic, fast and agent-runnable"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/diagnosing-bugs/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Build a tight feedback loop
**This is the skill.** Everything else is mechanical. If you have a **tight** pass/fail signal for the bug (one that goes red on _this_ bug), you will find the cause; bisection, hypothesis-testing, and instrumentation all just consume it. If you don't have one, no amount of staring at code will save you.
Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**
### Ways to construct one, in roughly this order
1. **Failing test** at whatever seam reaches the bug: unit, integration, e2e.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** that drives the UI and asserts on DOM/console/network.
5. **Replay a captured trace.** Save a real network request / payload / event log to disk; replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system (one service, mocked deps) that exercises the bug code path with a single function call.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run 1000 random inputs and look for the failure mode.
8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" so you can `git bisect run` it.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs.
10. **HITL bash script.** Last resort. If a human must click, drive _them_ with a structured human-in-the-loop loop template so the loop is still structured. Captured output feeds back to you.
Build the right feedback loop, and the bug is 90% fixed.
### Tighten the loop
Treat the loop as a product. Once you have _a_ loop, **tighten** it:
- Can I make it faster? (Cache setup, skip unrelated init, narrow the test scope.)
- Can I make the signal sharper? (Assert on the specific symptom, not "didn't crash".)
- Can I make it more deterministic? (Pin time, seed RNG, isolate filesystem, freeze network.)
A 30-second flaky loop is barely better than no loop; a 2-second deterministic one is tight, a debugging superpower.
### Non-deterministic bugs
The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not, so keep raising the rate until it's debuggable.
### When you genuinely cannot build a loop
Stop and say so explicitly. List what you tried. Ask the user for: (a) access to whatever environment reproduces it, (b) a redacted captured artifact (HAR file, log dump, core dump, screen recording with timestamps), or (c) permission to add temporary production instrumentation. Do **not** proceed to hypothesise without a loop.
### Completion criterion: a tight loop that goes red
Phase 1 is done when the loop is **tight** and **red-capable**: you can name **one command** (a script path, a test invocation, a curl) that you have **already run at least once** (show the invocation and its output, redacted), and that is:
- [ ] **Red-capable**: it drives the actual bug code path and asserts the **user's exact symptom**, so it can go red on this bug and green once fixed. Not "runs without erroring"; it must be able to _catch this specific bug_.
- [ ] **Deterministic**: same verdict every run (flaky bugs: a pinned, high reproduction rate, per above).
- [ ] **Fast**: seconds, not minutes.
- [ ] **Agent-runnable**: you can run it unattended; a human in the loop only via a structured loop template.
If you catch yourself reading code to build a theory before this command exists, **stop: jumping straight to a hypothesis is the exact failure this skill prevents.** No red-capable command, no Phase 2.
<!-- vpmodule:atom:end build-a-tight-feedback-loop -->
<!-- vpmodule:atom:begin instrument-one-variable-at-a-time -->
---
instruction_id: instrument-one-variable-at-a-time
title: Instrument one variable at a time
summary: "Probe with one changed variable at a time, prefer a debugger over broad logging, and tag and later remove every debug log."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A probe must distinguish between competing hypotheses.
conditions_does_not_apply_when: A single hypothesis needs no instrumentation.
artifact_contract_output_type: instrumented-probe
artifact_contract_required_data:
  - probe
  - changed variable
  - tagged logs
  - removal evidence
artifact_contract_verified_by: each probe maps to one prediction and the debug instrumentation is gone afterwards
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/diagnosing-bugs/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Instrument one variable at a time
Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**
Tool preference:
1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".
**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep. Untagged logs survive; tagged logs die.
**Perf branch.** For performance regressions, logs are usually wrong. Instead: establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.
<!-- vpmodule:atom:end instrument-one-variable-at-a-time -->
<!-- vpmodule:atom:begin minimise-the-reproduction -->
---
instruction_id: minimise-the-reproduction
title: Minimise the reproduction
summary: "Shrink a red reproduction to the smallest scenario that still goes red, one cut at a time."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A reproduction is red but carries more moving parts than the failure needs.
conditions_does_not_apply_when: The reproduction is already minimal.
artifact_contract_output_type: minimal-repro
artifact_contract_required_data:
  - minimal scenario
  - load-bearing elements
  - re-run result
artifact_contract_verified_by: removing any remaining element turns the loop green
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/diagnosing-bugs/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Minimise the reproduction
Run the loop. Watch it go red as the bug appears.
Confirm:
- [ ] The loop produces the failure mode the **user** described, not a different failure that happens to be nearby. Wrong bug = wrong fix.
- [ ] The failure is reproducible across multiple runs (or, for non-deterministic bugs, reproducible at a high enough rate to debug against).
- [ ] You have captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the fix actually addresses it.
### Minimise
Once it's red, shrink the repro to the **smallest scenario that still goes red**. Cut inputs, callers, config, data, and steps **one at a time**, re-running the loop after each cut, and keep only what's load-bearing for the failure.
Why bother: a minimal repro shrinks the hypothesis space in Phase 3 (fewer moving parts left to suspect) and becomes the clean regression test in Phase 5.
Done when **every remaining element is load-bearing**: removing any one of them makes the loop go green.
Do not proceed until you have reproduced **and** minimised.
<!-- vpmodule:atom:end minimise-the-reproduction -->
<!-- vpmodule:atom:begin rank-falsifiable-hypotheses -->
---
instruction_id: rank-falsifiable-hypotheses
title: Rank falsifiable hypotheses
summary: "Generate several ranked, falsifiable hypotheses before testing any of them, and show the ranked list to the user."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A reproduction is red and the cause is not yet known.
conditions_does_not_apply_when: The cause is obvious or already confirmed.
artifact_contract_output_type: ranked-hypotheses
artifact_contract_required_data:
  - ranked hypotheses
  - prediction per hypothesis
artifact_contract_verified_by: each hypothesis states the prediction its test would confirm or refute
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/diagnosing-bugs/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Rank falsifiable hypotheses
Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.
Each hypothesis must be **falsifiable**: state the prediction it makes.
> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."
If you cannot state the prediction, the hypothesis is a vibe: discard or sharpen it.
**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly ("we just deployed a change to #3"), or know hypotheses they've already ruled out. Cheap checkpoint, big time saver. Don't block on it; proceed with your ranking if the user is AFK.
<!-- vpmodule:atom:end rank-falsifiable-hypotheses -->