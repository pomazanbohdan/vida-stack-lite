---
instruction_id: write-back-the-statement-of-intent
title: Write back the statement of intent
summary: "Restate what you now think the user wants in their own words and a fixed set of lines, so it can be confirmed or corrected line by line."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: Your confidence in the intent is high enough to write it down.
conditions_does_not_apply_when: "The intent is still unresolved, or the ask was unambiguous and self-contained."
artifact_contract_output_type: statement-of-intent
artifact_contract_required_data:
  - outcome
  - user
  - why now
  - success
  - constraint
  - out of scope
artifact_contract_verified_by: "the user can confirm or correct each line, the out-of-scope line is present, and the intent is saved only after the user confirms"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/interview-me/SKILL.md
status: active
revision: 1
---

# Write back the statement of intent

When your confidence is high, write back what you now think the user wants. Keep it tight (5–8 lines), use their language where possible, and structure it so the user can confirm or correct line by line:

```
Here's what I now think you want:

- Outcome:      <one line>
- User:         <one line — who benefits>
- Why now:      <one line — what changed>
- Success:      <one line — how we know it worked>
- Constraint:   <one line — the binding limit>
- Out of scope: <one line — what we're explicitly not doing>

Yes / no / refine?
```

Including "Out of scope" is non-negotiable. Half of misalignment is silent disagreement about what is *not* being built.

The output of this work is a **confirmed statement of intent**: the restate, with an explicit yes. Specs, plans, and task lists are downstream; they consume the intent this produces.

If the user wants the intent to persist (a multi-session project, a handoff to another collaborator), offer to save it to a document.
