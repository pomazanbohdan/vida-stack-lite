---
instruction_id: classify-a-non-reproducible-failure
title: Classify a non-reproducible failure
summary: "When the failure will not reproduce on demand, sort it by timing, environment, state or randomness, and act on that class."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A failure cannot be reproduced on demand.
conditions_does_not_apply_when: The failure reproduces reliably and the loop is red.
artifact_contract_output_type: non-reproducible-report
artifact_contract_required_data:
  - the class of the failure
  - the observations for that class
  - the conditions documented
  - the monitoring that was set up
artifact_contract_verified_by: the failure is placed in one class and the matching observations were carried out
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/debugging-and-error-recovery/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Classify a non-reproducible failure

Make the failure happen reliably. If you can't reproduce it, you can't fix it with confidence.

```
Cannot reproduce on demand:
├── Timing-dependent?
│   ├── Add timestamps to logs around the suspected area
│   ├── Try with artificial delays (setTimeout, sleep) to widen race windows
│   └── Run under load or concurrency to increase collision probability
├── Environment-dependent?
│   ├── Compare Node/browser versions, OS, environment variables
│   ├── Check for differences in data (empty vs populated database)
│   └── Try reproducing in CI where the environment is clean
├── State-dependent?
│   ├── Check for leaked state between tests or requests
│   ├── Look for global variables, singletons, or shared caches
│   └── Run the failing scenario in isolation vs after other operations
└── Truly random?
    ├── Add defensive logging at the suspected location
    ├── Set up an alert for the specific error signature
    └── Document the conditions observed and revisit when it recurs
```

If truly non-reproducible, document conditions and monitor

Flaky tests mask real bugs. Fix the flakiness or understand why it's intermittent.
