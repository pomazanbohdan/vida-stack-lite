---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hundred-million-offers-score
title: Score the offer
summary: "Score the seven Quick Diagnostic rows with about 1.4 points per yes, round to 0-10, report the score and the rows that must flip to yes; use only the stated bands and leave 4 and 7-8 unassigned."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing an existing offer.
conditions_does_not_apply_when: A code review that does not assess the offer.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the failing rows and the changes needed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hundred-million-offers/SKILL.md; sha256=585779eac550ef8c43114b68e51c2eb1bf9547381fcd7342d54190c0d0cdc314; locator=skills/hundred-million-offers/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the offer

Score an offer against the seven Quick Diagnostic rows: assign approximately 1.4 points for each yes and round the result to a 0–10 scale, aiming for 10/10. Report the current score and the specific rows that must change to yes to reach 10. The source labels 9–10 as all or nearly all passing, including 10x perceived value, reversed risk, ethical scarcity, named bonuses with dollar values, a category-of-one bundle, and a MAGIC name; 5–6 as value and market fit but missing risk reversal, bonuses, or scarcity; and scores at or below 3 as a cost-priced commodity with no guarantee or reason to act now.
