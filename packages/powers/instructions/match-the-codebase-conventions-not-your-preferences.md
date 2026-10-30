---
instruction_id: match-the-codebase-conventions-not-your-preferences
title: "Match the codebase conventions, not your preferences"
summary: "Simplification means making the code more consistent with the codebase, never with an external house style."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A simplification is about to be written and the project has its own conventions.
conditions_does_not_apply_when: The project has no conventions to match.
artifact_contract_output_type: convention-match
artifact_contract_required_data:
  - the conventions read
  - the neighbouring example studied
  - the style points matched
artifact_contract_verified_by: "the result reads like the neighbouring code rather than like the reviewer's own style"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/start-in-an-existing-codebase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Match the codebase conventions, not your preferences

Simplification means making code more consistent with the codebase, not imposing external preferences. Before simplifying:

```
1. Read the project conventions
2. Study how neighboring code handles similar patterns
3. Match the project's style for:
   - Import ordering and module system
   - Function declaration style
   - Naming conventions
   - Error handling patterns
   - Type annotation depth
```

Simplification that breaks project consistency is not simplification — it's churn.

Renaming things to match your preferences rather than project conventions
You do not inventory conventions beforehand.
The implementer investigates the repository, writes down what to reuse and what not to change, and follows that.
If you want this change to break a pattern, say so in the request, and write why in the spec so later sessions follow the new rule.
If you dislike a pattern but have no plan to change it, say nothing — it will match the code.
Hoping it modernizes on its own continues the pattern.
Changing one file and leaving the rest leaves two standards with no record of which one wins.
