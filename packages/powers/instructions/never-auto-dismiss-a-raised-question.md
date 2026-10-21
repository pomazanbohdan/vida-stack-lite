---
instruction_id: never-auto-dismiss-a-raised-question
title: Never auto-dismiss a raised question
summary: "Under automation a raised edge or prohibition is never dismissed; it is covered, backed by a held-out check, or carried forward as an assumption."
capability_tags:
  - clarify-requirements
pattern_tags:
  - human-in-the-loop
conditions_applies_when: An automated pass raises a question about a requirement.
conditions_does_not_apply_when: A person decides the question.
artifact_contract_output_type: raised-question-resolution
artifact_contract_required_data:
  - the question that was raised
  - the state it was left in
  - the reason a dismissal was refused
artifact_contract_verified_by: no question was dismissed automatically and every deferred question is carried as an assumption
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/spec-phase-edge-completeness-probe.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/spec-phase-prohibition-probe.md
status: active
revision: 1
---

# Never auto-dismiss a raised question
Under `--auto`, the probe **never auto-dismisses** — it auto-covers where a defensible criterion exists, otherwise auto-backstops
The one exception is an `unclassified` candidate: `--auto` leaves it **`unresolved`** (surfaced as a flagged assumption), never auto-`backstop` — a missing shape is not evidence an edge exists, so minting a held-out edge obligation would be a false claim.
Unresolved *applicable* edges trigger a soft gate (Resolve / Write-anyway-flagged / Keep-probing) rather than a hard block.
Each surfaced prohibition is resolved to exactly one of three states:
**Recall (adversarial probe):** *"What could this feature silently become that the author would NOT want, but the spec does not forbid?"* — model-robust open-vocabulary elicitation across values/safety/ethics.
