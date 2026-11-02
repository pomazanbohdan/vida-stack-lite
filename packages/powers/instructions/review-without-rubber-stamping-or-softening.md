---
instruction_id: review-without-rubber-stamping-or-softening
title: Review without rubber-stamping or softening
summary: "State the real problem, quantify it, push back when the approach is wrong, and argue about the code not the person."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A review is written, whether the code was written by you, another agent or a human."
conditions_does_not_apply_when: Only a mechanical check with no judgement is required.
artifact_contract_output_type: honest-review
artifact_contract_required_data:
  - the real problem
  - the quantified impact where possible
  - the alternative proposed
artifact_contract_verified_by: no approval is given without evidence and no real issue is softened away
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Review without rubber-stamping or softening

When reviewing code — whether written by you, another agent, or a human:

- **Don't rubber-stamp.** "LGTM" without evidence of review helps no one.
- **Verify the finding before reporting it.** Check the callers, guards and tests that reach the changed code; drop the finding if they rule it out. Label a defect that already exists in the base separately from a regression this change introduces. Zero findings is a valid result; do not invent one.
- **Don't soften real issues.** "This might be a minor concern" when it's a bug that will hit production is dishonest.
- **Quantify problems when possible.** "This N+1 query will add ~50ms per item in the list" is better than "this could be slow."
- **Push back on approaches with clear problems.** Sycophancy is a failure mode in reviews. If the implementation has issues, say so directly and propose alternatives.
- **Accept override gracefully.** If the author has full context and disagrees, defer to their judgment. Comment on code, not people — reframe personal critiques to focus on the code itself.

"LGTM" without evidence of actual review

"AI-generated code is probably fine" | AI code needs more scrutiny, not less. It's confident and plausible, even when wrong.
