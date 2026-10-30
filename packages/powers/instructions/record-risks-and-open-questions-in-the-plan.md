---
instruction_id: record-risks-and-open-questions-in-the-plan
title: Record the risks and the open questions in the plan
summary: "The plan carries the decisions with their rationale, the risks with impact and mitigation, and the questions only a human can answer."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan document is written for work that carries design decisions and open questions.
conditions_does_not_apply_when: There is no plan document.
artifact_contract_output_type: plan-sections
artifact_contract_required_data:
  - the architecture decisions and their rationale
  - the risks with impact and mitigation
  - the open questions
artifact_contract_verified_by: the plan names each risk with its impact and mitigation and lists the open questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/planning-and-task-breakdown/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Record the risks and the open questions in the plan

The plan document holds:

```markdown
## Architecture Decisions
- [Key decision 1 and rationale]
- [Key decision 2 and rationale]

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [High/Med/Low] | [Strategy] |

## Open Questions
- [Question needing human input]
```
