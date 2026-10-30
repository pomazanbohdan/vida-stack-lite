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
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/diagnosing-bugs/SKILL.md
status: active
revision: 2
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
