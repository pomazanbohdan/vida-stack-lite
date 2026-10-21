---
instruction_id: name-the-stub-signatures-that-mark-a-placeholder
title: Name the stub signatures that mark a placeholder
summary: The four families of placeholder signature are recognised whatever the file type is.
capability_tags:
  - review-code
pattern_tags:
  - code-audit
conditions_applies_when: An artefact is checked for substance.
conditions_does_not_apply_when: The artefact is known to be a placeholder.
artifact_contract_output_type: stub-signatures
artifact_contract_required_data:
  - the signature families
artifact_contract_verified_by: the placeholder signature families were looked for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verification-patterns.md
status: active
revision: 1
---

# Name the stub signatures that mark a placeholder
These patterns indicate placeholder code regardless of file type
Comment-based stubs
Placeholder text in output
Empty or trivial implementations
Hardcoded values where dynamic expected
