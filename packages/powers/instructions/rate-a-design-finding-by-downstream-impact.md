---
instruction_id: rate-a-design-finding-by-downstream-impact
title: Rate a design finding by downstream impact
summary: "The severity of a finding is the downstream impact of leaving it, not the effort of fixing it; every finding carries Critical, Important or Minor, its location and its fix."
capability_tags:
  - review-code
pattern_tags:
  - impact-based-severity
conditions_applies_when: A design finding is being rated.
conditions_does_not_apply_when: The finding is a preference with no downstream effect.
artifact_contract_output_type: severity-rating
artifact_contract_required_data:
  - the severity
  - the location
  - the fix
artifact_contract_verified_by: "the severity follows the impact of leaving the finding, not the difficulty of the fix"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/validate.md
status: active
revision: 1
---

# Rate a design finding by downstream impact
Severity = downstream impact, not fix difficulty.
Severity: Critical, Important, Minor.
[Finding] (location). *Fix:* [suggestion].
