# VIDA agent and plugin source repository

This project-owned sidecar configures the existing Git repository. It is not a
portable runtime instruction owner. The repository has exactly two products:
`agent` at `packages/agent` and `plugin` at `packages/plugin`.

## Agent bootstrap: search tools

During `AGENTS.md` -> `AGENT.sidecar.md` bootstrap, the lead and every delegated
agent load the [search policy](#structural-code-search) before implementation reads.
The single tool-selection table is in [.codex/README.md](.codex/README.md#bootstrap-and-ownership).
Use `rg --files --hidden` when searching `.agent`, `.agents` or `.codex`.
An omitted hidden path is not evidence that a file is absent.

Delegation includes the repository root and this bootstrap pointer, including
for blind agents. Agents read [.codex/README.md](.codex/README.md) for Vex/LeanCTX and the relevant
project skill for ast-grep; inspect selected paths and reuse current results. If the
CLI is unavailable or its version differs from the pin, report that limitation
and use the existing tools without claiming that tool's check. Syntax findings
remain review candidates; all validation and evidence gates stay with their
current owners.

## Source and ownership map

| Layer or concern                                                    | Authoritative source                                                                                                               | Owner            |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Repository layout and distribution intent                           | [Repository delivery decision](#native-only-public-delivery-decision)                                                              | Repository owner |
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
| CI SDK test inputs and automatic coverage readiness                  | `.github/workflows/agent-sdk-coverage.yml`, `tooling/agent/sdk-coverage-readiness.ts`, `tooling/agent/run-coverage.ts`                 | Agent maintainer |
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

## Native-only public delivery decision

The repository owner reaffirmed this existing policy by approving the comprehensive
Pstack implementation on 2026-10-14. Agent public delivery is one native executable
with embedded package-selected Bun. npm artifacts serve SDK library imports only.
The two product roots are `packages/agent` and `packages/plugin`.
Consumer `.vida` contains project configuration, local instructions and operational
data. Its active cutover remains conditional on the bundle-owned repair contract.
The previously cited 2026-10-02 WORK decision record is absent from this checkout;
do not claim to have recovered its original bytes or use an old handoff as authority.

## Orchestration and delegation

The user and this sidecar select the work scope. The lifecycle owns execution and
evidence policy; TESTING owns verification gates. The current CLEAR plan owns task
order, the backlog owns stable IDs, and WORK records current evidence.
The repository owner selects Pstack for every development contour, including
research, planning, implementation, checks, review and documentation. Resolve its
installed entry through the [Cloud reference](.codex/README.md#pstack-provisioning-and-qualification),
then read the focused practices needed for the task. Apply Superpowers' selected
planning, debugging and test practices within that same work. GSD state is derived
and Ponytail applies only to code-producing lanes. Keep the current CLEAR plan,
backlog and WORK as their existing owners. Do not create another outer workflow,
orchestration store, standing-orders register or canonical ledger for the same work.

Root retains Source integration, shared-file ownership, final checks and Git.
Native blind Luna is the selected provider/model route for all delegated lanes.

For test-contour repairs, assign exactly one contour to each agent and keep a
rolling pool of up to five useful lanes. When a lane finishes, reconcile its
findings and assign the next ready contour; continue until every discovered
contour finding has a verified fix or an explicit unresolved disposition.
Give each code-producing lane its own checkout and exact file ownership. During
numeric measurement, the measured checkout stays immutable: workers may prepare
fixes in their assigned isolated checkouts, and Root integrates only after the
affected producers are terminal. Temporary edits followed by restoration also
violate this rule. Root alone owns Git, shared-file integration and final checks;
worker proposals and static checks do not establish numeric closure.
An unresolved finding remains OPEN and returns to the repair queue when its
prerequisite is available; a handoff alone does not close the contour.
Pstack defaults do not replace that route or authorize external model spending.
Use prepared worker-contract guidance and disjoint file/output assignments.
Prompt-only guidance does not establish a sandbox or independent Git authority.

Use native Luna for independent blind work under the owner's standing preference.
Each assignment names the root, bootstrap, exact files, invariants and result format.
One writer owns each shared file. Workers do not perform Git operations or duplicate
the lead's checks. Use a bounded useful pool, not one agent per helper. Pstack external
model defaults do not configure providers or authorize spending. A missing external
route does not block the authorized native route.

## Documentation maintenance

Update the existing owner in the same correction packet. Keep product behavior in
the system specification, execution policy in lifecycle, verification in TESTING,
tool-selection details in `.codex/README.md`, priorities in backlog, order in the
CLEAR plan and exact outcomes in WORK. Research records facts and open questions.
It does not grant runtime authority.

Active documents contain current rules and status. Replace superseded narratives
with a resolvable Git commit/path reference; preserve accepted task IDs, decisions,
acceptance criteria and exact evidence locators. Do not copy full history into a new
active document. Retained FAIL/UNKNOWN artifacts keep their original bytes and custody.
Record a terminal outcome before assigning the next action. Missing proof stays GAP.

For every packet, check changed links and heading anchors, commands, owner references,
template/generated equality and status against the actual terminal result. Read only
affected documents and reuse current inventories. Do not add a duplicate whole scan,
hash pass or suite. Reference tool versions from their maintained manifests/locks.
Run `bun tooling/agent/check-documentation.ts` for changed tracked Markdown in the
current worktree. Supply exact additional paths for newly created documents.
It caches target reads in that invocation; it does not attest staged bytes,
external URLs, runtime receipts, policy approval or numeric qualification.
Keep open qualification separate from implemented Source. The generated root AGENTS
changes through `packages/agent/templates/AGENTS.template.md`; project rules stay here.

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

The [Cloud reference](.codex/README.md#bootstrap-and-ownership) owns tool selection,
versions, setup, cache, resource and recovery details. Read its relevant section
once and use available qualified tools. Use rg first for file/text searches and
scoped ast-grep for structural patterns. The repository owner requires Vex as the
default for symbol, concept, reference and candidate-call navigation. Confirm
current host readiness, use bounded queries on the selected paths, and verify
returned freshness. Pass this default in every delegated agent's bootstrap.
Never trigger auto-refresh or compete with a cold build during frozen checks.

Project skill owners are [ast-grep](.agents/skills/ast-grep/SKILL.md) and
[ast-grep-outline](.agents/skills/ast-grep-outline/SKILL.md). Read the selected skill
before use. Originals live only in .agents/skills; upstream revision/license
records accompany them. ast-index is an inactive fallback, not a second index.

Reuse selected paths and inventory. Qualify new patterns with matching/nonmatching
fixtures before Source application. Review optional/generic/computed calls and
nested closures where relevant. Outlines are navigation, not a function inventory.
JSON lines are zero-based and byte offsets require UTF-8-aware conversion.
Syntax matches are candidates, not symbol binding, safe deduplication or authority.

Keep Babel identities, TypeScript binding checks and exact evidence gates with
their existing owners. Use native current bytes for edits and numeric evidence.
LeanCTX is explicit human context delivery; recover available archives before
rerunning expensive work. Its compressed output is not byte-exact evidence.
Only the assigned writer applies reviewed changes.

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
For shared test-helper extraction or cleanup changes, also load that contract's
per-file hook registration and pending process-state rules. Delegation identifies
the writer's exact files, affected checks and qualification owner; keep one writer
per shared file and one final numeric owner. Guidance changes do not activate a
pending runner or establish numeric evidence.
Shard reviews apply the same contract's sealed argv/environment, child-local
clock and targeted-negative-control rules. A coordinated reader correctness
check does not qualify removal of the common package resource.
For shard logs and pilot merge paths, also load
[shard output qualification](packages/agent/TESTING.md#shard-output-qualification).

Before async launch or reservation changes, also load
[direct-producer accounting](packages/agent/TESTING.md#direct-producer-accounting-before-resource-reuse).
Delegation names the final-check owner and forbids worker runtime/compiler,
build/install and Git mutations during the owner's frozen measurement.
Async missing-PID observations and budget-spent unattempted launches remain
distinct; direct reservation release does not authorize a resource successor.

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
Workflow edits require the [focused workflow check](.codex/README.md#focused-checks)
before publication; YAML parsing alone does not validate GitHub contexts.
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
merge predecessor schemas or code into the current product. Qualify the formed
native runtime in fresh isolated projects under the current CLEAR decision.
Historical consumer tasks/state are inactive provenance, not migration inputs.
