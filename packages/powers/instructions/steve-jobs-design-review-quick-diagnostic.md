---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-quick-diagnostic
title: Run the 7-row review diagnostic
summary: "Check the One Thing, three-step value, cold first experience, working demo, something removed, unseen-surface quality and team pride, with the stated action for every no."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick scored diagnostic of a product.
conditions_does_not_apply_when: A full review with a fix list.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers all seven questions and names the action for every no.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L239-L250"
status: active
revision: 1
---

# Run the 7-row review diagnostic

Use the seven-row Quick Diagnostic as the scoring instrument; each row asks a question, and a 'No' triggers the stated action. (1) Can you state the One Thing this product must do in one sentence? If no, there is no focus and everything is the priority; write it and cut what does not serve it. (2) Does a new user reach core value in <=3 steps? If no, complexity is unconquered; map steps-to-value and remove steps rather than reorder them. (3) Did the reviewer experience it cold, as a customer? If no, you reviewed the team's story rather than the product; use it before the meeting with no walkthrough. (4) Is there a working demo on the real device? If no, you are approving an imagined product; reschedule until there is a demo. (5) Was anything removed this cycle? If no, the roadmap is accreting rather than focusing; add a cut list to every review. (6) Do error, empty, and edge states match hero-screen quality? If no, the back of the fence is plywood; audit and fix unseen surfaces. (7) Would the team proudly use it daily and sign it? If no, the bar is 'acceptable' rather than 'insanely great'; hold the binary verdict until pride is real.
