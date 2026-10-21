---
instruction_id: remove-a-listing-only-for-a-stated-ground
title: Remove a listing only for a stated ground
summary: "A listing is removed only for illegal content, malware, spam or a dead link, never for staleness, quality or disagreement."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: A published listing is proposed for removal.
conditions_does_not_apply_when: The listing is still maintained and working.
artifact_contract_output_type: removal-ground
artifact_contract_required_data:
  - the one ground that is cited
  - the evidence behind it
artifact_contract_verified_by: the removal cites exactly one of the stated grounds with its evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/take-over-a-capability-or-eos.md
status: active
revision: 1
---

# Remove a listing only for a stated ground
A merged entry is removed only for illegal content, malware, spam, or a repo that is dead or completely non-functional.
It is **never** removed for staleness, quality, abandonment, or a maintainer's disagreement with its design.
Cite exactly one of the four grounds — illegal, malware, spam, or dead/non-functional link — and put the evidence in the PR body.
