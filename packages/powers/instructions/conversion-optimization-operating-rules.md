---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-operating-rules
title: Apply the operating rules
summary: "Resume from the tracker before anything else; intake on first run only; announce each phase and offer proceed, skip or defer; load the phase skill or its Brief; ask every decision question; present artifacts for sign-off; extend without overwriting; ship only measured and researched fixes with a test."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - resumable-journey
  - phase-gate
conditions_applies_when: Running or resuming any conversion journey phase.
conditions_does_not_apply_when: A one-off question that does not run the journey.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each rule is followed and each phase transition leaves a tracker entry.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L39-L49"
status: active
revision: 1
---

# Apply the operating rules

On resumption, first read the tracker and every mapped artifact; if a tracker exists, summarize state in 3-5 lines and ask the user which phase to enter. Do not restart a tracked journey; enter only after the user confirms. On a first run, perform Intake, create the tracker with every phase statused pending, in-progress, awaiting-evidence, done, deferred with reason, or skipped with reason, and obtain user confirmation of the phase plan. Before phase work, announce its purpose, forced decision, artifact, and rough effort; offer proceed, skip, or defer, but a GATE phase may be deferred and never skipped. Mark it in-progress on proceed and begin after the user's choice. Load and use the phase skill; if unavailable, offer the named npx installation command; if declined, use the phase Brief as the minimum viable method and state which mode is used. Ask every listed user decision question with concrete options and a recommendation; record choices in Key Decisions. Present draft artifact content for sign-off before writing; after approval, write or extend docs and update tracker status, Key Decisions, and Next Actions. Read before writing, create missing artifacts only, otherwise extend and preserve others' content; recommendations must be checkboxes or table rows with owner and priority. When first creating a docs file, use the full artifact-template skeleton, then fill the phase sections. No fix ships without a Phase 1 measured leak and Phase 2 researched reason; every shipped change must be in EXPERIMENTS.md with a pre-committed primary metric and guardrail. Unsupported fixes return to Phase 2; bold changes without a test remain in the backlog.
