---
instruction_id: do-not-hijack-a-live-entry
title: Do not hijack a live entry
summary: "Repointing a live entry at a fork and reclaiming a listed identifier are hijacks, not takeovers."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - decision-trail
conditions_applies_when: A takeover of an existing entry is proposed.
conditions_does_not_apply_when: The entry is dead or the current owner agreed to the handoff.
artifact_contract_output_type: takeover-legality
artifact_contract_required_data:
  - the entry
  - the grounds on which the takeover happens
artifact_contract_verified_by: the takeover names a consensual handoff and the live entry is untouched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/take-over-a-capability-or-eos.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body protects an active repository entry and identifier from takeover, but the entry subject is unspecified; repository ownership mechanics alone do not support a listed content domain."
---

# Do not hijack a live entry
Repoint `repo` at a fork while the original is alive and maintained. That is an entry hijack, not a takeover.
Reclaim an `id` that is still listed.
Remove a working entry in order to make room for a replacement.
