---
instruction_id: separate-what-consumers-read-from-what-is-only-for-audit
title: Separate what consumers read from what is only for audit
summary: "The contract is the kernel and the companions; the sources are kept for traceability and are not read by the consumers, and process metadata is listed nowhere."
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
status: active
revision: 1
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
