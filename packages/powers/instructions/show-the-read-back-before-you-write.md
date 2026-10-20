---
instruction_id: show-the-read-back-before-you-write
title: Show the read-back before you write
summary: "Before anything is written, show the read-back - name, description, shape, registration, approach, location, files - and write nothing until the user approves it; every line can still be changed."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - approval-policy-gate
conditions_applies_when: "A skill, an agent or a module is about to be written to disk."
conditions_does_not_apply_when: The change is a small edit the user has already asked for.
artifact_contract_output_type: read-back
artifact_contract_required_data:
  - name
  - description
  - shape
  - registration
  - approach
  - location
  - files
artifact_contract_verified_by: nothing is written before the user approves and every line can still be changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/help.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/how-to-personal-skill.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/registration.md
status: active
revision: 1
---

# Show the read-back before you write
Shows a read-back (name, description, shape, registration, approach, location, files) and writes nothing until the user approves it
every line can be changed
Change any line; nothing is written before you say yes.
guesses the answer from what is installed and puts it in the read-back as its own line, so the user always sees and can change it.
The guess is one line in the read-back with its consequence; the user confirms or changes it.
