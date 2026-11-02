---
instruction_id: spot-check-the-delegated-claims-before-you-report-completion
title: Spot-check the delegated claims before you report completion
summary: "The files, the commits and the self-check marker of a delegated agent are checked before the round is reported."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A delegated agent reported that its work is done.
conditions_does_not_apply_when: The work was done in the current session.
artifact_contract_output_type: spot-check-report
artifact_contract_required_data:
  - the files checked
  - the commits checked
  - the self-check marker
artifact_contract_verified_by: "the files exist, the commits are on the current branch and no failure marker is present"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Spot-check the delegated claims before you report completion
Verify first 2 files from `key-files.created` exist on disk
Check for `## Self-Check: FAILED` marker
If ANY spot-check fails: report which plan failed, route to failure handler — ask "Retry plan?" or "Continue with remaining waves?"
