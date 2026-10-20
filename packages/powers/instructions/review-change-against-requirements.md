---
instruction_id: review-change-against-requirements
title: Review the change against its requirements first
summary: "Judge completed work against its plan or requirements, name deviations, and grade silence by what a reasonable person would expect."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A completed change needs a verdict before it is integrated.
conditions_does_not_apply_when: The change has no requirements or plan to compare against.
artifact_contract_output_type: requirements-review
artifact_contract_required_data:
  - change range
  - requirements
  - missing items
  - deviations
artifact_contract_verified_by: each requirement mapped to the change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/requesting-code-review/code-reviewer.md
status: active
revision: 1
---

# Review the change against its requirements first
Your job is to review completed work against its plan or requirements and identify issues before they cascade.
Determine the exact base and head of the range under review.
Does the implementation match the plan / requirements?
Are deviations justified improvements, or problematic departures?
Is all planned functionality present?
The spec says what the software must do. It does not enumerate every input, environment, or condition the software will meet.
For behavior the spec is silent on, judge by what a reasonable person using this software would expect: a reasonable person's expectation is a requirement, and a spec's silence is not permission.
Before your verdict, list every behavior you considered and set aside as outside the plan or spec, one line each, with the reason.
The executor rules on each line; nothing you set aside is dropped silently.
Categorize issues by actual severity. Not everything is Critical.
If you find significant deviations from the plan, flag them specifically so the implementer can confirm whether the deviation was intentional.
If you find issues with the plan itself rather than the implementation, say so.
For each issue: file:line reference, what's wrong, why it matters, and how to fix if not obvious.
Give a clear verdict.
Don't say "looks good" without checking.
