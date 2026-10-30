---
instruction_id: separate-an-empty-scope-from-a-scan-that-could-not-run
title: Separate an empty scope from a scan that could not run
summary: "Exit codes distinguish a clean run, findings, a genuinely empty scope and a scope that could not be established; only the empty scope is a pass."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - empty-result-policy
conditions_applies_when: A scanner or a check reports its outcome through an exit code.
conditions_does_not_apply_when: The check has only a pass/fail outcome and needs no more specific code.
artifact_contract_output_type: exit-code-contract
artifact_contract_required_data:
  - the allocated code and its meaning
  - the module that owns the code
  - the proof that the scope was established
artifact_contract_verified_by: a scan that could not establish its scope fails the build and never reads as a clean pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=SECURITY.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/adr/3889-process-exit-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Separate an empty scope from a scan that could not run
**`0` and `1` are free. Every other exit code is allocated from one registry.**
| Code | Meaning |
|--:|---|
| `0` | Clean — files were scanned, no findings. |
| `1` | Findings detected. |
| `64` (`USAGE`) | Bad argv — unknown mode, or a `--file`/`--dir` target that does not exist. |
| `66` (`NO_INPUT`) | Ran; the scope was established and is genuinely empty (e.g. a diff touching only image files, or an all-docs PR). Not a failure. |
| `69` (`UNAVAILABLE`) | Could not establish scope — a nonexistent `--diff` ref, running outside a git repository, a repository with no commits, or an unreadable `--dir`. Distinct from `NO_INPUT`: the scanner never actually ran. |
Treats `0` and `66` as passing steps and `1`/`69` as failing steps — a scan that could not run is a build failure, not a silent clean pass.
**One number, one meaning.** A second declaration of an allocated code is a hard error.
**One owner.** A code is emitted only by its declaring module.
A second emitter is a hard error.
A tool that only needs pass/fail registers nothing.
The moment it needs to say anything **more specific** than pass/fail, it takes a number from the registry — because a locally-invented number is exactly how `2` came to mean four things.
`NO_INPUT` versus `UNAVAILABLE` is the distinction the failures in (a) and (b) collapse, and it is deliberately uncomfortable to author
emitting `NO_INPUT` honestly requires proving the scope was established
