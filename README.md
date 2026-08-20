# Vida Stack Lite

Vida Stack Lite is a portable, host-neutral development-agent runtime. It
provides typed lifecycle gates, compare-and-swap checkpoint transitions,
scoped coordination, independent review contracts, evidence classification and
reproducible quality tooling for software repositories.

This repository contains the reusable agent system only. It intentionally does
not contain a product implementation, tenant data, business requirements,
customer information, environment credentials or platform-specific source.

## What is included

- `agent-runtime/` — lifecycle library, typed schemas, capability metadata,
  command-line adapters, instructions and test tooling.
- `tests/agent-runtime/` — repository-boundary contract checks.
- `AGENTS.md` — generic orchestration policy.
- `AGENT.sidecar.md` — an intentionally unconfigured project-sidecar template.
- `docs/` and `templates/` — empty, neutral places for a future project to add
  its own documentation and source map.

## Quick start

Requirements: Git, Node.js 24.x, npm 11.x and PowerShell 7+ on Windows.

```powershell
npm --prefix agent-runtime/tooling ci
npm --prefix agent-runtime/tooling test
```

The release-quality gate is intentionally explicit:

```powershell
npm --prefix agent-runtime/tooling run verify
```

It runs contracts, the complete test suite, coverage, CRAP, lint, typecheck,
dependency audits and the full mutation gate. Generated reports and runtime
state stay outside the portable source tree under ignored derived directories.

## Installing the optional host capability

`script/Install-AgentDevelopmentRuntime.ps1` and
`script/Invoke-AgentDevelopmentRuntime.ps1` integrate the runtime with a
trusted managed host stack. They are optional host adapters; the portable npm
tests do not require that stack. The installer never creates product
requirements or root-level project-management documents.

## Project binding boundary

Before using the runtime for a real project, populate `AGENT.sidecar.md` with
that project's authoritative business/system/code sources and validation
commands. Keep those sources in the consuming project. Do not copy product
Wiki pages, raw logs, evidence, credentials or generated runtime state into
this repository.

## Status

The repository is a source distribution of the agent runtime. Product behavior
and environment acceptance belong to the consuming repository and are never
claimed by this portable package.
