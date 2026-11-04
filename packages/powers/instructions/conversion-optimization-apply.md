---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-apply
title: Run a resumable conversion journey
summary: "Optimize one leaking conversion flow and its single desired action, not the whole site; ask before every decision, record outcomes in docs artifacts and allow the journey to resume after any phase."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - resumable-journey
conditions_applies_when: A website or in-product flow that leaks conversions.
conditions_does_not_apply_when: A whole-site audit or a flow with no single desired action.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The journey names one flow, one action and the artifacts that record each phase."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L10-L17"
status: active
revision: 1
---

# Run a resumable conversion journey

Run an interactive, resumable seven-phase optimization journey for one conversion flow and its single desired action, not for the whole site. Ask the user before every decision, record outcomes in the project's docs/ artifacts, and allow the journey to stop after any phase and resume later.
