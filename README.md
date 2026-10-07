# VIDA

**A configurable development runtime, with a Codex interface for project work.**

VIDA connects project requirements, system specifications, implementation and
verification in a configured workflow. It keeps project settings and work
history separate from the reusable runtime.

## Products

| Product | Purpose | Location |
| --- | --- | --- |
| **Vida Agent** | Standalone CLI and development-workflow runtime | [packages/agent](packages/agent) |
| **Vida Codex** | Codex integration for workspace tools, project views and agent interaction | [packages/plugin](packages/plugin) |

The visible product names differ from the stable internal project IDs:
`agent` and `plugin`.

### Current status

VIDA is under active development. Vida Agent has a native delivery path and a
maintained Windows installer. The current development work includes recovery,
task continuation and integration of checks before source-writing actions.

Vida Codex is being prepared for integration. Its current source workspace does
not yet provide a complete public installation guide. Prototype or local
transport checks do not establish installed Codex-host readiness.

Use the [installation guide](packages/agent/docs/installation.md) for the
supported delivery route. A source version, build artifact or installed version
alone does not prove that a particular project is ready to resume work.

## What Vida Agent provides

- A repository-owned configuration for projects, workflow selection and roles.
- A CLI that prepares work, issues configured actions and accepts observed results.
- Work identity, file ownership and revision checks to coordinate source changes.
- Evidence checks between implementation, verification and delivery.
- Explicit handling of blocked work and uncertain action outcomes.
- Package-owned schemas, instructions and templates, separate from consumer data.

The active agent session executes the issued tools. The CLI does not launch
external providers or keep background agents running after that session exits.

## Getting started

### Install the runtime

Vida Agent is distributed as a **standalone native executable** with embedded
Bun. Consumer use does not require installing Node.js, npm or Bun. npm SDK
exports serve in-process library integrations and are not the public agent
installation route.

For Windows, use the maintained
[PowerShell installer](packages/agent/tooling/install-windows.ps1) with the
selected qualified executable or ZIP. From this repository's root:

```powershell
$artifact = Read-Host "Full path to the selected qualified Vida Agent EXE or ZIP"
.\packages\agent\tooling\install-windows.ps1 -Action install -Source $artifact
```

Use `-Action update` to update an existing installation. The
[installation guide](packages/agent/docs/installation.md) explains artifact
selection, update, recovery and destinations. Check qualification and platform
metadata before choosing an artifact; do not substitute an arbitrary local build.

Open a new terminal if needed to pick up the user PATH change, then inspect the
installed command:

```powershell
vida-agent version
vida-agent --help
```

### Set up a new consumer project

Run initialization only for a project you intend to configure. The example
below uses a new consumer directory, not this source repository:

```powershell
$projectRoot = "C:\work\my-project"
vida-agent init --project-root $projectRoot --repository my-project --project app=.
vida-agent instructions --path development-lifecycle
```

Read the returned lifecycle instruction. Project requirements and configuration
belong in that consumer project; runtime implementation remains in the installed
package. Initialization does not authorize source changes or continue another
owner's historical work.

### Continue configured work

Use the current project's configured workflow and the next action returned by
the runtime. Scope inspection and action reports provide evidence; they do not
grant approval or user acceptance. If an issued action has an uncertain outcome,
inspect and reconcile it rather than issuing it again.

For `GAP-VIDA-RUN-CONTEXT-001`, inspect project initialization and configured
package resources using the supported route described in the installation and
lifecycle documentation. Preserve existing work and configuration while
resolving the cause.

## Documentation

| Topic | Reference |
| --- | --- |
| Runtime behavior and boundaries | [System specification](packages/agent/docs/system-specification.md) |
| Installation and update | [Installation guide](packages/agent/docs/installation.md) |
| Development lifecycle | [Lifecycle instruction](packages/agent/instructions/development-lifecycle.md) |
| Runtime verification | [Testing policy](packages/agent/TESTING.md) |
| Agent package details | [Agent README](packages/agent/README.md) |
| Project source map and authority | [AGENT.sidecar.md](AGENT.sidecar.md) |

## Source development

Consumer requirements differ from source-tooling requirements. For agent
development, the current [package manifest](packages/agent/package.json) declares
Node.js **24.19.0**, npm **11.x** and Bun **1.4.2**. Use the maintained lockfile
and package tooling.

Run agent development checks from `packages/agent`. For example, with the
declared development tools available:

```powershell
Set-Location packages/agent
npm test
```

Choose the applicable checks from [TESTING.md](packages/agent/TESTING.md).
The presence of a script is not evidence that it passed. Build and installation
belong to the delivery pipeline; they do not repeat development test suites.

### Contributing

Start with the relevant product specification and repository instructions.
Describe the intended behavior, keep changes scoped and include the applicable
development evidence. Keep useful documentation aligned with the implementation.

Project-specific requirements belong in the sidecar and their existing source
documents. The root `AGENTS.md` is managed by the runtime. Preserve unrelated
work, stable project IDs and historical evidence.

## Repository layout

```text
packages/
  agent/       Runtime, public CLI, schemas, instructions and tests
  plugin/      Vida Codex product workspace
tooling/agent/ Repository-side release and CI evidence tooling
.github/       CI workflows
AGENT.sidecar.md Project-owned source and authority map
```

## License

[MIT](LICENSE) — Copyright © 2026 Pomazan Bohdan.
