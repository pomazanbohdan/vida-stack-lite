---
instruction_id: clarify-before-design
title: "Check the brief through the builder's eyes"
summary: "Have a fresh builder read the design and report only questions where a wrong guess would change the plan, then sort the answers into the document, your calls, and the owner's decisions."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The brief or design document is ready to hand to a builder.
conditions_does_not_apply_when: "There is no brief yet, or it has already been checked and approved."
artifact_contract_output_type: design-brief
artifact_contract_required_data:
  - brief
  - builder questions
  - question groups
  - revised brief
artifact_contract_verified_by: every important builder question is answered in the brief
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/brainstorming/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/brainstorming/builder-check-prompt.md
status: active
revision: 4
---

# Check the brief through the builder's eyes
Dispatch a fresh builder with the design document and its domain.
The builder has been handed a design document and asked to put together a plan to build what it describes.
The builder will not be able to talk to the person who wrote it.
Report only the questions the builder would still need answered before planning this well.
Report places where the builder would have to guess and a wrong guess would matter.
For each, give the question and why the answer changes the plan.
Rank them by importance.
Skip anything the document explicitly leaves to the builder.
Skip anything the builder could reasonably decide.
Skip nitpicks about wording.
If nothing important is left, say "nothing important left".
Sort what the builder asks into three piles: answered already, minor, and theirs.
Answered already by the conversation or the project: put the answer in the document.
Minor: settle it yourself and mark it in the document as your call.
Theirs: only your human partner can answer it, and the answer changes what gets built.
Bring the "theirs" pile in one message, most important first.
That's the only round of questions the check produces.
