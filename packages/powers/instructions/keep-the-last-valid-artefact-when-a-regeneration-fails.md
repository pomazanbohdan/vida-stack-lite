---
instruction_id: keep-the-last-valid-artefact-when-a-regeneration-fails
title: Keep the last valid artefact when a regeneration fails
summary: A regeneration that fails leaves the previous valid artefact in place and stops; the broken attempt never replaces the good one.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: A regeneration of a derived artefact fails part way through.
conditions_does_not_apply_when: The regeneration succeeded.
artifact_contract_output_type: failed-regeneration-report
artifact_contract_required_data:
  - the failure that was reported
  - the artefact that was kept
artifact_contract_verified_by: the previous valid artefact is still there and the failed attempt stopped the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=commands/gsd/graphify.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=skills/gsd-graphify/SKILL.md
status: active
revision: 1
---

# Keep the last valid artefact when a regeneration fails
If the chain fails (non-zero exit):
Do NOT delete the output directory.
The prior valid graph remains available
**STOP**
