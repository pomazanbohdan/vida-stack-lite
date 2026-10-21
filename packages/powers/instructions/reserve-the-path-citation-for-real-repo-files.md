---
instruction_id: reserve-the-path-citation-for-real-repo-files
title: Reserve the path citation for real repo files
summary: "The reviewed artifact carries its own path as the anchor for a finding about itself, while the path-and-line form stays reserved for the real repository files the artifact refers to."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A finding cites a place in the reviewed artifact and in the files it refers to.
conditions_does_not_apply_when: Only one of the two is cited.
artifact_contract_output_type: citation-anchor
artifact_contract_required_data:
  - the anchor for the artifact
  - the citation for the repository file
artifact_contract_verified_by: the artifact citation and the repository citation use different forms
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
status: active
revision: 1
---

# Reserve the path citation for real repo files
The path header is the citable anchor for findings about the plan itself
reserve `path:line` for repo files the plan references
