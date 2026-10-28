# vida-stack-lite security model

Owner: repository owner. Class: living threat model used to triage security scan findings.
Status: draft derived from the code. Items marked *assumption* have not been confirmed by the owner yet.

## System overview

VIDA Agent (`packages/agent`) is a local development-workflow runtime: a CLI (`vida-agent`, distributed as a standalone native executable with embedded Bun) that a developer or an active agent session runs against a *consumer project*. It prepares work, issues configured actions, accepts observed results, and gates source writes with work identity, file ownership, CAS revision checks, Cedar authorization and Edictum governance. State lives in local SQLite (host-state / workspace DB). The CLI does not run a network server and does not launch external providers or background agents (README "What Vida Agent provides").

`packages/plugin` (Vida Codex) is a placeholder: only `package.json`, no code.

## Components

| Name | Covers |
| --- | --- |
| **CLI** | `packages/agent/bin/**` (public `vida-agent.ts` dispatcher, `run.ts`, `init.ts`, repair/reconcile/recover entrypoints, `bun.ts` pinned-Bun launcher, `standalone*.ts`) |
| **Authorization & Governance** | `packages/agent/src/authorization/**` (Cedar), `src/governance/**` (Edictum, operation policy, approval consumption), `src/contracts/**` (public ingress, envelopes, AJV schemas), `packages/agent/schemas/**` |
| **Host State & Orchestration** | `src/host-state.ts`, `src/runtime-kernel.ts`, `src/trusted-host.ts`, `src/orchestration/**` (Mastra bridge, session ledger, local source authorization, observed results, recovery/continuation) |
| **Project Config & Filesystem** | `src/config/**` (runtime/project config loading, project paths, `safe-repository-access.ts` with `@openclaw/fs-safe`, workspace DB, project upgrade/activation, service-operation custody), `src/workspace-identity.ts`, `src/runtime-initialization.ts` |
| **Documentation Lifecycle** | `src/documentation/**` (CLEAR/DocFlow policy, transitions, journals) |
| **Release & Installation** | `.github/workflows/agent-native-delivery.yml`, `tooling/agent/**` (release-local, release-assurance, release-ci-evidence, native-ci-delivery), `packages/agent/tooling/install-windows.ps1`, `bin/install.ts`, `tooling/build-standalone.ts`, `tooling/pack-sdk.ts`, `bin/local-release-artifacts.ts`, `bin/release-preparation.ts` |
| **Quality Tooling** | `packages/agent/tooling/**` other than release/install (coverage, mutation, CRAP, preflight, quality gates), `packages/agent/tests/**`, `tests/**`, `.githooks/**` |

## Trust boundaries and entry points

1. **Consumer project → CLI.** `--project-root`, `agent-runtime.config.v1.yaml`, `AGENT.sidecar.md`, project configuration, work files under `.agent/work/`, and arbitrary repository files/symlinks. Reached by whoever authored the project being operated on. Controls: AJV schema validation (`schemas/*.json`), `safe-repository-access.ts` / fs-safe (no-symlink parents, root-relative opens, `renameNoReplace`), `lstat` regular-file checks (e.g. `instructionResult` in `bin/vida-agent.ts`).
2. **Agent session → CLI.** Caller-reported observations, results, evidence, approval evidence, governed-write intents (`src/orchestration/observed-*.ts`, `admitted-*`, `contracts/public-ingress.ts`). The lifecycle explicitly separates native observations from caller-reported data; an LLM-driven session may be steered by prompt injection from project content.
3. **Local filesystem / SQLite.** Host-state and workspace databases (`bun-sqlite-client.ts`, `workspace-database*.ts`, `host-state.ts`), WAL/SHM, lock files, staging dirs. Reached by any process running as the same OS user.
4. **Child processes.** `spawnSync` of pinned Bun / entrypoints (`bin/vida-agent.ts`, `bin/bun.ts`, `bin/install.ts`, `service-operation-custody.ts`), quality tooling running tests/mutants.
5. **Release chain.** `workflow_dispatch` with `request` JSON + `source_commit` inputs (requires repo write/dispatch rights), pinned actions, `bun install --frozen-lockfile --ignore-scripts`, Actions cache, produced EXE + manifest, then `install-windows.ps1` (SHA-256 manifest check, receipt, user PATH change).
6. **Dependencies.** `@mastra/*`, `@cedar-policy/cedar-wasm`, `@openclaw/fs-safe` (with integrity attestation in `fs-safe-attestation.ts`), `ajv`, `yaml`, `@babel/parser`.

## Assets

- **Integrity of source-write gating** — that no write happens outside an authorized, owned, CAS-checked scope (Cedar receipts, approval evidence, work-state). *assumption: highest-value asset.*
- **Developer machine** — no code execution or writes outside the project root from project content or agent-reported data.
- **Release artifact integrity** — the native EXE users install, its manifest, and the CI evidence chain.
- **Workspace / host-state data** — work history, coordination ledger, receipts; mostly integrity, low confidentiality.
- **CI secrets** — `GITHUB_TOKEN` (read-only `actions`/`contents` permissions declared).

## Attacker profiles (*assumptions, unconfirmed*)

- **A1 Malicious project content** — a cloned or contributed repo whose config/files/symlinks try to escape the project root, bypass gates, or execute code.
- **A2 Untrusted agent output** — an agent session (possibly prompt-injected) reporting forged observations, evidence, or approvals to obtain unauthorized writes or delivery acceptance.
- **A3 Supply-chain / release tampering** — compromised dependency, Actions cache poisoning, or manipulated dispatch inputs leading to a tampered artifact.
- **A4 Other local user** — another OS account on a shared machine racing temp/staging files or DBs.
- Not considered: a same-user attacker who already controls the account (can do anything the CLI can) — *assumption*.

## Existing controls

Schema validation everywhere at ingress (AJV 2020, zod); canonical JSON digests; Cedar policy evaluation with receipts; Edictum pre/post conditions; CAS on SQLite rows; fs-safe root-confined I/O with symlink refusal and integrity-attested native binding; pinned Bun and pinned action SHAs; `--ignore-scripts` installs; installer SHA-256 + manifest/receipt checks; workflow refuses mismatched repository/commit and reparse points.

## Out of scope / accepted risk

Nothing confirmed by the owner yet. Candidates: dev/quality tooling and tests; same-user local attacker; `packages/plugin`.

Infrastructure: there is no separate infrastructure repository; deployment is the GitHub Actions workflow and the Windows installer only.

## Open questions

- Which attackers matter (A1–A4)? Which assets matter most?
- Is `packages/agent/tooling` + tests in scope, or developer-only and accepted?
- Is Linux/macOS native delivery planned, or Windows-only?
