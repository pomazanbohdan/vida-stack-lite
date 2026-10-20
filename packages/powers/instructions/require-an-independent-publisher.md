---
instruction_id: require-an-independent-publisher
title: Require an independent publisher
summary: "A second source only counts as a check when it comes from a different publisher with different underlying data, not from a republication of the first."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A claim is about to be checked against a second source.
conditions_does_not_apply_when: Only one source exists for the claim.
artifact_contract_output_type: independent-source-check
artifact_contract_required_data:
  - the second source
  - the publisher it comes from
  - why it is independent
artifact_contract_verified_by: the second source comes from a different publisher with different underlying data
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/verification.md
status: active
revision: 1
---

# Require an independent publisher
**Independent** means a different publisher with different underlying data or reporting — not a syndication, quote, or republication of the first source, and not the same vendor’s marketing in two places.
An imported report counts as one publisher regardless of how many sources it cites internally; two imports from different tools agreeing is genuine confirmation, and their disagreement is a finding.
