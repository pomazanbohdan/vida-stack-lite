---
instruction_id: annotate-every-suppression-with-a-reviewable-grammar
title: Annotate every suppression with a reviewable grammar
summary: "A suppression of a scan is allowed only with the project's own annotation and a reason; an unannotated suppression fails the build."
capability_tags:
  - harden-validation
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A scan reports a finding that is intended to be suppressed.
conditions_does_not_apply_when: The scan reports nothing that needs suppressing.
artifact_contract_output_type: annotated-suppression
artifact_contract_required_data:
  - the annotation grammar
  - the reason the exclusion carries
  - what an unannotated suppression does
artifact_contract_verified_by: every suppression carries the annotation and an unannotated one fails the build
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/security/baseline.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Annotate every suppression with a reviewable grammar
- Intentional test fixtures and false positives must be annotated with the project-standard exclusion grammar; un-annotated suppressions are not permitted.
- All exclusions must use the annotation grammar defined in the implementing PRs
