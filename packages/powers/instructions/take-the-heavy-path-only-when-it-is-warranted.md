---
instruction_id: take-the-heavy-path-only-when-it-is-warranted
title: Take the heavy path only when it is warranted
summary: "The heavy path is for people who did not do the thinking and must approve, for parts built in parallel that must not diverge, and for processes that require named documents; the approval then attaches to a written result."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: It is being decided whether the work needs the heavy path.
conditions_does_not_apply_when: One builder or a small team that already agrees does the work.
artifact_contract_output_type: tier-decision
artifact_contract_required_data:
  - the ground for the heavy path
  - the written result the approval attaches to
artifact_contract_verified_by: the heavy path was chosen because one of its grounds holds
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/working-in-an-organization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
  - business
  - operations
---

# Take the heavy path only when it is warranted
Recommend the full path (PRD, architecture, one spec per epic, tracking) only when one of these is true
People who did not do the thinking must approve what the product is.
Several epics, teams, or agents build against the same decisions and must not diverge.
A regulator, steering committee, or company process requires named documents.
Each moment produces a written result an approval can attach to.
Advise placing existing approvals here.
