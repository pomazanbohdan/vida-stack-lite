---
instruction_id: put-an-expiry-on-research
title: Put an expiry on the research
summary: The research carries the date it was done and the date it stops being usable.
capability_tags:
  - research-primary-sources
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A research document is written.
conditions_does_not_apply_when: The findings are about a fixed artefact that does not change.
artifact_contract_output_type: research-validity-window
artifact_contract_required_data:
  - the research date
  - the date the findings expire
artifact_contract_verified_by: the document names the research date and the date the findings stop being usable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Put an expiry on the research
**Research date:** [date]
**Valid until:** [estimate - 30 days for stable tech, 7 days for fast-moving]
