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
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/diagnosing-bugs/SKILL.md
status: active
revision: 1
---

# Instrument one variable at a time
Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**
Tool preference:
1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".
**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep. Untagged logs survive; tagged logs die.
**Perf branch.** For performance regressions, logs are usually wrong. Instead: establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.
