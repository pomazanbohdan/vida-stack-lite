---
instruction_id: halt-with-the-reason-when-a-precondition-is-missing
title: Halt with the reason when a precondition is missing
summary: "When the run lacks what it needs, stop with the reason named instead of guessing forward."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: "A precondition of the work is missing: the trigger, the evidence, the impact analysis, the approval or the owner of the change."
conditions_does_not_apply_when: Everything the run needs is present.
artifact_contract_output_type: halted-run
artifact_contract_required_data:
  - the missing precondition
  - the reason
  - the blocking items
artifact_contract_verified_by: the run stopped with the reason named and the blocking items listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-preconditions.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Halt with the reason when a precondition is missing
Identify blocking issues and work with user to resolve before continuing
HALT: "Cannot proceed without the ticket, its memlog, and its breakdown"
HALT: "Need concrete evidence or examples of what changed before analyzing impact"
HALT: "Cannot propose a path without knowing whether what is required changed"
HALT: "Must have explicit approval before changing the tree"
HALT: "Must clearly define who will execute the change and what done looks like"
HALT: "Need the ticket or the initiative file to assess the change. Open a companion only where it points."

**Unmet** | STOP - return a checkpoint reporting `**Gate:** blocking-human` with `**Blocked by:** Precondition not met: <precondition text>`. Do NOT partial-commit the task. Unmet preconditions are NEVER auto-approved - a missing prerequisite is not a verification step a human can rubber-stamp, it is a fact the executor cannot establish on its own.
