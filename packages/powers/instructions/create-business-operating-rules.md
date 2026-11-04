---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-operating-rules
title: Apply the operating rules
summary: "Resume from the tracker before anything else; intake on first run only; announce each phase and offer proceed, skip or defer; load the phase skill or its Brief; ask every decision question; present artifacts for sign-off; never simulate a customer; extend without overwriting."
capability_tags:
  - build-validated-business
pattern_tags:
  - resumable-journey
  - phase-gate
conditions_applies_when: Running or resuming any business-creation phase.
conditions_does_not_apply_when: A one-off question that does not run the journey.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each rule is followed and the tracker records every phase transition.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L33-L43"
status: active
revision: 1
---

# Apply the operating rules

On resume, first read CREATE-BUSINESS-PLAN.md and every Journey Map artifact; if a tracker exists, summarize state in 3–5 lines and ask which phase to enter. A tracked journey is resumed, never restarted; entry is complete when the user confirms the entry point. On a first run without a tracker, conduct Intake, create CREATE-BUSINESS-PLAN.md with every phase statused pending, in-progress, awaiting-evidence, done, deferred with reason, or skipped with reason, and obtain confirmation of the phase plan. Before phase work, announce its purpose, decision, artifact, and rough effort; offer proceed, skip, or defer, but a GATE phase may be deferred and never skipped; mark in-progress on proceed and wait for the user's choice. Load and use the named phase skill; if unavailable, offer installation via npx skills add wondelai/skills/<slug> --global, and only if declined use the Brief as the minimum viable method, stating the mode. Ask every Decide-with-the-user question with concrete options and a recommendation, and record choices in tracker Key Decisions; silent decisions are defects. Present draft artifacts for sign-off before writing; after approval, create or extend docs and update tracker status, Key Decisions, and Next Actions; a phase is done only when files are written and its row is done. Read artifacts before writing; create only if missing, otherwise extend while preserving others' content; use uppercase filenames, render recommendations as checkboxes or table rows with owner and priority, and for a first docs file use the full artifact-template skeleton before filling named sections. The agent prepares interview guides and scores transcripts, but only the human talks to customers; pause as awaiting-evidence until the user returns with notes, and never simulate a customer.
