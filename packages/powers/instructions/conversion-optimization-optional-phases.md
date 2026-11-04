---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-optional-phases
title: Add optional phases when their condition appears
summary: "Add ux-heuristics for a confusing page, microinteractions for dead moments, scorecard-marketing for a lower-commitment entry and hooked-ux for post-conversion activation; follow the same operating rules and run the standalone method or install the skill."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - resumable-journey
conditions_applies_when: A journey whose named condition matches an optional phase.
conditions_does_not_apply_when: A condition that has not yet appeared.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The optional phase is inserted at its stated condition and extends the named artifact.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L217-L227"
status: active
revision: 1
---

# Add optional phases when their condition appears

Add ux-heuristics when the whole page confuses visitors before the conversion steps; microinteractions when flow moments have silent taps, unexplained waits, or abrupt changes; scorecard-marketing when a lower-commitment quiz or assessment is needed; and hooked-ux when post-conversion activation, rather than conversion, is the next-visit leak. Each extends its named artifact section. Optional phases follow core operating rules and are inserted when their add-when condition first becomes true. With no inline Brief, run the listed standalone method—severity-rated Nielsen 10 heuristics, trigger/rules/feedback/loops inventory, quiz funnel ending in a personalized result, or trigger/action/variable reward/investment loop audit—or install the named skill for its full framework.
