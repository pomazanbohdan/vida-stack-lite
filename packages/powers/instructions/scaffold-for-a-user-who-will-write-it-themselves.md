---
instruction_id: scaffold-for-a-user-who-will-write-it-themselves
title: Scaffold for a user who will write it themselves
summary: "When the user writes the tool, the scaffold holds the placeholders that keep the checks red and the five lines that tell them what to fill in."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The user will write the body of the tool themselves.
conditions_does_not_apply_when: The agent writes the body.
artifact_contract_output_type: scaffold
artifact_contract_required_data:
  - the valid folder with its frontmatter
  - the placeholders left visible
  - the five lines of guidance
artifact_contract_verified_by: the placeholder for the description is still in place and the checks still fail until the user fills it in
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/approaches/scaffold.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Scaffold for a user who will write it themselves
For a skill the user will write themselves.
When no description was approved,
- leave the description off
- the scaffold carries a `[TODO:` marker that the checks flag until they write one
Say, in about five lines in chat: that the description is the whole trigger and where it lives; where the know-how goes; what each extra folder is for; that references stand alone, one level deep; and the canon's core test, so they cut what a capable model would do unasked.
the checks stay red until they finish, and the trigger eval waits for a real description.
