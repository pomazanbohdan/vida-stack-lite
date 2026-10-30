---
instruction_id: guard-destructive-operations-on-derived-paths
title: Guard destructive operations on derived paths
summary: "Resolve the target and prove that it sits under an allowlisted root, below it, and carries ownership evidence that was read before the operation."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "A delete, a move or an overwrite names its target from a value the program did not author."
conditions_does_not_apply_when: The target is a fixed literal in the code.
artifact_contract_output_type: path-guard
artifact_contract_required_data:
  - the resolved target
  - the allowlisted root
  - the ownership evidence
artifact_contract_verified_by: the three checks run before the operation and a refusal logs the rejected target and stops
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Guard destructive operations on derived paths

A delete, move, or overwrite is only as safe as the value naming its target, and trust follows who *wrote* that value, not which channel delivered it: another process's command line is as attacker-controlled as a form field.
A shape check proves well-formedness, not authorization.
Before the call, require all three: the resolved target (symlinks resolved) sits under an **allowlisted root**; it is at least one level **below** that root; and it carries **ownership evidence read before the operation**.
On refusal, log the rejected target and stop; never fall back to a broader default path.

Two limits, because the check reads stronger than it is. A marker inside the tree is self-attestation — anything that can write there can write the marker — so the expected owner has to come from authenticated state, and the marker needs integrity protection (restrictive ownership, or a MAC) before it counts as authorization. And resolving a path and then operating on the *name* is a check/use race wherever an untrusted process can swap an ancestor: on a shared volume, hold the target by descriptor and use no-follow, beneath-the-root operations, or make sure the hierarchy cannot change for the duration.
