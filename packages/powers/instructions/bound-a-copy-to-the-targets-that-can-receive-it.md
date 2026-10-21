---
instruction_id: bound-a-copy-to-the-targets-that-can-receive-it
title: Bound a copy to the targets that can receive it
summary: "A copy is refused when the target cannot receive the source verbatim, and even then it touches only the entries it owns."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: Files are copied from one place to another and the two places are not interchangeable.
conditions_does_not_apply_when: The source and the target are known to be interchangeable.
artifact_contract_output_type: copy-boundary
artifact_contract_required_data:
  - the source
  - the target
  - the refusal and the route that replaces it
artifact_contract_verified_by: the copy was refused or it touched only the entries it owns
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sync-skills.md
status: active
revision: 1
---

# Bound a copy to the targets that can receive it
Skill content and directory layout are runtime-specific.
A verbatim copy from one runtime's skills root therefore produces content the installer would never have written for the destination, and can damage a runtime the user never named.
Refuse cross-runtime and point the user at the installer — the only path that produces correctly converted skills.
**No cross-runtime content transformation.** Sync copies files verbatim. It does not apply runtime-specific content transformations (those happen at install time).
Only the owned entries are created, updated, or removed, and every other entry in the destination is left untouched.
