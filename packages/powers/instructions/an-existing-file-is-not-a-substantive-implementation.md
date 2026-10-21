---
instruction_id: an-existing-file-is-not-a-substantive-implementation
title: An existing file is not a substantive implementation
summary: "Existence and substance are two different verdicts, and a file that returns a placeholder is a stub."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: An artifact required by the plan is checked.
conditions_does_not_apply_when: The artifact was already verified as substantive.
artifact_contract_output_type: artifact-verdict
artifact_contract_required_data:
  - the artifact
  - the verdict
  - the evidence behind it
artifact_contract_verified_by: the verdict distinguishes existence from substance and names the evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/verification-report.md
status: active
revision: 1
---

# An existing file is not a substantive implementation
For EXISTS: "File at path, exports X"
For SUBSTANTIVE: "N lines, has patterns X, Y, Z"
File exists but POST returns placeholder
