---
instruction_id: separate-what-consumers-read-from-what-is-only-for-audit
title: Separate what consumers read from what is only for audit
summary: "The record the agents consume is separate from the record the humans audit: the discussion log preserves the alternatives that were considered and is never read by the agents that plan, research or execute."
capability_tags:
  - plan-implementation
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A document publishes the list of files its consumers must read.
conditions_does_not_apply_when: The document is a single file with no contract list.
artifact_contract_output_type: contract-list
artifact_contract_required_data:
  - the files the consumers must read
  - the files kept for audit
  - the files that are listed nowhere
artifact_contract_verified_by: a consumer reading only the listed contract files has the full contract
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/assets/spec-template.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/templates/discussion-log.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Separate what consumers read from what is only for audit
Canonical contract. This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate.
Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.
`companions:` array of `.md` files downstream MUST read alongside
the spec to have the full contract.
The split between spec-authored and adopted is implicit by path; downstream treats both the same.
`sources:` array of paths to files that were **fully absorbed** into the SPEC, with no remaining downstream value
Downstream does NOT read these.
Files that downstream still needs to read belong in `companions:`, not here.
**Do not list**
the run log, README files, organizational artifacts, or any operational record of how upstream skills produced their artifacts.
Those are not source content; they are process metadata that downstream consumers don't need.
Audit trail only. Do not use as input to planning, research, or execution agents.
Audit trail for human review (compliance, learning, retrospectives). NOT consumed by downstream agents
Decisions are captured in
this log preserves the alternatives considered.
