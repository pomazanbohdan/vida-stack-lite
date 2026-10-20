---
instruction_id: judge-a-structure-by-running-the-smallest-version
title: Judge a structure by running the smallest version
summary: "A structure cannot be judged from inside one run, so the smallest version is written and both are run on the same input."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
  - code-minimization
conditions_applies_when: A piece of writing is elaborate and its worth is in question.
conditions_does_not_apply_when: The writing is already the smallest version.
artifact_contract_output_type: structure-comparison
artifact_contract_required_data:
  - the smallest version
  - the input both were run on
  - what the comparison showed
artifact_contract_verified_by: both versions were run on the same input and the result decided whether the structure stays
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
status: active
revision: 1
---

# Judge a structure by running the smallest version
You cannot judge structure from inside one run. Write the smallest version, around five lines: role, outcome, consumer, and any rule whose absence has done damage. Run both on the same input.
| What you see | What it means |
| --- | --- |
| Small one wins | The structure was a straitjacket. Cut it. |
| They tie | The structure is decoration. Defend each line or kill it. |
| Small one rougher but recoverable in a turn or two | You bought convenience, not quality. Allowed, if you are honest about it. |
| Small one materially worse and stays worse | The structure earned its keep, for now. |
Cheaper signals: one input five times (identical means over-determined, scattered means under-specified); different inputs (alike outputs mean the template out-shouts the input); steps marched in order.
Below your small version sits the bare model, and it rises with every release. What survives is what the model cannot do for itself: paths, downstream contracts, wiring between systems, knowledge that lives nowhere else. When a capability stops beating the bare model, retire it.
