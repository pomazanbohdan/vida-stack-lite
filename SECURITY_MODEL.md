# vida-stack-lite security model

Owner: repository owner. Class: derived scan-triage input, not an authority.
Authoritative security behavior lives in `packages/agent/docs/system-specification.md`
(agent) and `packages/plugin/docs/` (plugin), per `AGENT.sidecar.md`. When this file and
the specification disagree, the specification wins: change the specification first, then
reconcile this file. This file only records how scan findings are triaged against it.
Status: draft derived from the code. Items marked *assumption* have not been confirmed by the owner yet.

## System overview

VIDA Agent (`packages/agent`) is a local development-workflow runtime with two public surfaces:

- the CLI (`vida-agent`, distributed as a standalone native executable with embedded Bun), run by a developer or an active agent session against a *consumer project*;
- the in-process SDK (`vida-agent` npm package, exports `.` and `./trusted-host`), imported by library callers.

It prepares work, issues configured actions, accepts observed results, and gates source writes with work identity, file ownership, CAS revision checks, Cedar authorization and Edictum governance. State lives in local SQLite (host-state / workspace DB). It runs no network server and launches no external providers or background agents (README "What Vida Agent provides").

**Trust assumption (system specification, "Authority and responsibilities").** Local execution assumes a trusted orchestrating session and its observed built-in tool results. `LocalSourceWriteAuthorization/v1` is a scoped cooperative declaration: the CLI checks its consistency with the work, writer, scope, lease and policy/CAS bindings, but it does not authenticate the human directive, and an owner string or JSON report is not authenticated caller authority. The gates therefore protect against inconsistent or forged *reported content*. They cannot physically stop a compromised session, which can modify Source directly with its own filesystem tools.

`packages/plugin` (Vida Codex) currently holds only `package.json`. Its planned shape (research records under `docs/agent-instructions/research/records/codex-*`, `plugin-*`) is a Codex plugin manifest (`.codex-plugin/plugin.json`) with a local MCP server (`.mcp.json`) exposing configured reads, public `init` and a local workspace preview. Model it once code lands.

## Components

| Name | Covers |
| --- | --- |
| **CLI** | `packages/agent/bin/**` (public `vida-agent.ts` dispatcher, `run.ts`, `init.ts`, repair/reconcile/recover entrypoints, `bun.ts` pinned-Bun launcher, `standalone*.ts`) |
| **SDK** | `packages/agent/src/index.ts` (public exports, including `createRuntimeKernel` / `RuntimeKernel` governed-write paths), `src/lifecycle/**` (`runtime-facade.ts`, `lifecycle-state.ts`), `src/trusted-host.ts` (`./trusted-host` export) |
| **Authorization & Governance** | `packages/agent/src/authorization/**` (Cedar), `src/governance/**` (Edictum, operation policy, approval consumption), `src/contracts/**` (public ingress, envelopes, AJV schemas), `packages/agent/schemas/**` |
| **Host State & Orchestration** | `src/host-state.ts`, `src/runtime-kernel.ts`, `src/orchestration/**` (Mastra bridge, session ledger, local source authorization, observed results, recovery/continuation, controller observations) |
| **Project Config & Filesystem** | `src/config/**` (runtime/project config loading, project paths, `safe-repository-access.ts` with `@openclaw/fs-safe`, workspace DB, project upgrade/activation, service-operation custody), `src/workspace-identity.ts`, `src/runtime-initialization.ts` |
| **Documentation Lifecycle** | `src/documentation/**` (CLEAR/DocFlow policy, transitions, journals) |
| **Release & Installation** | `.github/workflows/agent-native-delivery.yml`, release tooling in `tooling/agent/**` (release-local, release-assurance, release-ci-evidence, native-ci-delivery), `packages/agent/tooling/install-windows.ps1`, `bin/install.ts`, `tooling/build-standalone.ts`, `tooling/pack-sdk.ts`, `bin/local-release-artifacts.ts`, `bin/release-preparation.ts` |
| **Codex Host Tooling** | `.codex/**` (`config.toml` project MCP registration of `lean-ctx`, `cloud-environment.patch.json` startup script, `cloud-tooling.lock.json`), `tooling/agent/cloud-tooling-setup.ts`, `cloud-tooling-check.ts`, `cloud-tooling-contracts.ts`, `cloud-pstack-setup.ts` |
| **Quality Tooling** | `packages/agent/tooling/**` other than release/install (coverage, mutation, CRAP, preflight, quality gates), `packages/agent/tests/**`, `tests/**`, `.githooks/**` |

## Trust boundaries and entry points

1. **Consumer project → CLI/SDK.** `--project-root`, `agent-runtime.config.v1.yaml`, `AGENT.sidecar.md`, project configuration, work files under `.agent/work/`, `.codex/skills/*/SKILL.md` references, and arbitrary repository files/symlinks. Reached by whoever authored the project. Controls: AJV schema validation, `safe-repository-access.ts` / fs-safe (no-symlink parents, root-relative opens, `renameNoReplace`), `lstat` regular-file checks (e.g. `instructionResult` in `bin/vida-agent.ts`).
2. **Trusted orchestrating session vs. the content it reports.** The session/controller is trusted (see trust assumption). Untrusted are the observations, results, evidence, approval evidence and governed-write intents it relays (`src/orchestration/observed-*.ts`, `admitted-*`, `contracts/public-ingress.ts`), which may be shaped by prompt injection from project content. Native observations stay distinct from caller-reported data.
3. **SDK caller → library.** Arguments to public exports (`src/index.ts`, `src/lifecycle/**`, `RuntimeKernel` governed writes, `./trusted-host`). The same validation and cooperative-authorization limits as the CLI apply; the caller's process is not isolated from the library.
4. **Local filesystem / SQLite.** Host-state and workspace databases (`bun-sqlite-client.ts`, `workspace-database*.ts`, `host-state.ts`), WAL/SHM, lock files, staging dirs, and retained controller observations under `<controllerRoot>/observations/`. Reached by any process running as the same OS user, and by other users wherever host filesystem permissions allow; the portable core enforces no OS-principal confidentiality.
5. **Child processes.** `spawnSync` of pinned Bun / entrypoints (`bin/vida-agent.ts`, `bin/bun.ts`, `bin/install.ts`, `service-operation-custody.ts`), controller children, quality tooling running tests/mutants.
6. **Release chain.** `workflow_dispatch` with `request` JSON + `source_commit` inputs (requires repo write/dispatch rights), pinned actions, `bun install --frozen-lockfile --ignore-scripts`, Actions cache, produced EXE + `manifest.json`, then `install-windows.ps1` (receipt, user PATH change).
7. **Codex cloud host provisioning.** The startup patch downloads Bun and tools over HTTPS and verifies SHA-256 against `.codex/cloud-tooling.lock.json`; it edits the user's shell profile. `cloud-pstack-setup.ts` adds the Pstack (`github.com/arjitj2/open-pstack`) and Superpowers (`github.com/obra/superpowers`) Git marketplaces via `codex plugin`, without pinning a commit, then installs Pstack's production dependencies with `--ignore-scripts`. Its startup hook must be trusted manually in the Codex `/hooks` UI. `.codex/config.toml` starts the `lean-ctx` MCP server with `LEAN_CTX_PATH_JAIL_SCOPE = "project"`.
8. **Dependencies.** `@mastra/*`, `@cedar-policy/cedar-wasm`, `@openclaw/fs-safe` (integrity attestation in `fs-safe-attestation.ts`), `ajv`, `yaml`, `@babel/parser`.

## Assets

- **Integrity of source-write gating against reported content.** No write is accepted outside an authorized, owned, CAS-checked scope on the strength of forged or inconsistent reports (Cedar receipts, approval evidence, work-state). *assumption: highest-value asset.*
- **Developer machine.** No code execution and no writes outside the project root from project content, reported data or SDK arguments.
- **Retained controller observations (confidentiality).** `<controllerRoot>/observations/` keeps the full executable, arguments, working directories and complete stdout/stderr of controller children, which may contain sensitive text (system specification, controller observations). Readers: the controller and any principal the host filesystem lets in.
- **Release artifact integrity.** The native EXE users install and the CI evidence chain.
- **Workspace / host-state data.** Work history, coordination ledger, receipts: mainly integrity. Confidentiality as for observations where they hold captured text.
- **Codex host integrity.** The cloud development host and its installed plugins/MCP servers.
- **CI secrets.** `GITHUB_TOKEN` (read-only `actions`/`contents` permissions declared).

## Attacker profiles (*assumptions, unconfirmed*)

- **A1 Malicious project content.** A cloned or contributed repo whose config/files/symlinks try to escape the project root, bypass gates, or execute code.
- **A2 Untrusted reported content.** Prompt-injected or forged observations, evidence or approvals relayed through a session, aiming for writes, review or delivery acceptance the gates should refuse. A fully compromised session that writes Source directly is outside what the gates can stop (accepted by the specification's trust assumption).
- **A3 Supply-chain / release tampering.** A compromised dependency or Git marketplace plugin, Actions cache poisoning, manipulated dispatch inputs, or a substituted EXE/ZIP in transit or at rest.
- **A4 Other local user.** Another OS account on a shared machine reading observations or racing temp/staging files and DBs.
- **A5 Untrusted SDK caller.** Library code passing crafted inputs to public exports.
- Not considered: a same-user attacker who already controls the account (can do anything the CLI can). *assumption*

## Existing controls

Schema validation at ingress (AJV 2020, zod); canonical JSON digests; Cedar policy evaluation with receipts; Edictum pre/post conditions; CAS on SQLite rows; fs-safe root-confined I/O with symlink refusal and an integrity-attested native binding; pinned Bun and pinned action SHAs; `--ignore-scripts` installs; lock-pinned SHA-256 for Codex cloud tool downloads; manual Codex hook trust; workflow refuses mismatched repository/commit and reparse points; bounded, redacted public CLI diagnostics.

**Installer manifest is a consistency check only.** `install-windows.ps1` checks the EXE against the SHA-256 in `manifest.json`, but that manifest ships inside the same ZIP (or next to the EXE) and is unsigned. It binds bytes to the Windows x64 target and detects corruption; it does not authenticate the publisher ("A byte digest is not publisher authentication", system specification). Publisher/provenance authentication (code signing, signed attestations) is an open control gap, so artifact-substitution findings stay open.

## Out of scope / accepted risk

- Direct Source modification by a compromised trusted session (specification trust assumption).
- Candidates, not confirmed by the owner yet: dev/quality tooling and tests; same-user local attacker; `packages/plugin` until it has code.

Infrastructure: there is no separate infrastructure repository. Deployment is the GitHub Actions workflow and the Windows installer; development hosts use the Codex cloud setup above.

## Open questions

- Which attackers matter (A1–A5)? Which assets matter most?
- Is `packages/agent/tooling` + tests in scope, or developer-only and accepted?
- Should Git marketplace plugins be pinned to a commit, and is release signing planned?
- Is Linux/macOS native delivery planned, or Windows-only?
