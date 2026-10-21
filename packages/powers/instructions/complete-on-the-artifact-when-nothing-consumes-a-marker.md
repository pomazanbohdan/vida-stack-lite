---
instruction_id: complete-on-the-artifact-when-nothing-consumes-a-marker
title: Complete on the artifact when nothing consumes a marker
summary: "When no downstream step reads a completion marker, the artifacts on disk are the completion contract."
capability_tags:
  - execute-plan
pattern_tags:
  - completion-criteria
conditions_applies_when: A step produces artifacts that a later step detects by their presence.
conditions_does_not_apply_when: A later step parses a completion marker in the returned text.
artifact_contract_output_type: artifact-completion
artifact_contract_required_data:
  - the artifacts on disk
  - the flag that marks them
artifact_contract_verified_by: "the completion was detected from the files, not from a returned string"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-guidance.md
status: active
revision: 1
---

# Complete on the artifact when nothing consumes a marker
Gap-closure completion has **no completion marker**: nothing consumes one. The return contract is the artifacts themselves — `verify-work.md` spawns you in `--gaps` mode, and your output is complete when the fix plans are on disk carrying `gap_closure: true` in their frontmatter; the spawning workflow detects the files (never a return string)
