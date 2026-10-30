---
instruction_id: write-the-idea-one-pager
title: Write the idea one-pager
summary: "Produce a markdown one-pager that moves the work forward, with the fixed sections, and save it only after the user confirms."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A direction has been chosen and the session has to end with a concrete artefact.
conditions_does_not_apply_when: The direction is still being explored and no choice has been made.
artifact_contract_output_type: idea-one-pager
artifact_contract_required_data:
  - problem statement
  - recommended direction
  - key assumptions to validate
  - MVP scope
  - not doing and why
  - open questions
artifact_contract_verified_by: the one-pager holds every section and the user confirmed saving it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/examples.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Write the idea one-pager

Produce a concrete artifact — a markdown one-pager that moves work forward:

```markdown
# [Idea Name]

## Problem Statement
[One-sentence "How Might We" framing]

## Recommended Direction
[The chosen direction and why — 2-3 paragraphs max]

## Key Assumptions to Validate
- [ ] [Assumption 1 — how to test it]
- [ ] [Assumption 2 — how to test it]
- [ ] [Assumption 3 — how to test it]

## MVP Scope
[The minimum version that tests the core assumption. What's in, what's out.]

## Not Doing (and Why)
- [Thing 1] — [reason]
- [Thing 2] — [reason]
- [Thing 3] — [reason]

## Open Questions
- [Question that needs answering before building]
```

Ask the user if they'd like to save this to a document (or a location of their choosing). Only save if they confirm.

The output is actionable. The one-pager ends with things you can *do* (validate assumptions, build the MVP, try the experiment), not things to *think about*.
