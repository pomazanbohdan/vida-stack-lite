---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-operating-rules
title: Apply the operating rules
summary: "Resume from the tracker; intake on first run; announce each phase and offer proceed, skip or defer; load the phase skill or its Brief; ask every decision question; present artifacts for sign-off; keep acquisition phases locked and check every loop against the Manipulation Matrix."
capability_tags:
  - design-retention-engine
pattern_tags:
  - resumable-journey
  - phase-gate
conditions_applies_when: Running or resuming any grow-app phase.
conditions_does_not_apply_when: A one-off question that does not run the journey.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each rule is followed and the tracker records every phase transition.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L33-L43"
status: active
revision: 1
---

# Apply the operating rules

Apply these operating rules: resume first by reading the tracker and all mapped artifacts; if a tracker exists, summarize state in 3–5 lines, ask which phase to enter, and resume rather than restart, ending intake when the user confirms an entry point. Without a tracker, run intake, create GROW-APP-PLAN.md with every phase statused pending, in-progress, awaiting-evidence, done, deferred with reason, or skipped with reason, and get confirmation of the phase plan. On phase entry, state its purpose, forced decision, artifact and rough effort; offer proceed/skip/defer, except GATE phases may be deferred but never skipped; mark in-progress on proceed and finish entry when the user chooses. Load and use the named phase skill; if unavailable, offer the specified install command, and if declined use the Brief's minimum viable method and state the mode. Ask every listed in-phase question with concrete options and a recommendation; record choices in Key Decisions. Present draft artifacts for sign-off before writing; after approval, write or extend docs, update tracker status, Key Decisions and Next Actions, and finish when files are written and phase is done. Read before writing; create only missing docs files, otherwise extend and preserve others' content. Use uppercase filenames and, on first creation, the complete artifact-template skeleton with named sections filled. Every recommendation is a checkbox or table row with owner and priority. Keep acquisition phases (optional cold-start-problem, contagious, crossing-the-chasm and any paid-growth work) locked while activation and retention are below the bar set at intake; unlock only when the cohort curve clears that bar. Every habit loop and reward must pass the Manipulation Matrix: build only what the maker would use and honestly believes materially improves users; replace tactics needing manufactured anxiety or loss aversion with real-value tactics.
