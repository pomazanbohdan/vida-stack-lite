---
instruction_id: guard-the-resume-loop-with-a-cap-and-a-steady-signal
title: Guard the resume loop with a cap and a steady signal
summary: "A resume loop has two stops: a steady signal that shows no progress, and an absolute cap that ends the loop whatever the signal says."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - systematic-debugging
conditions_applies_when: A run resumes a delegated step repeatedly until it finishes.
conditions_does_not_apply_when: The step is run once.
artifact_contract_output_type: resume-loop-guard
artifact_contract_required_data:
  - the signal that shows no progress
  - the cap
  - the blocker report emitted at the cap
artifact_contract_verified_by: "the loop stops on the steady signal and at the cap, whichever comes first"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Guard the resume loop with a cap and a steady signal
A no-progress heuristic keyed on `next_action` ALONE
Never `updated`, which is overwritten on every checkpoint write
So it changes every cycle and can never signal no-progress.
After 3 total auto-resumes for the slug, STOP auto-resuming and emit the blocker report REGARDLESS of whether `next_action` changed.
