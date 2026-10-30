---
instruction_id: a-guard-that-cannot-run-is-silently-useless
title: A guard that cannot run is silently useless
summary: A fallback arm that can never fire is output-identical to the success path and silently does nothing.
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A guard is written as a fallback around a command that may match nothing.
conditions_does_not_apply_when: The guard is known to be reachable in the context it runs in.
artifact_contract_output_type: guard-shape-decision
artifact_contract_required_data:
  - the command the guard wraps
  - the existence test that replaces the fallback
artifact_contract_verified_by: the guard tests for existence instead of relying on a fallback that cannot fire
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-unreachable-guard-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# A guard that cannot run is silently useless
That guard finds shell in shipped prompt files where a fallback arm **cannot run** — the command it guards succeeds even in the case the fallback was written for, so the guard is output-identical to the success path and silently does nothing.
Under `shopt -s nullglob` an unmatched glob expands to **zero operands**, so the command still succeeds:
**Fix — collect into an array and test for existence:**
