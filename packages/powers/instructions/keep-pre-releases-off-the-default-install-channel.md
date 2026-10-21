---
instruction_id: keep-pre-releases-off-the-default-install-channel
title: Keep pre-releases off the default install channel
summary: "Only two distribution tags exist; a pre-release reaches a user only when the user opts in, and one version uses one pre-release type throughout its cycle."
capability_tags:
  - integrate-branch
pattern_tags:
  - release-readiness
conditions_applies_when: A pre-release is prepared or the distribution tags are defined.
conditions_does_not_apply_when: The release is a stable production release.
artifact_contract_output_type: release-tag-scheme
artifact_contract_required_data:
  - the two distribution tags and what each means
  - the pre-release type of the version
  - the rule that a pre-release is opt-in
artifact_contract_verified_by: the default install channel carries only stable releases and each version uses one pre-release type
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=VERSIONING.md
status: active
revision: 1
---

# Keep pre-releases off the default install channel
Only two tags, following Angular/Next.js convention:
| Tag | Meaning |
|-----|---------|
| `latest` | Stable production release |
| `next` | Pre-release (RC or beta) |
The version string (`-rc.1` vs `-beta.1`) communicates stability level.
Users never get pre-releases unless they explicitly opt in.
**beta** (major releases only): Feature-complete but not fully tested.
API mostly stable.
Used for major releases to signal a longer testing cycle.
**rc** (minor releases only): Production-ready candidate.
Only critical fixes expected.
Each version uses one pre-release type throughout its cycle.
