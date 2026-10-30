---
instruction_id: ban-the-raw-terminator-by-construction
title: Ban the raw terminator by construction
summary: "The bare exit call is a lint error on the real sources, not only on the generated surface, so the defect class it closes cannot reopen through a new call site."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: A rule has to keep a defect class closed against new call sites.
conditions_does_not_apply_when: The rule can only be enforced by a human reading the code.
artifact_contract_output_type: lint-rule-coverage
artifact_contract_required_data:
  - the banned call shape
  - the surfaces the rule is registered on
  - the allowlist entries and their stated reasons
artifact_contract_verified_by: the rule is registered on the real sources and every allowlist entry names its reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/raw-terminator-banned-by-construction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Ban the raw terminator by construction
Make a bare `process.exit(...)` a lint error everywhere it matters, so the "nothing fails with success" defect class ADR-3889 exists to close cannot silently reopen through a new call site.
New rule `local/require-registered-exit` (`eslint-rules/require-registered-exit.cjs`) flags any `CallExpression` shaped exactly like `process.exit(...)`.
Registering on `src/**/*.cts` — not only the emitted `gsd-core/bin/lib/*.cjs` mirrors, which are globally eslint-ignored (ADR-457) — is load-bearing: a rule registered only on the emitted surface is blind to the real sources
The dead `n/no-process-exit: 'off'` carve-out for `hooks/**` is deleted
detected **structurally** (any `process.exit()` lexically nested inside a function named `terminateNow`, *and* the file's basename is `cli-exit.cts`), not by path+line, so it does not rot when the function moves.
it changed from an uncatchable `process.exit(1)` to a catchable `throw new ExitError(1)`
The rule matches the literal `process.exit(...)` shape only, with no scope/flow analysis.
pinning tests in `tests/eslint-rules.test.cjs` assert today's non-detection so a future widening is a visible choice, not a silent one.
