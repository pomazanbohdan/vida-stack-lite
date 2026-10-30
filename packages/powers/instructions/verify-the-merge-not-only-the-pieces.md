---
instruction_id: verify-the-merge-not-only-the-pieces
title: "Verify the merge, not only the pieces"
summary: "The build and the test suite run on the merged result, not only inside each separate piece."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The separate pieces of a round have been brought together.
conditions_does_not_apply_when: Only one piece was produced.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - the build result
  - the test result
artifact_contract_verified_by: the build and the test suite ran on the merged result and not only inside each piece
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Verify the merge, not only the pieces
After merging all worktrees in a wave (parallel mode), or after the last plan completes (serial mode), run a build and then the project's test suite to catch cross-plan integration issues that individual worktree self-checks cannot detect (e.g., conflicting type definitions, removed exports, import changes, link errors).
agents reliably report Self-Check: PASSED even when merging their work creates failures.
Worktree isolation means each agent's Self-Check passes in isolation. But when merged, add/add conflicts in shared files (models, registries, CLI entry points) can silently drop code. The post-merge gate catches this before the next wave builds on a broken foundation.
