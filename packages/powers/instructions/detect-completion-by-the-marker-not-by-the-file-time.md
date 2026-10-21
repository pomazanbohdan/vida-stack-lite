---
instruction_id: detect-completion-by-the-marker-not-by-the-file-time
title: "Detect completion by the marker, not by the file time"
summary: A watcher decides that the work is done from the completion signal of the run; fresh file times only prove that something happened.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A watcher decides whether a dispatched run is finished or hung.
conditions_does_not_apply_when: The run already returned its result.
artifact_contract_output_type: completion-detection
artifact_contract_required_data:
  - the completion signal that was read
  - the file times that were only a hint
artifact_contract_verified_by: a finished run was never declared hung because no file had been touched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/stall-detection-helpers.md
status: active
revision: 1
---

# Detect completion by the marker, not by the file time
A stale artifact is not a hung agent.
reporting a succeeded agent as hung, which is worse than the original unbounded wait.
is the ONLY working completion signal for that spawn; the artifact glob is secondary there.
