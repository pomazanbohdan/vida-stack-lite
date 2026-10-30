---
instruction_id: keep-the-spec-current
title: Keep the spec current
summary: "Update the spec when a decision or the scope changes, commit it with the code, and link each change request back to the spec section it implements."
capability_tags:
  - plan-implementation
pattern_tags:
  - living-specification
conditions_applies_when: A decision or the scope of a specified change changes after the spec was written.
conditions_does_not_apply_when: The spec has not been written yet.
artifact_contract_output_type: updated-specification
artifact_contract_required_data:
  - the changed decision or scope
  - the updated spec section
  - the spec reference in the change
artifact_contract_verified_by: the spec was updated before the code followed the change and the change links back to it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/spec-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Keep the spec current

## Keeping the Spec Alive

The spec is a living document, not a one-time artifact:

- **Update when decisions change** — If you discover the data model needs to change, update the spec first, then implement.
- **Update when scope changes** — Features added or cut should be reflected in the spec.
- **Commit the spec** — The spec belongs in version control alongside the code.
- **Reference the spec in PRs** — Link back to the spec section that each PR implements.

## Common Rationalizations

"I'll write the spec after I code it"
That's documentation, not specification. The spec's value is in forcing clarity *before* code.

"Requirements will change anyway"
That's why the spec is a living document. An outdated spec is still better than no spec.

When a change overrides something that came from a source input, offer to update that source too, so upstream and the spec don't silently diverge.
