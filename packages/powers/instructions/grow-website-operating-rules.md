---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-website-operating-rules
title: Apply the operating rules
summary: "Resume from the tracker; intake on first run; announce each phase and offer proceed, skip or defer; load the phase skill or Brief; ask every decision question; present artifacts for sign-off; extend without overwriting and keep every claim true."
capability_tags:
  - design-website-growth
pattern_tags:
  - resumable-journey
conditions_applies_when: Running or resuming any grow-website phase.
conditions_does_not_apply_when: A one-off question that does not run the journey.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each phase entry is complete only after the user confirms the entry point, the phase plan and the chosen phase."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-website/SKILL.md; sha256=6ae045554ee3e1ee65a4fd30afad42d40e31c7070ef6b806ec1b8eb8edcec008; locator=skills/grow-website/SKILL.md#L31-L41"
status: active
revision: 1
---

# Apply the operating rules

Operating rules: (1) Resume first — before anything else, read docs/GROW-WEBSITE-PLAN.md and every Journey Map artifact; if the tracker exists, summarize journey state in 3-5 lines and ask which phase to enter; a journey with a tracker is resumed, never restarted. (2) Intake on first run only — with no tracker, run the Intake, then create docs/GROW-WEBSITE-PLAN.md with every phase statused pending | in-progress | awaiting-evidence | done | deferred: reason | skipped: reason. (3) Phase entry — announce what the phase does, the decision it forces, the artifact it produces, and rough effort; offer proceed / skip / defer, where GATE phases may be deferred but never skipped; mark in-progress on proceed. (4) Skill invocation and fallback — load the phase's named skill; if unavailable, offer installing it via 'npx skills add wondelai/skills/<slug> --global'; if the user declines, run the phase from its Brief as the minimum viable method and state which mode is in use. (5) In-phase decisions — ask every 'Decide with the user' question with concrete options and a recommendation, and record the choice in the tracker's Key Decisions; a decision made silently is a defect. (6) Phase exit — present draft artifact content for sign-off before writing; on approval write or extend the docs/ files and update the tracker (status, Key Decisions, Next Actions); done when files are written and the phase row shows done. (7) Artifact discipline — read before writing; create a file only if missing, otherwise extend by adding or updating own sections while preserving others'; files are UPPERCASE in docs/; every recommendation lands as a checkbox or a table row with owner and priority; a new docs/ file is created from the full skeleton in references/artifact-templates.md, then the sections the phase names are filled. (8) Truthfulness guardrail — every scarcity claim, testimonial, and share incentive must be true; when a persuasion tactic needs invented evidence, replace it with a tactic using evidence you have, because fabricated urgency or reviews poison every honest claim that follows.
