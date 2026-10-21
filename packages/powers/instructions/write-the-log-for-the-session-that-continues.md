---
instruction_id: write-the-log-for-the-session-that-continues
title: Write the log for the session that continues
summary: "The log is written for the session that continues the work, not as a transcript of the current one."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A review writes a log that another session will read to resume or to analyze the work.
conditions_does_not_apply_when: The log is only a scratch pad that nobody reads again.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the decisions and their reasons
  - the user constraints
  - the unresolved findings
  - the references that recover the evidence
artifact_contract_verified_by: a reader who never saw the session can resume the review from the log alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/templates/log-template.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/resume-project.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
---

# Write the log for the session that continues
Append-only record of outcomes/decisions. Main purpose: persisted context for resuming or analyzing the review process. You're writing this log for consumption by another LLM session.
Record decisions and their reasons, user constraints, unresolved findings, and references needed to recover evidence. Link to large results rather than copying them here. This is NOT a transcript or internal deliberation.
Last session: [now]
Stopped at: Session resumed, proceeding to [action]
Resume file: [updated if applicable]
This ensures if session ends unexpectedly, next resume knows the state.
On context reset: File shows last checkpoint. Resume from there.
Update the `## Current Test` section with the pending test IN MEMORY ONLY
the next batched write (`process_response`'s `update_rules`) persists it alongside the test's actual result, so a resume that finds a pending row and stops without answering it performs zero writes.
