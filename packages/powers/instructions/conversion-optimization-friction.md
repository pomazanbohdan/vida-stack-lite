---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-friction
title: Remove friction for visitors ready to act
summary: "Raise ability and sharpen prompts: clear signifiers, constraints that prevent errors, feedback within 0.1 seconds, progress on multi-step flows, minimum fields, all costs before the final step, guest checkout, inline validation and blame-free errors with undo."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - friction-reduction
  - form-friction
conditions_applies_when: "Auditing form, payment and confirmation steps."
conditions_does_not_apply_when: A flow with no interactive step.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every step has a friction row, forms are cut to minimum fields and required payment rules are met or marked n/a."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L174-L194"
status: active
revision: 1
---

# Remove friction for visitors ready to act

Protect visitors ready to act by raising Ability and sharpening Prompts after Phases 3-5 raise Motivation (B=MAP). Bridge execution and evaluation gulfs: use clear signifiers, constraints that prevent errors, feedback within 0.1 seconds of every action, and progress indication on multistep flows. Minimize fields, request payment as late as possible, show all costs before the final step, offer guest checkout, validate inline with corrective messages, and write blame-free errors explaining what happened and how to fix it; slips get undo rather than confirmation dialogs. Invoke design-everyday-things on form, payment, and confirmation steps for signifier, constraint, feedback, field-cut, and message findings. Decide required-now versus later fields, constraints versus warnings, earlier total cost, and whether severity-4 friction ships as a logged before/after card or waits for a full test. Extend FUNNEL.md Flow Friction Audit, DESIGN.md UX Audit Findings with Norman gulf in Heuristic, and EXPERIMENTS.md backlog; update tracker. Complete with an audit row per step, minimum-field forms, owners for severity-4 items, and compliant error messages. For payment flows, all costs must be visible before final step and guest checkout offered; mark these two rows n/a when no payment occurs.
