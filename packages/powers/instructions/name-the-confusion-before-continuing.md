---
instruction_id: name-the-confusion-before-continuing
title: Name the confusion before continuing
summary: "When the request, the instructions and the code disagree, stop, name the specific contradiction, present the tradeoff and wait for the resolution."
capability_tags:
  - clarify-requirements
pattern_tags:
  - stop-on-conflict
conditions_applies_when: Two sources that both govern the work contradict each other.
conditions_does_not_apply_when: "The ambiguity is routine and reversible; choose the safest interpretation, record it and continue."
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the contradiction
  - the two sources
  - the options
  - the question
artifact_contract_verified_by: the conflict is named in specific terms and resolved before the work continues
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/using-agent-skills/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Name the confusion before continuing

## Manage Confusion Actively

When you encounter inconsistencies, conflicting requirements, or unclear specifications:

1. **STOP.** Do not proceed with a guess.
2. Name the specific confusion.
3. Present the tradeoff or ask the clarifying question.
4. Wait for resolution before continuing.

**Bad:** Silently picking one interpretation and hoping it's right.

**Good:** "I see X in the spec but Y in the existing code. Which takes precedence?"
