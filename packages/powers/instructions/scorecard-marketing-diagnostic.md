---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: scorecard-marketing-diagnostic
title: Run the scorecard diagnostic
summary: "Check the dormant-desire hook, early email capture, scored categories, tier-specific content and CTA, and score-segmented follow-up, and apply the matching repair."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a scorecard funnel.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/scorecard-marketing/SKILL.md; sha256=bb8aa862f93ef1004844e0947f3b196db5d8e758617e977b2d90e6c23be506bd; locator=skills/scorecard-marketing/SKILL.md#L194-L204"
status: active
revision: 1
---

# Run the scorecard diagnostic

Diagnose a funnel with six yes/no checks: whether the hook targets a dormant desire, email is captured before questions, questions are grouped into scored categories, each tier has unique dynamic content, each tier has a specific CTA, and follow-up emails are segmented by score. For each failed check, apply the stated repair: rewrite using one of the five hook types; move lead capture before the questionnaire; create 2-7 scored categories; write personalized tier insights and CTAs; map each tier to an appropriate next step; or create separate tailored sequences by tier.
