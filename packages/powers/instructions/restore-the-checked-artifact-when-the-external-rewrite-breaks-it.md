---
instruction_id: restore-the-checked-artifact-when-the-external-rewrite-breaks-it
title: Restore the checked artefact when the external rewrite breaks it
summary: "An external tool that rewrites a checked artefact is backed up, re-validated and re-checked, and the original is restored when anything fails."
capability_tags:
  - execute-plan
pattern_tags:
  - prepared-reversal
conditions_applies_when: An external script may rewrite an artefact that has already passed a check.
conditions_does_not_apply_when: The artefact is written from scratch.
artifact_contract_output_type: rewrite-rollback
artifact_contract_required_data:
  - the backup of the artefact
  - the validation of the rewritten result
  - the restoration of the original
artifact_contract_verified_by: a rewrite that broke the check left the original in place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/plan-bounce.md
status: active
revision: 1
---

# Restore the checked artefact when the external rewrite breaks it
The bounce step backs up each plan, runs the script, validates YAML frontmatter integrity on the result, re-runs the plan checker, and restores the original if anything fails.
Each plan is backed up to `*-PLAN.pre-bounce.md` before the script runs
Bounced plans with broken YAML frontmatter or that fail the plan checker are restored from backup
