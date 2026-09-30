# VIDA agent and plugin source repository

This project-owned sidecar configures the existing Git repository. It is not a
portable runtime instruction owner. The repository has exactly two products:
`agent` at `packages/agent` and `plugin` at `packages/plugin`.

## Source and ownership map

| Layer or concern | Authoritative source | Owner |
|---|---|---|
| Repository layout and distribution intent | Current attributable user decision in `.agent/work/npm-agent-migration-20260930/WORK.md` | Repository owner |
| Agent system behavior | `packages/agent/docs/system-specification.md` | Agent maintainer |
| Agent lifecycle and verification | `packages/agent/instructions/`, `packages/agent/TESTING.md` | Agent maintainer |
| Agent installation guide | `packages/agent/docs/installation.md` (derived guide, not a second specification) | Agent maintainer |
| Agent research evidence | `packages/agent/docs/research/` (facts and open questions, not runtime receipts) | Agent maintainer |
| Agent implementation and executable evidence | `packages/agent/src/`, `packages/agent/bin/`, `packages/agent/schemas/`, `packages/agent/tests/`, `packages/agent/tooling/` | Agent maintainer |
| Plugin business intent | `packages/plugin/docs/business-requirements.md` | Plugin owner |
| Plugin system behavior | `packages/plugin/docs/system-specification.md` | Plugin owner |
| Plugin acceptance | `packages/plugin/docs/acceptance.md` | Plugin owner |
| Plugin code and verification | `packages/plugin/`, as declared by its current system specification | Plugin owner |
| Repository-only migration verification | `tooling/agent/`, `tests/agent/` | Agent maintainer |
| Project registry and configuration | Root `agent-runtime.config.v1.yaml` and bound documentation policy | Repository owner |

Plugin canonical documents are filled by the Plugin owner under a fresh scope.
Their absence is an explicit setup gap, not permission to import old work as law.
One writer owns overlapping shared root configuration and workspace files.

## Runtime and distribution

- Source package: `packages/agent`, npm name `vida-agent`.
- Consumer execution uses the globally installed npm CLI on PATH. A local npm
  tarball is the initial distribution; npm publication is outside this work.
- Package-owned schemas, templates and instructions resolve from the installed
  package. Project YAML, products and operational state resolve from explicit
  consumer `--project-root`; consumers do not contain copied agent source.
- Repository projects are `agent=packages/agent` and `plugin=packages/plugin`.
- Root agent instructions are generated from the maintained package template.
- Work and coordination live under `.agent/`; scratch and asynchronous output
  live under `.tmp/`, outside sealed package payloads. Measure control latency
  separately from actual elapsed execution time.

## Validation and safety

Agent checks are owned by `packages/agent/TESTING.md` and its package scripts.
Use the pinned Bun launcher for build, type/static/format, ordinary, packed,
extracted and retained behavior checks. Numeric quality gaps remain explicit;
Static evidence never grants Runtime acceptance. Plugin commands are declared
by its owner after the product specification is present.

Preserve `.git`, history, origin and unrelated files. The predecessor runtime
is inactive provenance in `.tmp/archive`, never an active fallback. Do not
merge predecessor schemas or code into the current product. Existing consumer
v10 remains until the npm package, public CLI and fenced artifact repair are
verified. Existing tasks are retained as inactive provenance, not migrated.
