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
status: active
revision: 1
---

# Write the log for the session that continues
Append-only record of outcomes/decisions. Main purpose: persisted context for resuming or analyzing the review process. You're writing this log for consumption by another LLM session.
Record decisions and their reasons, user constraints, unresolved findings, and references needed to recover evidence. Link to large results rather than copying them here. This is NOT a transcript or internal deliberation.
