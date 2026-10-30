---
instruction_id: count-distinct-voices-not-thread-length
title: "Count the distinct voices, not the thread length"
summary: "Distinguish the loud power users from the silent majority: count the distinct voices, not the length of the thread."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: The prevalence of an opinion is to be claimed from community threads.
conditions_does_not_apply_when: The claim is about the experience of one person and not about how common it is.
artifact_contract_output_type: prevalence-evidence
artifact_contract_required_data:
  - the distinct voices counted
  - the threads they came from
artifact_contract_verified_by: every prevalence claim states the number of distinct voices behind it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/user-voice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Count the distinct voices, not the thread length
distinguish loud power-users from the silent majority — count distinct voices, not thread length
