---
instruction_id: publish-every-key-of-a-versioned-machine-contract
title: Publish every key of a versioned machine contract
summary: "A machine-readable snapshot carries every key always, an unknown value is null with a coded diagnostic, and a consumer rejects a shape it does not know."
capability_tags:
  - define-output-format
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A machine-readable snapshot of the state of the work is published for a consumer to read.
conditions_does_not_apply_when: The artefact is a human-readable document.
artifact_contract_output_type: versioned-state-contract
artifact_contract_required_data:
  - the contract version
  - "every key of the contract, present"
  - the coded diagnostic for each unknown value
artifact_contract_verified_by: "no key is omitted, every unknown value is null with a diagnostic, and a consumer rejects an unknown contract version"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/machine-readable-state-contract-planningstatejson.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/read-only-planning-snapshot-planning-inspect.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Publish every key of a versioned machine contract
Those are human surfaces: their shape drifts as the templates evolve, and every consumer ends up carrying a brittle second parser that silently reports wrong numbers after an upgrade.
Publishes a small, versioned JSON snapshot instead, so the reader binds to a contract rather than to markdown
Every key is ALWAYS present — an unknown value is `null`, never an omitted key, because an omitted key is itself an observable a consumer would bind to.
Consumers gate on the MAJOR version; `1.x` changes are additive only.
`contract` is semver, `1.0.0` at introduction.
Consumers MUST reject any other value rather than best-effort-parse an unknown shape.
Unknown or conflicting evidence serializes as `null` / `"unknown"` with a coded entry in `diagnostics[]` — never inferred, reconciled, or defaulted.
Every key is always present; a key is never omitted to signal absence.
The write is best-effort and completely invisible to the command that triggered it: it cannot change an exit code, cannot change stdout, and cannot fail a workflow.
Readers prefer the file when it is present and fall back to markdown when it is not.
The skills own the file; readers never write it. It is a derived cache — safe to delete, regenerated at the next boundary.
Read-only. The command mutates no planning state, and mutates nothing on disk, under any input.
Argument errors fail loud (non-zero exit, typed `ERROR_REASON`); data gaps do not.
Roadmap acceptance, verification status, and UAT items are reported side by side per phase and are never folded into a single verdict.
