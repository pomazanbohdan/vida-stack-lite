---
instruction_id: write-design-document
title: Write a design another builder can plan from
summary: "Write a plain design that covers intent, goals, approaches, constraints, decided choices, and what remains to the builder; use the short form for a small change and check the full form from the builder's seat."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The work has project scale and needs a written description before a plan.
conditions_does_not_apply_when: It is a quick task or a small change that can be described in chat.
artifact_contract_output_type: design-document
artifact_contract_required_data:
  - intent
  - goals and non-goals
  - approaches and owner choice
  - constraints
  - owner decisions
  - builder boundary
artifact_contract_verified_by: builder review finds no blocking question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/adoption-guide.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
---

# Write a design another builder can plan from
For a project, write a plain document a talented builder in the domain could plan from without going back to your human partner.
For a small change, the short design covers the same points in a line or two each and goes straight to the owner, without the builder check.
Cover intent and the why.
Cover goals, non-goals, and anti-goals.
Cover constraints.
Cover approaches: the two or three ways you considered, what each trades off, which one they picked, and why.
Cover the parts of the how they decided, as they decided them.
Cover what's left to the builder.
In a software repo, the design goes in the project's specs directory with a dated topic name.
Commit it.
Otherwise, ask where it goes.
Your human partner's preferences override both.
Any choice you make goes in the design as your call, never as something they agreed to.
For a project, do not hand over the document until the builder check is back.
Without a subagent tool, read the document as that builder yourself.
Update the document with their answers.
Hand it over with a short list of the calls you made so they can check those while reading.
The spec's boundaries section is where you declare what legacy surface the feature may and may not touch.
