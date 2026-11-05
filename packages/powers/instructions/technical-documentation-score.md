---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-score
title: Score the documentation
summary: "Score the ten diagnostic rows one point each, report the score, band, failed rows and exact edits, and treat blocking findings as a separate not-shippable gate."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing developer documentation.
conditions_does_not_apply_when: A code review that does not assess documentation.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, band, failed rows, edits and blocking status."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L23-L26"
status: active
revision: 1
---

# Score the documentation

Scoring target is 10/10, computed as the number of Quick Diagnostic rows passed (10 rows, 1 point each; the [EN] row auto-passes for non-English docs). Bands: 9-10 ships as is; 7-8 requires word- and voice-level edits only; 5-6 requires restructuring sections then re-editing; <=4 requires rewrite from the doc-type skeleton. Blocking findings — wrong or unverifiable facts, a procedure that cannot be completed, or information that exists only in an image or in an image without alt text — are a separate gate: the document is not shippable at any score until they are fixed. Report the score, the failed rows, and the exact edits that reach 10/10.
