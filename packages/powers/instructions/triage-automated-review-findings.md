---
instruction_id: triage-automated-review-findings
title: Triage automated review findings without blind trust
summary: "Classify each automated comment as fix, dismiss, or ask, and fix the root cause instead of disabling the rule."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: An automated review or linter returned a set of findings against the change.
conditions_does_not_apply_when: The findings came from a person and need a different kind of triage.
artifact_contract_output_type: automated-finding-triage
artifact_contract_required_data:
  - confirmed
  - "false"
  - deferred
  - reason
  - check added
artifact_contract_verified_by: the rule re-run after the fix with no recurrence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/references/bugbot-triage.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/code-review-pipeline.md
status: active
revision: 2
---

# Triage automated review findings without blind trust
Use this when review-automation comments arrive on a change.
The goal is not to ignore the automation by default; it is to stop treating every comment as a required code change.
Classify each thread before acting.
Fix: the comment identifies a plausible correctness, security, privacy, data loss, auth, billing, migration, idempotency, race, or shipped-behavior issue.
Fix it in the lowest owning change, then reply with the commit and resolve the thread.
Dismiss: the comment matches a documented low-risk noisy pattern, and the current code and context prove the concern does not need a code change.
Reply with a short reason and resolve the thread.
Ask: the comment is novel, high-severity, security or privacy or data-related, or ambiguous.
Ask the user instead of guessing.
When in doubt, ask.
Skipping a noisy code-quality comment is cheap; skipping a real data or security bug is not.
Do not auto-skip security, privacy, auth, billing, data retention, and permission-boundary findings.
Do not auto-skip high-severity findings.
Do not auto-skip migration, schema, idempotency, concurrency, and cross-system behavior findings.
Treat those as owner judgment calls, not team-wide skip rules.
Run the cited test before classifying a contract-test drift claim; a red run confirms the claim and a green run disproves it.
Record repeatable noise patterns with confidence, skip conditions, do-not-skip boundaries, an example signal, and a source.
Use candidate for one or two examples, recurring after multiple real dismissals, and strong only when the pattern is narrow, repeatedly verified, and low-risk.
Fix the root cause rather than disabling the rule.
Re-run the rule after the fix and confirm no recurrence.
External findings are unverified corroborating evidence
independently re-verifies every claim against the actual source before writing it to `REVIEW.md`, so there remains exactly one `REVIEW.md` schema regardless of how many lanes ran.
An explicitly requested lane that is unavailable or fails is reported as a warning, never silently dropped and never a raw-CLI fallback.
