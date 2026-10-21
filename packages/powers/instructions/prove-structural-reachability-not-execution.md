---
instruction_id: prove-structural-reachability-not-execution
title: "Prove structural reachability, not execution"
summary: A reachability rule proves that a loader names the file; it cannot prove the file is read on an executed path.
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: A reachability check passes and the result is read as proof of use.
conditions_does_not_apply_when: The check is used to decide what to delete.
artifact_contract_output_type: reachability-verdict
artifact_contract_required_data:
  - the structural result
  - the limit of what it proves
artifact_contract_verified_by: the verdict states that the result is structural and names what it does not prove
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-unreachable-workflow-findings.md
status: active
revision: 1
---

# Prove structural reachability, not execution
The rule proves **structural** reachability: some loader names the file. It cannot prove the file is read on any executed path.
A mutual-reference island satisfies nothing.
A self-reference is not a loader.
A workflow that is named by a loader but never actually executed is **not** caught here. That is a semantic question this structural check does not answer.
