---
instruction_id: review-along-five-fixed-quality-axes
title: Review along five fixed quality axes
summary: "The change is reviewed against correctness, readability, architecture, security and performance, and every finding carries one of four severities with a file:line and a fix."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A change is reviewed and the review must cover quality, not only correctness."
conditions_does_not_apply_when: The review is a single-axis check with one question to answer.
artifact_contract_output_type: axis-review
artifact_contract_required_data:
  - the five axes
  - the findings per axis
  - the severity of each finding
  - "the file:line of each finding"
artifact_contract_verified_by: "every finding carries one of the four severities and a file:line"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/review.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/adoption-guide.md
status: active
revision: 2
---

# Review along five fixed quality axes
Review the current changes (staged or recent commits) across all five axes:
1. **Correctness** — Does it match the spec? Tests adequate?
2. **Readability** — Clear names? Straightforward logic? Well-organized?
3. **Architecture** — Follows existing patterns? Clean boundaries? Right abstraction level?
4. **Security** — Input validated? Secrets safe? Auth checked?
5. **Performance** — No N+1 queries? No unbounded ops?
Categorize findings as Critical, Important, or Minor.
Output a structured review with specific file:line references and fix recommendations.
Reviewing is zero-risk and immediately valuable: the five-axis review and its severity labels (which separate what blocks a merge, Critical and Important, from what doesn't) work on any PR regardless of the codebase's state.
