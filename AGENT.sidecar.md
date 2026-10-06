# VIDA agent and plugin source repository

This project-owned sidecar configures the existing Git repository. It is not a
portable runtime instruction owner. The repository has exactly two products:
`agent` at `packages/agent` and `plugin` at `packages/plugin`.

## Source and ownership map

| Layer or concern                             | Authoritative source                                                                                                              | Owner            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Repository layout and distribution intent    | Current attributable user decision in `.agent/work/core-cloud-continuation-20261002/WORK.md#native-only-public-delivery-decision` | Repository owner |
| Agent system behavior                        | `packages/agent/docs/system-specification.md`                                                                                     | Agent maintainer |
| Agent lifecycle and verification             | `packages/agent/instructions/`, `packages/agent/TESTING.md`                                                                       | Agent maintainer |
| Agent installation guide                     | `packages/agent/docs/installation.md` (derived guide, not a second specification)                                                 | Agent maintainer |
| Agent research evidence                      | `packages/agent/docs/research/` (facts and open questions, not runtime receipts)                                                  | Agent maintainer |
| Agent implementation and executable evidence | `packages/agent/src/`, `packages/agent/bin/`, `packages/agent/schemas/`, `packages/agent/tests/`, `packages/agent/tooling/`       | Agent maintainer |
| Plugin business intent                       | `packages/plugin/docs/business-requirements.md`                                                                                   | Plugin owner     |
| Plugin system behavior                       | `packages/plugin/docs/system-specification.md`                                                                                    | Plugin owner     |
| Plugin acceptance                            | `packages/plugin/docs/acceptance.md`                                                                                              | Plugin owner     |
| Plugin code and verification                 | `packages/plugin/`, as declared by its current system specification                                                               | Plugin owner     |
| Repository-only migration verification       | `tooling/agent/`, `tests/agent/`                                                                                                  | Agent maintainer |
| Repository-only CI evidence join             | `tooling/agent/release-ci-evidence.mjs` and its trusted session/controller observation boundary                                   | Agent maintainer |
| Native build artifact and Windows install/update/uninstall delivery | `.github/workflows/agent-native-delivery.yml`, `tooling/agent/native-ci-delivery.mjs`, `packages/agent/tooling/install-windows.ps1` | Agent maintainer |
| Project registry and configuration           | Root `agent-runtime.config.v1.yaml` and bound documentation policy                                                                | Repository owner |

Plugin canonical documents are filled by the Plugin owner under a fresh scope.
Their absence is an explicit setup gap, not permission to import old work as law.
One writer owns overlapping shared root configuration and workspace files.

## Runtime and distribution

- Source package: `packages/agent`, npm name `vida-agent`.
- Primary consumer installation is one native executable per supported OS/CPU,
  embedding pinned Bun 1.4.2. Direct installation and first run require no
  external Node, npm or Bun and no runtime download. This executable is the only
  public agent delivery. Existing public SDK exports remain library interfaces;
  Public agent CLI installation through npm is not supported; npm artifacts
  serve SDK library imports only.
  Native delivery requires the formation and installation evidence defined by the lifecycle owner. The build-only Windows artifact provides formation and availability. The
  maintained PowerShell adapter provides physical install/update/uninstall from
  a selected EXE/ZIP or direct HTTPS URL. Neither supplies native qualification,
  Runtime acceptance or a public registry release.
- Package-owned schemas, templates and instructions resolve from the installed
  package. Project YAML, products and operational state resolve from explicit
  consumer `--project-root`; consumers do not contain copied agent source.
- Repository projects are `agent=packages/agent` and `plugin=packages/plugin`.
- Root agent instructions are generated from the maintained package template.
- Work and coordination live under `.agent/`; scratch and asynchronous output
  live under `.tmp/`, outside sealed package payloads. Measure control latency
  separately from actual elapsed execution time.

## Source package Git policy

The Source repository owner's standing authorization permits ordinary non-force
publication of the exact reviewed Source payload. Publish changed Source before
its CI formation. Preserve unrelated staged files, Git history and remote state.
Use the declared Source/commit byte binding at CI ingress. An unchanged selected
artifact needs no new Source publication solely for installation. Git authority
is not user Runtime acceptance or permission to rewrite consumer configuration.

Formation, qualification and installation sequencing has one owner:
the installed development-lifecycle instruction's self-development protocol.
This sidecar supplies locations and repository exceptions, not a second set of
qualification gates. Preserve original operations and failed/UNKNOWN custody.
The current Windows physical entry is packages/agent/tooling/install-windows.ps1.
The separate GitLab runner target remains unanswered.

## Validation and safety

Development checks are owned by packages/agent/TESTING.md and its package scripts.
Formation and installation run no test suites. The manual Windows workflow runs
native-build, emits exact artifact/provenance/integrity metadata and publishes it.
The approved provider, selected Source and repository-variable controls remain.
Use the lifecycle owner's minimum delivery profile; a historical explicit profile
retains its declared requirements. Formation proof is not installed or accepted
Runtime evidence. Do not repeat tests, reviews or DocFlow solely to install.

GitHub retrieval is a replaceable repository adapter, not a runtime prerequisite.
Its approved workflow/repository/check policy and optional ZIP-reader capability
require separate qualification; no ambient credential or provider is selected.
The explicit downloader reserves a bounded exclusive transport, binds the
selected published commit and attempt job interval, and never forwards its API
credential to artifact storage. Missing/drifting locked ZIP capability remains a
GAP without installation. Latest package/tool policy belongs to the lifecycle
self-development owner. For 0.1.3, broad dependency/tool and caller adaptation
has last priority, after native UPDATE01/developer-unblocking work and required
installed checkpoints, before final 0.1.3 delivery and acceptance. Current exact
qualified pins remain usable for P0 work; a version-drift list alone does not
block it. An actual required runtime/reader defect and missing target evidence
still block their dependent effects. Preparation is not evidence that an old
Source pin is latest or that a native target passed.
Current reviewed Source ingress and CI formation use the standing repository
authority above and the single lifecycle policy. There is no per-build-only
exception ladder. Retain exact operation/request identities and unknown effects.
Numeric quality gaps remain explicit;
Static evidence never grants Runtime acceptance. Plugin commands are declared
by its owner after the product specification is present.

Preserve `.git`, history, origin and unrelated files. The predecessor runtime
is inactive provenance in `.tmp/archive`, never an active fallback. Do not
merge predecessor schemas or code into the current product. Existing consumer
v10 remains until the selected distribution, public CLI and fenced artifact
repair are verified. Existing tasks are retained as inactive provenance, not migrated.
