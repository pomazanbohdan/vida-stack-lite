# VIDA agent and plugin source repository

This project-owned sidecar configures the existing Git repository. It is not a
portable runtime instruction owner. The repository has exactly two products:
`agent` at `packages/agent` and `plugin` at `packages/plugin`.

## Agent bootstrap: search tools

During the mandatory `AGENTS.md` -> `AGENT.sidecar.md` bootstrap, the lead and
every delegated agent load the [structural search policy](#structural-code-search)
before searching or reading implementation files. Select the tool by purpose:

| Purpose                                                                      | Tool                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------ |
| File names, symbol names, messages and configuration text                    | `rg`, `rg --files`                               |
| Call shapes, repeated syntax and refactoring candidates                      | `ast-grep run` or `ast-grep scan`                |
| Navigation to declarations, imports and direct members before reading bodies | `ast-grep outline`                               |
| Maintained function inventory and identities; type and semantic checks       | Existing Babel inventory and TypeScript compiler |

Delegation includes the repository root and this bootstrap pointer, including
for blind agents. Agents read the relevant project skill before using
`ast-grep`; inspect only the selected paths and reuse current results. If the
CLI is unavailable or its version differs from the pin, report that limitation
and use the existing tools without claiming an ast-grep check. Syntax findings
remain review candidates; all validation and evidence gates stay with their
current owners.

## Source and ownership map

| Layer or concern                                                    | Authoritative source                                                                                                               | Owner            |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Repository layout and distribution intent                           | Current attributable user decision in `.agent/work/core-cloud-continuation-20261002/WORK.md#native-only-public-delivery-decision`  | Repository owner |
| Agent system behavior                                               | `packages/agent/docs/system-specification.md`                                                                                      | Agent maintainer |
| Agent lifecycle and verification                                    | `packages/agent/instructions/`, `packages/agent/TESTING.md`                                                                        | Agent maintainer |
| Agent installation guide                                            | `packages/agent/docs/installation.md` (derived guide, not a second specification)                                                  | Agent maintainer |
| Agent research evidence                                             | `packages/agent/docs/research/` (facts and open questions, not runtime receipts)                                                   | Agent maintainer |
| Agent implementation and executable evidence                        | `packages/agent/src/`, `packages/agent/bin/`, `packages/agent/schemas/`, `packages/agent/tests/`, `packages/agent/tooling/`        | Agent maintainer |
| Plugin business intent                                              | `packages/plugin/docs/business-requirements.md`                                                                                    | Plugin owner     |
| Plugin system behavior                                              | `packages/plugin/docs/system-specification.md`                                                                                     | Plugin owner     |
| Plugin acceptance                                                   | `packages/plugin/docs/acceptance.md`                                                                                               | Plugin owner     |
| Plugin code and verification                                        | `packages/plugin/`, as declared by its current system specification                                                                | Plugin owner     |
| Repository-only migration verification                              | `tooling/agent/`, `tests/agent/`                                                                                                   | Agent maintainer |
| Repository-only CI evidence join                                    | `tooling/agent/release-ci-evidence.ts` and its trusted session/controller observation boundary                                     | Agent maintainer |
| Native build artifact and Windows install/update/uninstall delivery | `.github/workflows/agent-native-delivery.yml`, `tooling/agent/native-ci-delivery.ts`, `packages/agent/tooling/install-windows.ps1` | Agent maintainer |
| Project registry and configuration                                  | Root `agent-runtime.config.v1.yaml` and bound documentation policy                                                                 | Repository owner |

Plugin canonical documents are filled by the Plugin owner under a fresh scope.
Their absence is an explicit setup gap, not permission to import old work as law.
One writer owns overlapping shared root configuration and workspace files.

Before adding a helper, search maintained code for an owner with the same contract.
Keep shared product behavior in `packages`; repository adapters call that owner.
Preserve each boundary's authorization, guard order, CAS and UNKNOWN handling.
Reuse its tests and inventory; add cases for affected callers and record extracted
function correspondence. Similar syntax alone is insufficient reason to merge.

## Runtime and distribution

Repository development, verification, build and packaging commands use the
package-selected Bun. Do not add external `node`, `npm` or `npx` execution to
these commands or call retained Node-owned compatibility adapters from them.
Compatible `node:` imports and SDK consumer engine declarations remain valid.
This is a repository tooling rule, not a deployment-environment requirement:
do not require Node to be absent, uninstall it on consumer hosts or prohibit
other applications from using it.

- Source package: `packages/agent`, npm name `vida-agent`.
- Primary consumer installation is one native executable per supported OS/CPU,
  embedding the exact package-selected Bun. Direct installation and first run require no
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
- Product implementation, schemas, templates and maintained instruction Source
  stay in those packages. The approved initialized-project target is `.vida/`:
  project configuration, project agent instructions and operational data only.
  It is not a source package or a copied runtime installation. The layout and
  upgrade contract is owned by
  `packages/agent/docs/system-specification.md#initialized-project-layout-and-upgrades`.
  Current paths below remain in use until that upgrade is implemented and applied.
- Root agent instructions are generated from the maintained package template.
- Work and coordination live under `.agent/`; scratch and asynchronous output
  live under `.tmp/`, outside sealed package payloads. Measure control latency
  separately from actual elapsed execution time.

## Structural code search

Use `ast-grep` as an additional development tool for structural searches and
compact file outlines. Its CLI is pinned to `@ast-grep/cli@0.50.0`; verify
`ast-grep --version` before use. Installation is global on the development host,
not an Agent/Core runtime dependency.

Project skill owners are [ast-grep](.agents/skills/ast-grep/SKILL.md) and
[ast-grep-outline](.agents/skills/ast-grep-outline/SKILL.md). Read the relevant skill
before use. `.agents/skills` contains the original project-scoped skill
directories; upstream revision and license are recorded in
`.agents/skills/ast-grep.upstream.json`. The repository owner owns their adoption;
upstream instructions supplement this sidecar and the current lifecycle.

Select candidate paths with `rg --files` or the existing maintained inventory,
then search only the needed files. Use `--lang ts` for TS and `--lang tsx` for
TSX. Test each new pattern on matching and nonmatching fixtures before applying
it to Source. Include optional calls, generics, computed members and nested
closures when relevant. Use `outline` for navigation, not a second function
inventory. Keep plain-text searches on `rg` and reuse current results.

Matches are syntax candidates for review. They do not establish symbol binding,
types, dataflow, function ownership, safe deduplication or valid syntax after
parser recovery. Preserve the Babel AST inventory, function/test links, reviewed
scenario matrices, Ajv, Bun coverage and all exact coverage, complexity/CRAP and
assertion-confirmed mutation gates. Do not add a duplicate full scan or suite.

Prefer JSON output. Its line numbers are zero-based and byte offsets require
UTF-8-aware conversion before joining Babel/JavaScript offsets. Multi-node
captures can include punctuation. `run` returns 0 for matches and 1 for no
matches; inspect stderr and the result body to distinguish no matches from an
input error. An error-severity `scan` finding returns 1. Rule snapshots cover
labels/spans/fixes; assert the rule-level diagnostic message separately. Current
0.50.0 SARIF output is not qualified for standards-compliant export; use JSON.

Search is read-only by default. Preview rewrites in owned fixtures, review the
exact diff and run affected checks before any authorized Source application.
Only the designated writer applies changes. A structural match grants no
execution, authorization, repair or UNKNOWN-replay rights.

## Bun Test development

For Bun Test authoring, migration, review, execution or optimization, the lead
and delegated agents read [bun-test](.agents/skills/bun-test/SKILL.md) during
bootstrap after the lifecycle and `packages/agent/TESTING.md`. The project skill
is a maintained technique reference; those existing owners retain all policy,
gate and command authority. Update the reference with verified changes in the
same correction packet. Keep its original only in `.agents/skills`.

Before changing test concurrency, eligibility, coverage receipts or the runner,
read [TESTING's parallel contract](packages/agent/TESTING.md#parallel-testing-current-status-and-required-contract)
and its linked design/implementation plan. Include this bootstrap pointer in
delegation. A scheduler/control pass does not activate parallel coverage; current
serial commands remain until protocol, custody and pilot qualification.

Author self-development automation in TypeScript and execute it with qualified
Bun. For inventory/report processing, reuse the package-owned TS tools or an
owned temporary `.ts` diagnostic. Use `apply_patch` for exact document edits.
Shell/Git commands and declared Node-backed compiler/quality tools retain their
existing owners. Decode JSON as unknown and validate its actual schema before
reading fields; TypeScript assertions do not validate report bytes.

## Source package Git policy

The Source repository owner's standing authorization permits ordinary non-force
publication of the exact reviewed Source payload. Publish changed Source before
its CI formation. Preserve unrelated staged files, Git history and remote state.
Use the declared Source/commit byte binding at CI ingress. An unchanged selected
artifact needs no new Source publication solely for installation. Git authority
is not user Runtime acceptance or permission to rewrite consumer configuration.

Completed correction packets must be committed and pushed after their applicable
checks under the development-lifecycle self-development protocol. This Source
repository's standing Git authorization applies; no separate per-packet approval
is required. Keep unfinished work explicit and preserve unrelated staged changes.

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
self-development owner. The current backlog sets implementation priorities.
Current exact qualified pins remain usable for P0 work; a version-drift list alone does not
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
