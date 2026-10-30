---
instruction_id: push-the-schema-before-you-verify-against-it
title: Push the schema before you verify against it
summary: "A change to the shape of stored data is applied to the live store between the change and the verification, because the type check alone does not prove it was applied."
capability_tags:
  - migrate-a-data-schema
pattern_tags:
  - migration-strategy
conditions_applies_when: A phase modifies files that define the shape of stored data.
conditions_does_not_apply_when: No schema-defining file is touched.
artifact_contract_output_type: schema-apply
artifact_contract_required_data:
  - the schema files that changed
  - the push step
  - the order relative to the verification
artifact_contract_verified_by: the push runs after the change and before the verification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/schema-gate/fragments/plan-pre.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Push the schema before you verify against it
- The planner MUST include a `[BLOCKING]` task that runs the database schema push command AFTER all schema file modifications are complete but BEFORE verification.
- Build and type checks will pass without the push (types come from config, not the live database), creating a false-positive verification state.
- If push requires interactive prompts that cannot be suppressed, flag the task for manual intervention with `autonomous: false`
