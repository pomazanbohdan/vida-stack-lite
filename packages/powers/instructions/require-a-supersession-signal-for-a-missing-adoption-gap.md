---
instruction_id: require-a-supersession-signal-for-a-missing-adoption-gap
title: Require a supersession signal for a missing-adoption gap
summary: A place that still handles a case the old way is only a gap when the change clearly replaces the old behaviour and the site shares the same observable contract.
capability_tags:
  - review-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A site that still handles a case its own way is proposed as a finding.
conditions_does_not_apply_when: The site already uses the new behaviour.
artifact_contract_output_type: adoption-qualification
artifact_contract_required_data:
  - the site
  - the supersession signal
  - the shared observable contract
artifact_contract_verified_by: the finding names the supersession signal and the shared contract
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/review-prompts/verification-gap.md
status: active
revision: 1
---

# Require a supersession signal for a missing-adoption gap
A `Missing-adoption gap` qualifies not by the adoption failure alone but by a supersession signal: the change gives clear evidence the new behavior is meant to replace the local one — PR intent, naming or docs, a replaced sibling site, deleted duplicate logic, or a test defining the new rule — and the local site shares the same observable contract.
Without a supersession signal and a shared observable contract, it is a refactor suggestion, not a verification-gap finding.
