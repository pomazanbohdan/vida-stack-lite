---
instruction_id: group-findings-by-shared-root-cause
title: Group findings by shared root cause
summary: Two findings are one entry only when the same defect produced both; the same location or the same fix is not enough.
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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 1
---

# Group findings by shared root cause
Group the survivors by shared root cause — two findings belong in one entry only when the same defect produced both.
Same location alone is not a shared root cause, and neither is a shared fix.
An entry carries every member's verified bad outcome
All remaining findings continue to grouping.
Group the survivors by shared root cause -- two findings belong in one entry only when the same defect produced both.
An entry carries every member's verified bad outcome in `detail` and the highest verdict among them
Order: Critical, Important, Minor.
`maybe-false` ranks lowest.
Set `source` to the contributing layers joined with `+` (e.g., `blind-hunter+edge-case-hunter`).
