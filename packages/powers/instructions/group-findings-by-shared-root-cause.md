---
instruction_id: group-findings-by-shared-root-cause
title: Group findings by shared root cause
summary: "Normalize raw findings as R ids, then group the survivors into F findings only when the same root cause produced both; the same location or the same fix is not enough."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Several findings survived verification and have to be grouped.
conditions_does_not_apply_when: Only one finding survived.
artifact_contract_output_type: finding-groups
artifact_contract_required_data:
  - the groups
  - the verified bad outcome of each group
  - the members of each group
artifact_contract_verified_by: no group holds two findings with different root causes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Group findings by shared root cause
Normalize every reported finding first, without deduplicating: give each a raw `R<n>` id, its source lens, title, detail and location, and write it to `{triage_file}`.
Group the findings that survived rejection by shared root cause — two raw findings belong in one entry only when the same root cause produced both.
Same location alone is not a shared root cause, and neither is a shared fix; there can be multiple defects on the same line.
An entry carries every member's verified bad outcome in `detail`, the highest verdict among them (Critical > Important > Minor > `maybe-false`), `source` set to the contributing lenses joined with `+` (e.g., `blind-hunter+edge-case-hunter`), and the raw `R` ids it is built from.
Order the groups highest verdict first and give each a finding id `F<n>`; a group of one is identical to its raw finding except for the id.
Append every `F` finding to `{triage_file}`.
