# Agent runtime quality tooling

This directory is deliberately the only npm dependency boundary for the
portable CJS runtime. Production/runtime use continues to work with plain Node
and the dependency-free contract tests in `tests/agent-runtime/`.

The normative stack, thresholds and evidence contract are documented in
`../TESTING.md`. From the repository root, run the complete reproducible manual
gate:

- `npm run agent-runtime:install` — install the repository capability, verify
  all eight GSD lifecycle hook points and enable native Graphify.
- `npm run agent-runtime:verify` — clean `npm ci`, contracts, Vitest, strict
  coverage, CRAP, lint, typecheck, both audits and the full Stryker mutation
  run, in fail-fast order.
- `npm run agent-runtime:deep` — the same complete manual gate with 100,000 property cases.

`npm run agent-runtime:test` is intentionally a fast Vitest-only diagnostic. A
green diagnostic run must not be reported as the complete runtime gate.
Root aliases `agent-runtime:coverage`, `agent-runtime:crap` and
`agent-runtime:mutation` expose the expensive focused lanes without requiring a
working-directory change.

For focused diagnosis, enter this directory and use the nested commands:

- `npm run contracts` — all standalone Node contracts plus the PowerShell policy contract.
- `npm run smoke` — alias for the complete portable contract set.
- `npm test` — Vitest unit, contract, schema-parity, property and integration suites.
- `npm run schema` / `npm run property` — focused Ajv parity and fast-check lanes.
- `npm run coverage` — V8 coverage gate: 100% statements/functions/lines and 95% branches for every maintained `agent-runtime/lib/*.cjs` module.
- `npm run crap` — deterministic per-function CRAP gate (strictly below 5) using Espree complexity and the V8/Istanbul coverage map.
- `npm run mutation` — full Stryker mutation run for every maintained runtime library; its configured target is 100% effective mutations.
- `npm run lint` / `npm run typecheck` — ESLint flat config and TypeScript JSDoc checking.
- `npm run audit:runtime` / `npm run audit:tooling` — separate production and toolchain audits.

Ajv uses Draft 2020-12 (`ajv/dist/2020`) and shared fixtures: a fixture must
be accepted or rejected by both the schema compiler and the corresponding
runtime validator. `fast-check` exercises unsafe relative paths, malformed
bindings/timestamps and replay/CAS behavior. Windows reparse-point behavior
stays deterministic in the existing `runtime-adversarial-contract.test.cjs` fixture.

Stryker is a tooling-only dependency, never a runtime dependency. Mutation
testing complements, but does not weaken or replace, the coverage and CRAP
gates. The full run is deliberately last, after the faster gates pass, and the
configured acceptance target is 100% effective mutations.

A focused Stryker file/range run is a diagnostic replay, not a complete score.
Do not merge separate scoped results into a release claim; the final evidence
must be one current full configured mutation run.

Installed GSD capability/hook/Workstream checks, native Graphify operations and
product-specific tests are separate orchestration preflight lanes. They are not
hidden inside this portable dependency boundary and do not contribute to its
coverage or mutation score.

The Backlog terminal board and local web dashboard are operator surfaces, not
test runners. Start them from the repository root with
`npm run agent-runtime:backlog:board` or
`npm run agent-runtime:backlog:browser`; use
`npm run agent-runtime:backlog:list` for a bounded read-only availability
check. The package pin is owned once by `../backlog-package.json`.
