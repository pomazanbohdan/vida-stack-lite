---
instruction_id: merge-against-a-verified-baseline-and-escalate-a-two-sided-change
title: Merge against a verified baseline and escalate a two-sided change
summary: "A local change is merged with the version that replaced it against a baseline whose identity is verified; what the local side changed and what the other side changed are separated, and a section changed on both sides is shown to the owner."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A local modification has to be carried over to a version that replaced the file.
conditions_does_not_apply_when: The file was not modified locally.
artifact_contract_output_type: three-way-merge
artifact_contract_required_data:
  - the baseline
  - the local changes
  - the incoming changes
  - the conflicts shown to the owner
artifact_contract_verified_by: the baseline is the verified original and every two-sided section was shown to the owner
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/reapply-patches.md
status: active
revision: 1
---

# Merge against a verified baseline and escalate a two-sided change
The quality of the merge depends on having a **pristine baseline** — the original unmodified version of each file
returns the commit that *first added* the file, which is the wrong baseline
matching against it finds the correct baseline regardless of how many updates have occurred
**User changes** = diff(pristine → user's version) — these are the customizations to preserve
**Upstream changes** = diff(pristine → new version) — these are version updates to accept
Sections changed by both → flag as CONFLICT, show both, ask user
