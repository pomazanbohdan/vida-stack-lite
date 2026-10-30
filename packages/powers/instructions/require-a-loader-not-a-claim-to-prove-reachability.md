---
instruction_id: require-a-loader-not-a-claim-to-prove-reachability
title: "Require a loader, not a claim, to prove reachability"
summary: A claimed caller and a documentation mention are not callers; only a loader that names the file proves it is reached.
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: A shipped file is reported as reached by nobody.
conditions_does_not_apply_when: The file is referenced by a loader that names it.
artifact_contract_output_type: reachability-decision
artifact_contract_required_data:
  - the file
  - the loader that names it
  - the claimed callers that were checked
artifact_contract_verified_by: every claimed caller was checked to exist and the file is either wired or swept
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-unreachable-workflow-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Require a loader, not a claim, to prove reachability
Before deleting, confirm the fence is not load-bearing: check the file's own header for a claimed caller and verify that caller exists.
**A claimed caller is not a caller.**
Documentation is a claim about the system, not a loader. `scan.md` was documented in `docs/INVENTORY.md` while being entirely unreached.
If you are tempted to satisfy the check by adding a mention somewhere convenient, that is the failure mode this scoping exists to prevent — the file stays dead and the gate goes green.
