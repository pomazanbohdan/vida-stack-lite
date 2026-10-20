---
instruction_id: contain-destructive-path-operations
title: Contain destructive path operations
summary: "A path named by data is resolved first, checked against an allowlisted root with a minimum depth and proven ownership, and the check is not left open to a race."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work deletes, moves or overwrites a path that data can name."
conditions_does_not_apply_when: The path is fixed in the code and not derived from data.
artifact_contract_output_type: path-containment-review
artifact_contract_required_data:
  - the allowed roots
  - the minimum depth
  - where the ownership evidence comes from
  - how the check/use race is closed
artifact_contract_verified_by: the resolved path is inside an allowlisted root and the ownership proof comes from authenticated state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Contain destructive path operations
Destructive path operations (delete/move/overwrite): symlinks resolved, allowlisted root, minimum depth, ownership evidence read before the call
Containment for a target named by data. Resolve first, then decide — and treat the result as a candidate, not as authorization
**The marker is self-attestation.** Anything that can write inside the root can write `.owner`. `expectedOwner` has to come from authenticated state, and the marker needs integrity protection (restrictive ownership, or a MAC) before it is authorization rather than a consistency check against a misderived target.
**Returning a path leaves a check/use race.** Where an untrusted process can swap an ancestor between the check and the call, operate on a descriptor with no-follow, beneath-the-root semantics, or guarantee the hierarchy is immutable for the duration.
