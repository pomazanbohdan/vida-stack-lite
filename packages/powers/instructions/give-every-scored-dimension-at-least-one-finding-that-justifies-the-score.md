---
instruction_id: give-every-scored-dimension-at-least-one-finding-that-justifies-the-score
title: Give every scored dimension at least one finding that justifies the score
summary: A score with no finding behind it is an impression; each scored dimension names the defect that produced it.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review scores several dimensions of the same artefact.
conditions_does_not_apply_when: The review reports findings without a score.
artifact_contract_output_type: scored-review
artifact_contract_required_data:
  - the score per dimension
  - the finding that justifies each score
artifact_contract_verified_by: every dimension carries at least one finding and no score stands without one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-auditor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give every scored dimension at least one finding that justifies the score
Every scored pillar must have at least one specific finding justifying the score.
**Proportional:** More detail on low-scoring pillars, brief on passing ones
