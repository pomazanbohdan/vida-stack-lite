---
instruction_id: confine-the-path-before-you-touch-the-filesystem
title: Confine the path before you touch the filesystem
summary: "A path that comes from outside is resolved and checked against the declared root before any filesystem access; the caller decides how to degrade on a rejection, never whether the path is contained."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "A path from an outside source is about to be opened, written or deleted."
conditions_does_not_apply_when: The path was produced inside the declared root by the program itself.
artifact_contract_output_type: path-containment
artifact_contract_required_data:
  - the declared root
  - the candidate path
  - the decision the caller may not make
artifact_contract_verified_by: the path was resolved inside the declared root before any filesystem access
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/security-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Confine the path before you touch the filesystem
- Path containment: user-supplied file paths and directories are validated to resolve within a declared root before any filesystem access.
- an absolute path resolving outside the root is rejected exactly as a traversal is.
