---
instruction_id: mark-the-clearly-matching-checkpoints-without-asking
title: Mark the clearly matching checkpoints without asking
summary: What matches the contract is marked without a question; only what needs taste is put to the person; a checkpoint nobody could look at is reported as such.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A mechanical comparison can decide some of the checkpoints.
conditions_does_not_apply_when: "Every checkpoint needs the person's eye."
artifact_contract_output_type: auto-verified-checkpoints
artifact_contract_required_data:
  - the checkpoints that were marked
  - the ones queued for the person
  - the ones that could not be looked at
artifact_contract_verified_by: the clearly matching checkpoints were marked without a question and the rest were queued for the person
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work/steps/automated-ui-verification.md
status: active
revision: 1
---

# Mark the clearly matching checkpoints without asking
Automatically mark checkpoints as **passed** or **needs review** based on the visual comparison — no manual question required for items that clearly match.
Flag items that require human judgment (subjective aesthetics, content accuracy) and present only those as manual UAT questions.
If the browser profile is already locked (`The browser is already running for …`), report those checkpoints as **could not look**, not as **needs review**
Display summary line before proceeding:
UI checkpoints: {N} auto-verified, {M} queued for manual review
