---
instruction_id: request-independent-review
title: Request an independent review
summary: "Dispatch a reviewer with a crafted brief, the git range, and the requirements, then fix Critical findings at once and Important ones before proceeding."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A significant change is complete, or the work is being prepared for integration."
conditions_does_not_apply_when: The change has no code or claims that can be verified independently.
artifact_contract_output_type: review-request
artifact_contract_required_data:
  - change purpose
  - requirements
  - review range
  - comparison base
artifact_contract_verified_by: an independent review report is on record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/requesting-code-review/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Request an independent review
Review early, review often.
Dispatch a code reviewer subagent to catch issues before they cascade.
The reviewer gets precisely crafted context for evaluation — never your session's history.
Review is mandatory after each task in subagent-driven development, after completing a major feature, and before merge to main.
It is optional but valuable when stuck, before refactoring, and after fixing a complex bug.
Get the git SHAs for the base and head of the range.
Dispatch a general-purpose subagent, filling the reviewer template.
Give it a brief summary of what you built, what it should do, the starting commit, and the ending commit.
This keeps the reviewer on the work product, not your thought process.
Act on feedback: fix Critical issues immediately, fix Important issues before proceeding, and note Minor issues for later.
Push back if the reviewer is wrong, with reasoning.
Never skip review because "it's simple".
Never ignore Critical issues.
Never proceed with unfixed Important issues.
Never argue with valid technical feedback.
Do not review the diff inline instead of dispatching a reviewer; that burns the context window you need to keep driving the work.
