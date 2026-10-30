---
instruction_id: a-duplicate-identifier-stops-the-run-before-any-dispatch
title: A duplicate identifier stops the run before any dispatch
summary: "Two live units claiming the same identifier is a hard stop before anything is dispatched: the collisions are reported verbatim and the only way forward is renumbering or dropping the superseded claimant."
capability_tags:
  - check-for-name-collisions
pattern_tags:
  - stable-identity
conditions_applies_when: Two live units in the same effort claim the same identifier.
conditions_does_not_apply_when: Every identifier is claimed by one unit only.
artifact_contract_output_type: identifier-collision-report
artifact_contract_required_data:
  - the colliding identifiers
  - the units that claim them
  - the forward paths
artifact_contract_verified_by: every collision was listed with its claimants and nothing was dispatched or written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/threat-id-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# A duplicate identifier stops the run before any dispatch
This is a hard stop BEFORE any dispatch — do not spawn executors, do not update state, do not write artifacts.
A reused ID names two different threats, so `SECURITY.md` rows and `VALIDATION.md`'s Threat Ref column are ambiguous until it is fixed; executing the phase would silently mark the wrong threat.
Report the full `threat_id_duplicates` list verbatim — each ID with its claiming plan files:
Do not offer to execute anyway. The only forward paths are renumbering the colliding registers
superseded plans never hold IDs against their replacements
