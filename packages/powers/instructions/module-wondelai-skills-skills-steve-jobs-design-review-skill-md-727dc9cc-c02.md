---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-steve-jobs-design-review-skill-md-727dc9cc-c02"
title: "wondelai-skills: skills/steve-jobs-design-review/SKILL.md module"
summary: "Carrier for 4 atomic instructions from wondelai-skills:skills/steve-jobs-design-review/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/steve-jobs-design-review/SKILL.md\"}"
atom_ids:
  - steve-jobs-design-review-running
  - steve-jobs-design-review-score
  - steve-jobs-design-review-simplicity
  - steve-jobs-design-review-whole-experience
atom_count: 4
atoms: "[{\"atom_id\":\"steve-jobs-design-review-running\",\"file_sha256\":\"1b6f88c860811e36abf4b719699d8e38040b29055d189fad3d1c9ded6468f30c\",\"content_sha256\":\"27810f30001506433a3762da83878a462b9830576d364b49361b8b1f487399bd\",\"file_bytes\":2320,\"body_bytes\":1040},{\"atom_id\":\"steve-jobs-design-review-score\",\"file_sha256\":\"1348ed3f1218613bc1eb65b701bb3891bac9830adf96c880e4b973c48ae41fe5\",\"content_sha256\":\"04653d84225d2ada761c03262aa3764e4f1820d6d721aea8650b4d0ddadd2d52\",\"file_bytes\":1697,\"body_bytes\":482},{\"atom_id\":\"steve-jobs-design-review-simplicity\",\"file_sha256\":\"832ae03710746c0f158d0234e6403165868758edd548cb548293e6c0b5a1eec5\",\"content_sha256\":\"d47e8e5e8c691b0a92c73be619765e9f2782d023c849b417e9ce19fd8207b83a\",\"file_bytes\":2148,\"body_bytes\":913},{\"atom_id\":\"steve-jobs-design-review-whole-experience\",\"file_sha256\":\"c15f3592f6891d9f2d076a62bfe8e71e86e9464d0bf5c1c9a86f5bc739f327b9\",\"content_sha256\":\"6ecb0d50c17107b79288e6a40bcfda9b8a3b50f7d15f07e2f4f4a67d6ad9612f\",\"file_bytes\":2316,\"body_bytes\":1103}]"
carrier_sha256: 51bce305d65db5706e3c50bf4c04bc47fd3663eaaa3b5dfe1d6efd8ee674d16f
carrier_bytes: 8988
revision: 1
status: active
---
<!-- vpmodule:atom:begin steve-jobs-design-review-running -->
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
<!-- vpmodule:atom:end steve-jobs-design-review-running -->
<!-- vpmodule:atom:begin steve-jobs-design-review-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-score
title: Score the product out of 10
summary: "Count the 7 Quick Diagnostic rows the product passes, map the count with 7/7=10, 6/7=9, 5/7=7, 4/7=6, 3/7=4 and at most 2/7 at most 3, read the 9-10, 5-8 and at most 4 bands, and state the failed rows and fixes."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Scoring a product review.
conditions_does_not_apply_when: A design review with no verdict.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
  - cuts-and-fixes
artifact_contract_verified_by: "The report states the score, the exact failed rows and the cuts or fixes needed to reach 10/10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the product out of 10

Score the product against a goal of 10/10 by counting how many of the 7 Quick Diagnostic rows it passes, then map the count as follows: 7/7 = 10, 6/7 = 9, 5/7 = 7, 4/7 = 6, 3/7 = 4, and <=2/7 <= 3. The bands are 9-10 = insanely great and ships; 5-8 = real cuts and fixes required; <=4 = not done and back to demos. There is no 'pretty good' verdict: state the score, the exact rows that failed, and the specific cuts or fixes required to reach 10/10.
<!-- vpmodule:atom:end steve-jobs-design-review-score -->
<!-- vpmodule:atom:begin steve-jobs-design-review-simplicity -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-simplicity
title: Conquer complexity by subtraction
summary: "Treat simplicity as complexity conquered, keep subtracting until one more removal would break the purpose, measure steps-to-value, prefer one good default over a setting, and never hide necessary controls or costs."
capability_tags:
  - review-product-design
pattern_tags:
  - subtractive-simplicity
conditions_applies_when: Auditing product or screen complexity.
conditions_does_not_apply_when: Simplifying a technical implementation without changing the product surface.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names what was removed and the steps-to-value measurement.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L24-L53"
status: active
revision: 1
---

# Conquer complexity by subtraction

Treat simplicity as conquered complexity, not the absence of features: keep subtracting until removing one more thing would break the product's purpose. In a feature audit, count steps to core value and cut anything off the main path, using the source's benchmark of first value in 3 steps rather than 9; in a UI critique, remove elements until the screen states one intent and use one primary button per screen; in a settings review, replace options with opinionated defaults such as always-on auto-save with no toggle. Prefer one good default over exposing a preference, treat every preference as a decision the team failed to make, and redesign anything that must be explained because instructions are apologies. Simplify by solving complexity for the user, never by burying necessary controls or costs such as pricing, privacy, or cancellation where they cannot be found.
<!-- vpmodule:atom:end steve-jobs-design-review-simplicity -->
<!-- vpmodule:atom:begin steve-jobs-design-review-whole-experience -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-whole-experience
title: Own the whole experience
summary: "Review every touchpoint from discovery and purchase through first run, daily use, failure, support, billing and leaving; hold the worst touchpoint as the perceived quality bar and never design a polished entrance with a hostile exit."
capability_tags:
  - review-product-design
pattern_tags:
  - end-to-end-ownership
conditions_applies_when: Reviewing the journey around the product.
conditions_does_not_apply_when: A single isolated screen review.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review maps the journey end to end and names the weakest touchpoint.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L112-L141"
status: active
revision: 1
---

# Own the whole experience

The product is every touchpoint — discovery, purchase, unboxing or first run, onboarding, daily use, failure, support, billing, and leaving — and must be reviewed as one widget, not the app in isolation, because customers judge the experience as a single thing and the worst touchpoint sets perceived quality. Review rules: treat the first run as the unboxing and give the minute-zero screen hero-screen care; audit support tickets, invoices, and cancellation flows as product surfaces; map the journey end to end and check every handoff between teams (marketing, onboarding, product, support) where experience seams show; verify the ad promise matches first-run reality and that the experience keeps its promise after the sale. Review prompts: 'Walk me from hearing about this to recommending it — where does it crack?', 'Who designed the invoice? The error email? The cancel flow?', 'Does the experience keep its promise after the sale?' Ethical boundary: owning the whole experience means owning failures too — never design a polished entrance and a hostile exit.
<!-- vpmodule:atom:end steve-jobs-design-review-whole-experience -->