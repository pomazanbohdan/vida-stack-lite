---
instruction_id: weigh-an-empirical-claim-before-relying-on-it
title: Weigh an empirical claim before relying on it
summary: "Check the retraction and replication status of any load-bearing empirical claim, and treat a result shown by one lab only as a lead, not a fact."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A conclusion rests on an empirical result from the literature.
conditions_does_not_apply_when: The claim is a definition or a stated method rather than a result.
artifact_contract_output_type: claim-weight
artifact_contract_required_data:
  - the claim
  - its retraction and replication status
  - the labs that showed it
artifact_contract_verified_by: the status and the number of labs are stated for every load-bearing claim
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/academic-lit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Weigh an empirical claim before relying on it
check retraction and replication status on any load-bearing empirical claim
a result only ever shown by one lab is a lead, not a fact
