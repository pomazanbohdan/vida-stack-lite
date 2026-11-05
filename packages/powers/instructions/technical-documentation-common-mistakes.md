---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-common-mistakes
title: Avoid the listed documentation mistakes
summary: "Avoid feature-first organization, style before facts, click-here links, buried steps, stacked notices, bracketed placeholders and meaning rewrites; apply each stated fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing documentation for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L194-L205"
status: active
revision: 1
---

# Avoid the listed documentation mistakes

A table of seven recurring documentation mistakes with their failure mode and fix: (1) organizing by feature instead of reader task -> name the reader's task, pick the doc type, one task per page; (2) fixing style before verifying facts -> check every command and parameter against code first; (3) 'click here' and 'see below' link/cross-reference text -> link text names the target, cross-refs say 'see'; (4) steps buried in paragraphs with passive and future tense -> numbered imperative steps, condition first, present tense; (5) stacked Note/Warning boxes -> one notice per section, fold the rest into body text; (6) '<your-key>' or 'YOUR_API_KEY' placeholders -> ALL_CAPS placeholders explained after the sample; (7) rewriting meaning while 'fixing style' -> facts unchanged, unknowns become TODO(verify).
