---
instruction_id: classify-a-run-anomaly-by-its-signal
title: Classify a run anomaly by its signal
summary: "A failed or stuck run is read back as evidence: each anomaly is recognised by its signal, rated, and explained with a hypothesis grounded in the collected evidence."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: "A run failed, hung or left the workspace in a strange state."
conditions_does_not_apply_when: The run is still in progress.
artifact_contract_output_type: anomaly-report
artifact_contract_required_data:
  - the anomaly
  - its signal
  - the rating
  - the evidence
  - the hypothesis
artifact_contract_verified_by: every anomaly names the signal it was recognised by and the hypothesis rests on the collected evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/forensics.md
status: active
revision: 1
---

# Classify a run anomaly by its signal
Same file appears in 3+ consecutive commits within a short time window.
Critical — if the commit messages are similar (e.g., "fix:", "fix:", "fix:" on same file)
Important — if the file appears frequently but commit messages vary
**Evidence:** {specific commits, files, or state data}
**Interpretation:** {what this likely means}
Phase appears complete (has commits, is past in roadmap) but lacks expected artifacts.
commits exist but SUMMARY.md is missing for the current or recently active plan.
Large gap between last commit and current time, with STATE.md showing mid-execution.
Recent commits touch files outside the current phase's expected scope.
Commit messages containing "fix test", "revert", or re-commits of test files.
Based on the evidence above, the most likely explanation is:
If the user asks follow-up questions, answer from the evidence already gathered. Read additional files only if specifically needed.
