---
instruction_id: keep-the-capability-ids-stable
title: Keep the capability ids stable
summary: Capability ids are never reused and never renumbered; a new capability takes the next unused id and the same slug updates in place.
capability_tags:
  - plan-implementation
pattern_tags:
  - living-specification
conditions_applies_when: A specification with numbered capabilities is updated.
conditions_does_not_apply_when: The specification has no numbered capabilities.
artifact_contract_output_type: identifier-scheme
artifact_contract_required_data:
  - the preserved ids
  - the new id
  - the retired ids
artifact_contract_verified_by: the ids of the earlier version are unchanged and no retired id was reused
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
status: active
revision: 1
---

# Keep the capability ids stable
Capability IDs are stable and unique. Never reused, never renumbered.
new capabilities get the next unused `CAP-N`; never reuse retired IDs.
A second invocation with the same
slug
lands at the existing spec folder and updates in place, preserving capability IDs.
Same slug = same folder.
