---
instruction_id: review-on-fixed-dimensions
title: Review the change on fixed dimensions
summary: "Judge every change on the same five dimensions - correctness, readability, architecture, security and performance - with a fixed question for each."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A change is up for review and no rubric for it has been fixed yet.
conditions_does_not_apply_when: "The review is scoped to one dimension only, or the questions for it are already fixed elsewhere."
artifact_contract_output_type: dimension-review
artifact_contract_required_data:
  - the five dimensions
  - per-dimension findings
  - the questions answered per dimension
artifact_contract_verified_by: the report answers the questions of every dimension under its own heading
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/code-reviewer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Review the change on fixed dimensions
Evaluate every change across these five dimensions:

## Correctness
- Does the code do what the spec/task says it should?
- Are edge cases handled (null, empty, boundary values, error paths)?
- Do the tests actually verify the behavior? Are they testing the right things?
- Are there race conditions, off-by-one errors, or state inconsistencies?

## Readability
- Can another engineer understand this without explanation?
- Are names descriptive and consistent with project conventions?
- Is the control flow straightforward (no deeply nested logic)?
- Is the code well-organized (related code grouped, clear boundaries)?

## Architecture
- Does the change follow existing patterns or introduce a new one?
- If a new pattern, is it justified and documented?
- Are module boundaries maintained? Any circular dependencies?
- Is the abstraction level appropriate (not over-engineered, not too coupled)?
- Are dependencies flowing in the right direction?

## Security
- Is user input validated and sanitized at system boundaries?
- Are secrets kept out of code, logs, and version control?
- Is authentication/authorization checked where needed?
- Are queries parameterized? Is output encoded?
- Any new dependencies with known vulnerabilities?

## Performance
- Any N+1 query patterns?
- Any unbounded loops or unconstrained data fetching?
- Any synchronous operations that should be async?
- Any unnecessary re-renders (in UI components)?
- Any missing pagination on list endpoints?
