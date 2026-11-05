---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-running
title: Run the review to a binary verdict
summary: "Experience the product cold, state its One Thing, audit against the promise and principles, then deliver INSANELY GREAT or NOT DONE with a score, specific cut and fix lists and the fixed review template; one decider owns the verdict."
capability_tags:
  - review-product-design
pattern_tags:
  - binary-design-verdict
conditions_applies_when: Running the review session.
conditions_does_not_apply_when: An informal comment thread with no verdict.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - binary-verdict
  - one-thing
  - cut-list
  - fix-list
artifact_contract_verified_by: The review follows the template and ends with a binary verdict and ranked fixes.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L200-L225"
status: active
revision: 1
---

# Run the review to a binary verdict

Run every design review in a fixed order: experience the product cold as a customer before the meeting because first impressions cannot be re-run; state the product's promise or the One Thing it must do; audit the product against that promise and principles 1-6; then deliver a binary verdict of INSANELY GREAT or NOT DONE with score X/10. Feedback must be specific and actionable, identifying what, where, why, and the fix direction; saying 'this is confusing' fails the review because it does not identify the problem. End with either a ship-worthy verdict or a ranked fix list, never 'polish it a bit.' Input may be wide, but one decider owns the verdict. Always output the review in the required template: 'Design Review: [Product/Feature]', 'Verdict: INSANELY GREAT / NOT DONE (score X/10)', 'The One Thing', 'Keeps its promise? yes/no with evidence', 'Cut list', 'Fix list ranked, specific, with fix direction', and 'Back of the fence'. Be brutal about the work while remaining decent to people.
