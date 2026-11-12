---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-scorecard-marketing-skill-md-e96544a1-c02"
title: "wondelai-skills: skills/scorecard-marketing/SKILL.md module"
summary: "Carrier for 3 atomic instructions from wondelai-skills:skills/scorecard-marketing/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/scorecard-marketing/SKILL.md\"}"
atom_ids:
  - scorecard-marketing-questionnaire
  - scorecard-marketing-results
  - scorecard-marketing-score
atom_count: 3
atoms: "[{\"atom_id\":\"scorecard-marketing-questionnaire\",\"file_sha256\":\"e92f3aab84fc642edf2ed84af842a406c3769237716632e80c392ea619ca4456\",\"content_sha256\":\"81197dd6f70e2324be7804a5d163d4d2dffe2d90b4e6545e2770e3c8573cb0c1\",\"file_bytes\":1893,\"body_bytes\":744},{\"atom_id\":\"scorecard-marketing-results\",\"file_sha256\":\"dd1ab30e6a545832c4baed142b43822257bc5688b070539145245e50e07951cf\",\"content_sha256\":\"2464972432e59c22f529565d0f85f439978f2dd1821c9fb0f3e85e689345d59e\",\"file_bytes\":1576,\"body_bytes\":434},{\"atom_id\":\"scorecard-marketing-score\",\"file_sha256\":\"4184e8c3857ee839e22b0a2bedc8ef87c8ebb9eaeb638d94bc4a069d5f3111d6\",\"content_sha256\":\"9eb89faac1c5008488598c5750ca0bf213755529b3518aa19183bd7173f2b172\",\"file_bytes\":1630,\"body_bytes\":524}]"
carrier_sha256: 43c3b71cce44d60050792f1499a16c9d5692f2a99be0de0cbaa594c428807047
carrier_bytes: 5442
revision: 1
status: active
---
<!-- vpmodule:atom:begin scorecard-marketing-questionnaire -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: scorecard-marketing-questionnaire
title: Design the questionnaire
summary: "Capture name and email before the first scored question, scale question count by audience stage, and group questions into 2-7 measurable categories."
capability_tags:
  - design-scorecard-funnel
pattern_tags:
  - scorecard-questionnaire
conditions_applies_when: Writing the scorecard questions.
conditions_does_not_apply_when: A survey with no scoring or contact capture.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Contact capture precedes the questions, the count fits the audience stage, and 2-7 categories are used."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/scorecard-marketing/SKILL.md; sha256=bb8aa862f93ef1004844e0947f3b196db5d8e758617e977b2d90e6c23be506bd; locator=skills/scorecard-marketing/SKILL.md#L55-L84"
status: active
revision: 1
---

# Design the questionnaire

Capture contact information before the first scored question; name and email are listed, with phone optional. Scale question count by audience stage (8–15 cold-to-warm, 20–50 warm-to-sales, 30–150 client-to-fan). Group questions into 2–7 measurable categories and assign 1–5 points per answer, weighting significant answers more. Put budget, urgency, and company-size qualifiers in an Uncategorised group; avoid salesy, leading, lookup, and jargon questions. Use respondent-centered wording, progress indicators, and category names respondents understand. Collect only data used to improve results, and make each qualifier visibly shape the recommendation rather than merely route the respondent to sales.
<!-- vpmodule:atom:end scorecard-marketing-questionnaire -->
<!-- vpmodule:atom:begin scorecard-marketing-results -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: scorecard-marketing-results
title: Design the results page
summary: "Show the overall score and category breakdown, provide dynamic content for each tier, and give each tier a specific next step and CTA without inflating the computed score."
capability_tags:
  - design-scorecard-funnel
pattern_tags:
  - scorecard-tiers
conditions_applies_when: Designing scorecard results and tiers.
conditions_does_not_apply_when: A single generic result for every respondent.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each tier has dynamic content and a specific CTA, and the score is not inflated."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/scorecard-marketing/SKILL.md; sha256=bb8aa862f93ef1004844e0947f3b196db5d8e758617e977b2d90e6c23be506bd; locator=skills/scorecard-marketing/SKILL.md#L85-L114"
status: active
revision: 1
---

# Design the results page

Show the respondent's overall score and category breakdown. Provide dynamic content for each tier, defaulting to Low, Medium, and High; custom tiers are optional. Calibrate a clear next step and CTA to the tier. Do not inflate or deflate a computed score to steer the respondent toward an offer; the tier must reflect their actual answers. Personalized PDF reports are an optional way to extend the result.
<!-- vpmodule:atom:end scorecard-marketing-results -->
<!-- vpmodule:atom:begin scorecard-marketing-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: scorecard-marketing-score
title: Score the funnel against the diagnostic
summary: "Score all six Quick Diagnostic rows as round(satisfied/6 x 10), report the score and the rows needed to reach 10, and apply the stated bands."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a scorecard funnel.
conditions_does_not_apply_when: A code review that does not assess the funnel.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, each row's status and the band."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/scorecard-marketing/SKILL.md; sha256=bb8aa862f93ef1004844e0947f3b196db5d8e758617e977b2d90e6c23be506bd; locator=skills/scorecard-marketing/SKILL.md#L20-L23"
status: active
revision: 1
---

# Score the funnel against the diagnostic

Score the funnel against all six Quick Diagnostic rows using round(satisfied_rows / 6 × 10). Report the current score and specific rows needed to reach 10/10. A score of 9–10 requires all six criteria: dormant-desire hook, email captured first, scored categories, unique per-tier content and CTA, and tier-segmented follow-up. Scores 5–7 indicate the funnel exists but generic results or late email capture cost 2–3 rows. Scores ≤3 indicate no concept hook or no scoring.
<!-- vpmodule:atom:end scorecard-marketing-score -->