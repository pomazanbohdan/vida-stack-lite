# Portable `vida-agent` runtime

Owner: runtime maintainers. Verification requirements are in [TESTING.md](TESTING.md). The installed `vida-agent/` bundle is selected by the repository's active runtime selector after cutover; installation alone does not switch that selector.

## Target bundle and state

The `vida-agent/` bundle contains runtime source and output, entrypoints, schemas, generic instructions, neutral templates, documentation, tests, tooling, package manifest, and pinned lockfile. It declares and checks external prerequisites. Project requirements, configuration values, work records, and history stay outside the bundle. Root `agent-runtime.config.v1.yaml` is the sole effective settings authority; the generated root `AGENTS.md` and project-owned `AGENT.sidecar.md` point to the active bundle. Templates initialize missing files without overwriting project values.

The migration transfers runtime behavior and effective project configuration only. The old runtime and pre-cutover `.agent/work/` and `.agent/coordination/` state are archived byte-for-byte as inactive provenance. The new runtime starts with clean work and coordination state. Old tasks, tickets, leases, approvals, reviews, and Runtime receipts are not converted, continued, rebound, or accepted in the new state. The old root JSON config and schema are retired at cutover, leaving no parallel configuration authority.

Production readers use one strict current v1 contract per active artifact type. Before changing any current-v1 schema while active new-runtime artifacts exist, implement and ship one functional bundle-owned artifact repair command that covers affected files and dependencies, with atomic application and recovery. Until that command exists, a schema change must stop before altering active artifacts. The old-state migrator is repository-only, excluded from the production package, and has no cutover role. No production legacy export, historical converter, or active import of `agent-runtime/` belongs in the bundle.

## Agent execution boundary

The active agent transport is the collaboration tools available inside the orchestrating session: spawn or follow up, send, wait, and request interruption. Interruption is not proof of termination. The local `bin/run.mjs` CLI uses a LibSQL-backed Mastra snapshot as the sole configured stage owner and a compare-and-swap session ledger for issued actions and observations. The session issues a ready wave with `--issue-wave true` and the returned `state_version` before invoking native tools, then reports each observed result with the latest version. An issued action with an uncertain outcome cannot be automatically reissued; the session must reconcile the actual native outcome. The CLI cannot invoke those tools on its own or keep agents running after the session exits.

Reports are bounded consistency input, not native-tool attestation. Fresh local work admission binds accepted scope and acceptance files, an actual session handle, configuration and exact source paths to the existing HostState work/ticket/lease CAS. A source-writing assignment needs that live lease and a narrowly scoped, attributable `source.write` authorization; its HostState attempt is reserved before the native action is exposed, then completed from a matching observed result. This does not approve `delivery.execute` or user Runtime acceptance. The CLI does not call an external provider, Desktop/API, App Server, MCP, plugin, or host service.

User and external processes may edit repository files. The CLI rereads declared source and configured-context paths at issue, report, validation and test/delivery preparation boundaries; changed bytes invalidate affected proof unless they are the admitted writer's reported in-scope output. These cooperative checks do not attribute an edit made by another actor during the same write interval, detect changes outside declared paths, or provide physical filesystem exclusion. The current native write witness and source tests cover bounded paths, not complete cutover assurance.

All five configured workflows use the same Mastra session bridge. A configured developer action receives deterministic local context and exact hashes; official references remain explicitly unfetched. The CLI derives a development packet from admitted scope and real persisted prerequisite evidence, and derives an implementation result from a completed source-write attempt. A research-producing workflow currently blocks validator issue until a genuine current `ResearchResult/v1` artifact is recorded; its Windows recorder/classification path is unresolved. In the research-free `task_execution` path, structured validator and tester reports are rechecked against configured action IDs and current source bytes before the trusted receipt authority rebuilds receipts from the persisted journal. The CLI prepares a `DeliveryInstruction/v1` from an observed delivery proposal and those current receipts; it does not execute delivery. An injected crash before native issue stays blocked until the local session supplies positive no-invocation and quiescence evidence; explicit reconciliation then advances the same ticket to a new lease generation before one retry. A bounded fixture used actual read-only Luna validator/tester calls, with prerequisite synthesis/developer steps marked TEST SETUP. Full assurance, user acceptance and activation remain open.

## Verification

Run the installed-bundle check from the copied bundle directory with the declared Bun 1.4.2. It uses only shipped source, generic tests, tooling, configuration, and the frozen lockfile:

```text
bun run verify
```

`verify` copies the bundle to an unrelated temporary project, installs its frozen dependencies, initializes root files, and prepares a no-provider public-run action before running its portable static and generic test subset. Its final-payload result remains to be measured. `GAP-VIDA-PORTABLE-RELEASE-001` records the absent isolated installed-bundle evidence for aggregate 100% coverage/mutation and `CRAP < 5`. The user permits those numeric targets to remain measured, owned post-cutover GAPs for the first switch; they remain the ultimate quality targets. Differential and parity require the repository's old-runtime and contract corpora; the installer subprocess and Bun-native matrices remain candidate-development evidence, so those checks stay outside portable verification.

Run this full development matrix only from the candidate repository. `package.json` defines these checks; their presence is not a pass receipt.

```text
bun run preflight
bun run typecheck
bun run test
bun run test:pack
bun run test:differential
bun run test:parity
bun run test:coverage
bun run coverage:gate
bun run crap
bun run test:mutation
bun run quality:static
bun run format:check
```

The complete matrix, genuine session tool observation, portable install, archive/cutover recovery and current-version assurance are specified in [TESTING.md](TESTING.md). The cutover `execute` command requires `--activation-decision .agent/cutover/<cutover-id>/activation-decision.v1.json` bound to the inspected plan, payload manifest and projected selector intent, with six separately hashed evidence files. Its byte checks do not authenticate DEV/UAT observations or close the Cedar/Edictum and source-drift enforcement GAPs. Source and passing tests provide Code/Static evidence; they do not establish delivered Runtime behavior or user acceptance.
