# Agent runtime system specification

Owner: agent product maintainer. Class: canonical living system specification.
Repository-only source trace (not an installed consumer dependency): the current attributable repository/distribution and developer
unblocking decisions in `.agent/work/npm-agent-migration-20260930/WORK.md`.
This document defines the target behavior; its presence does not certify that
the distribution, migration or Runtime acceptance gates have passed.

## Authority and responsibilities

The runtime preserves one project-owned configuration and one attributable
lifecycle authority. Human business intent constrains system behavior; code,
tests and local receipts provide separate evidence. Caller JSON and tool
reports do not authenticate approval, native execution or user acceptance.

Local execution assumes a trusted orchestrating session and its observed
built-in tool results. Before authoring `LocalSourceWriteAuthorization/v1`,
the controller establishes actual user authorization from the current
conversation. That artifact is a scoped cooperative declaration and reference:
the CLI checks its consistency with the work, configured writer, source scope,
live lease and policy/CAS bindings. It does not authenticate the human directive.
The declaration cannot establish independent review, delivery authorization or
user Runtime acceptance. Local coordination does not promise physical exclusion
of a malicious local caller with full filesystem access; containment, exact file
ownership, policy checks and freshness remain technically enforced.

Mastra owns the configured stage graph, suspension and session snapshot. The
runtime owns work identity, exact repository/project/thread binding, ownership,
leases, coordination, artifact integrity and CAS through HostState. Existing
Cedar WASM and Edictum SDK boundaries execute in-process and retain their
policy/evidence responsibilities. Configuration alone does not prove that a
particular action passed enforcement. Native session tools remain the current execution adapter.
The CLI prepares and issues typed actions, accepts bounded actual reports and
checks freshness before progress. Uncertain issued actions are not reissued.

## Package and consumer boundaries

The source repository contains exactly `agent=packages/agent` and
`plugin=packages/plugin`. Existing Git history and origin are preserved.
Predecessor framework code is inactive provenance, never an active fallback.

The agent distributes as `vida-agent`, initially from a local npm
tarball installed globally. The `vida-agent` PATH command forwards supported
public commands and returns instruction locations through
`vida-agent instructions --path NAME`. Existing command aliases remain.
The executing package root is derived from its module location and validated
package identity. Its schemas, templates, instructions and executable code
remain package-owned. The explicit consumer `--project-root` owns YAML,
product paths, project documents and operational state. Generated consumer
instructions contain a public discovery command, not an installation-home
path or a copied agent implementation. npm owns installed dependencies;
initialization does not run a dependency installation in the global package.
The installation dependency check resolves declared entrypoints with ESM import
conditions from that package's directory and verifies their files without
loading dependency code. Import-only exports are valid; an absent entrypoint
blocks initialization. The check does not use consumer source or `NODE_PATH`.

Package changes cannot silently reinterpret active consumer artifacts. A
functional bundle-owned current-v1 repair must bind exact preimages, source,
authorization and current versions, apply atomic changes with recovery, and
repair configuration, initialization, selector and generated instruction
pointers before retiring the former consumer bundle. Existing consumer v10
and unrelated files remain until the replacement is verified. Prior tasks
are preserved as inactive provenance; new work does not inherit their rights.

## Local release workflow

After authorized source corrections, the orchestrating session forms a new
local npm package and installs it on the system through the repository-owned
`release:local` command. This is an authorized delivery effect, not user Runtime
acceptance. The initial package version is `0.1.0`; only a fully verified
successful local publication advances the next candidate patch. Failed checks,
packing or installation and recovery of the same pending operation do not
consume a version. Durable publication state is project-owned under
`.agent/work/agent-local-release`, independently of scratch archive retention.
The pending, per-operation and successful receipts use the strict current
`VidaLocalReleaseState/v1` contract: package version, operation identity and
status are required; worker PID, timing, source/archive bindings, exact npm
metadata, installation-start marker and verified installed locations are
phase-specific evidence. Unknown fields and other schema identities are
rejected. Removing scratch output preserves uncertain effects in the durable
per-operation journal and cannot authorize replay.

Candidate preparation settles version and ownership before assurance. Applicable
actual test outcomes bind their relevant executable inputs, allowing reuse when
those inputs remain current. npm pack builds once through prepack and supplies
structured exact archive metadata. Three actual fresh history-isolated blind
reviews, reverse validation and current public documentation CLEAR bind the
sealed source and archive before installation. The local maintainer adapter
verifies consistency and currentness; the orchestrating session verifies native
review provenance. Local JSON grants neither cryptographic tool-origin proof
nor physical filesystem isolation. No caller skip or approval boolean bypasses
the required joins.

A project owner's explicit scoped standing Git instruction may authorize the
orchestrating session's commit/push between successful pack and final assurance;
this does not make the package CLI a Git caller or grant Runtime acceptance.
For this Source repository, `AGENT.sidecar.md#source-package-git-policy` owns the
required ordinary commit/push order. Failed formation does not trigger it. A
changed included source input or archive invalidates its affected qualification.
`releaseSourceBinding` binds declared current file bytes, excluding `.git`, HEAD,
commit metadata and `dist`; ordinary commits with unchanged included bytes do
not change that binding. Consumer Git authority is separate.

One admitted maintainer process owns candidate allocation and worker launch.
Packing and installation return control asynchronously and expose actual
operation/PID status and stage duration. Installation uses exactly the immutable
qualified archive with npm-managed production dependencies. It resolves npm's
global prefix independently, binds the system PATH command to that package,
and verifies version, instruction discovery and pinned prerequisites in an
unrelated cwd. Interrupted or failed verification inspects the exact installed
artifact before repeating effects. Registry publication, consumer initialization,
configuration overwrite, commits, tags and push are outside this command.

## Scoped source and lease continuity

The public scope command accepts repeated `--repository-path` values for exact
repository-shared files outside every configured project root. Project files,
including unselected products, use the existing `--path` coverage rules. Both
sets enter the same current-v1 bounded, stable, no-follow source snapshot;
duplicates, collisions, traversal and unsafe paths fail. A snapshot grants no
source write or delivery authority.

Admission creates an active coordination ticket bound to the exact work,
repository, projects, thread and source snapshot, with one real same-work
execution claim and its normal lease expiry. Read-only stages retain those
identity and freshness bindings
without reserving future implementation files. Only an actual configured
assignment with `mutation_scope: repository_source` and `source_write: true`
may acquire writer ownership, immediately before issue and before effects.
The boundary rereads the declared source and binds current work, ledger and
journal versions. It allocates an ordinary current-v1 ticket and exact file
claim; the preceding execution-only ticket and claim are released without
changing immutable authority fields. Earlier overlapping writers queue by FIFO. Disjoint
writers in the same project can proceed independently.

Contention and handoff blocking derive from normalized actual exclusive
resources, including file case aliases and explicitly claimed shared resources.
The execution resource is derived internally from the exact work ID; users
do not choose or maintain keys. Repository, tenant, project, BR, SR and AC
navigation keys retain their identity and trace meaning but do not create a mutex. Released or read-only historical
tickets do not enlarge a current handoff component. Explicit shared resources
preserve coherent ownership and FIFO; metadata equality alone cannot force
unrelated work to wait for another work item's delivery or Runtime acceptance.

Accepted terminal source completion must release file ownership before read-only
verification, reviews or user Runtime waiting. Two boundaries remain distinct.
A NEW terminal report validates the observed current project-source snapshot
before binding its `source_scope` and accepting the observation. Cleanup of an
ALREADY durable exact `reported_complete` journal success uses its matching Host
attempt `completed` result and exact current issue/reservation/generation/CAS.
That matched durable terminal success permits release of only its own file claim,
even if its prior lease expired or a permitted external edit later changed bytes.
Expiry and drift are not completion proof; the matched durable success is.

One co-located journal/work/shared-ledger CAS transaction releases that work's
file ticket/claim and safe unissued queued intents, retaining same-work
execution-only coordination, phase, results and assurance history. Work remains
incomplete and release grants no Runtime acceptance. New execution-only lease
coordination grants no Source-write authority. Permitted drift stales byte-bound
proof through existing fresh-read/invalidation boundaries; it must not retain a
stale file lock solely to make prior proof appear current. A correction uses
fresh scope and FIFO file ownership and invalidates only changed-byte evidence.

Live, unobserved, issued/unknown, Host started/uncertain, foreign or mismatched
outcomes remain fenced pending existing explicit terminal/quiescence
reconciliation. Agent done, expiry or prior Code packets cannot establish release
safety. Read-only tests, reviews and Runtime waiting retain no file-write rights.

Use common ownership reconciliation at report, intake, recovery, suspension and
successor boundaries; exact retry/restart is idempotent. The dedicated HostState
transaction at the Mastra report seam has initial Source test evidence, but
historical reconciliation, expired/drift, sequential/FIFO/stale cases and final
qualification remain pending. Avoid nested ordinary CAS, additional caller keys
or artifact-schema fields. No implementation-complete claim follows from the
initial atomic seam test.

Request-pointer equality groups native children under their stable orchestrating
Root identity, preserving the exact repository/project set and same-request
parallel contours. It cannot absorb a foreign session or project. Logical file
resource equality and cooperative ownership do not provide physical filesystem
isolation. Source work here does not mutate a consumer repository; its owner
handles consumer deployment and testing.

An attributable same-owner continuation may cooperatively suspend one issued
unknown read-only action through the existing public route. The exact pending
assignment must be bound to unchanged configured read-only rights, no source
write or egress, with no reservation, pending normalization or host assignment
effect. The operation checks exact work, ledger and journal CAS, thread,
ticket, claim, generation and FIFO, and releases only that owner's ownership,
including an expired claim. Later queued contenders remain unchanged.
Completed predecessors retain their actual terminal observations; their
configured official-docs access does not block release of the pending action.
Source drift alone does not block relinquishing rights: release grants no new rights,
acceptance or continuation. Preserve the original journal, issue, handle,
observations and unknown outcome. Replacement, admission and writer acquisition
still require fresh source bindings. Unknown writer effects remain blocked;
late original replies cannot satisfy a replacement generation.

The public session launcher offers `--renew-lease true` for the current live
same-owner work, attempt, ticket, claim and generation. It checks the latest
work/ledger/journal CAS, exact source, scope, configuration, schema and current
bundle before extending the existing sixty-minute lease. It preserves accepted
observations and issued actions. A started or uncertain writer may retain the
same live ticket and generation only while its assignment and reservation
remain bound to that owner, current scoped source and unrevoked source-write
authority. Renewal cannot acquire an expired or foreign fence or resolve an
unknown effect.

Expired accepted readonly work may use `--recover-expired-lease true` together
with explicit `--rebind-current-bundle true`. Recovery requires an unsealed
INTAKE work with a completely unissued current wave, no pending unknown native
outcome or writer assignment history, unchanged source/configuration/schema/
scope/acceptance, and verified retained source authorization and research
lineage. Expiry alone never proves quiescence or absence of effects.

One shared HostState/coordination/journal SQLite transaction checks exact current
versions, active claims and FIFO waiters, terminalizes the expired claim, makes
the old ticket read-only with no rights, and allocates a fresh ticket and claim
at the current delivery generation. It explicitly binds the executing package's
current runtime digest and records the existing attributable authority reference
in CoordinationScopeRebind/v1. It does not advance the global delivery generation,
rewrite prior approvals or observations, replay native calls, or grant delivery.
Recovery validates each completed stage's declared produced contracts. Canonical
research outputs require their bound normalization and artifact provenance;
task-only synthesis is checked as a task-packet prerequisite rather than
requiring an unrelated research result.
The separate Mastra workflow store is preserved; no cross-database atomicity is
claimed. Old ticket capabilities and stale caller versions fail. Overlapping
active owners and earlier queued overlapping writers block recovery.

The unissued-empty preparation release remains distinct: an exact expired owner
may release only bound unsealed INTAKE preparation with no completed wave,
observation, issue, reservation, host assignment or effect. Preserve that attempt;
admit successor work separately. Unknown issued readonly work is not this case.

Reports of failed native research or synthesis remain durable terminal
observations. They create no successful research artifact and cannot satisfy a
success gate. An exact action, issue and observation retry must return the current
persisted snapshot after a lost acknowledgement, including after wave advance;
a changed payload conflicts. This does not deduplicate external effects.

Known source-writer failure must remain distinct from unknown effects: preserve
the durable original issue and effect identity, create no successful artifact,
and grant no replay or no-effect proof. Public report ordering and durable writer
failure remain current implementation GAPs despite read-only failure/journal
retry fixes. Current correction uses a linked successor; SAME-attempt bounded
correction remains required with its budget/exhaustion policy unspecified.

Before fresh admission, package-owned executable inventory must establish runtime
identity; a caller-selected subset cannot define that authority. Recovery accepts
only exact owned execution resources or validated file resources. Effective graph
validation must retain required producers and consumer cardinality. Suspension
must retire only the same work's unissued queued ticket intents. These current
corrective items remain open until final behavioral evidence exists.

Append-only coordination history has a finite canonical JSON budget. Prove actual
clean-ledger headroom before first admission. After first clean migration,
closure-safe historical rollover and read lookup are required before sustained
use; this open P1 need does not authorize unsafe current-v1 compaction or an
invented work-count limit. Optional answer/save research surfaces and partial-init
recovery remain requirements with current implementation/qualification gaps.

Risk filtering preserves each action's original configured assignment index.
The configured DAG's declared terminal stages identify terminal synthesis
outputs independently of stage declaration order. Only the persisted Mastra
workflow outcome `success` projects completion. A null suspended step with a
failed, canceled or unknown outcome remains blocked; a ledger-only read cannot
infer success from the absence of a suspended step.

Automatic successor admission groups attributable requests by the existing
validated implementation scope's exact `attribution.thread_id` and opaque
`attribution.pointer`. Equal pointers preserve parallel contours of one request.
A distinct pointer may supersede eligible predecessors only for the exact same
orchestrating session, repository and sorted project set. The successor and
every predecessor's current contracts, journal, work and coordination versions
are validated before one host-owned SQLite transaction admits the successor,
records typed predecessor/successor relations and releases only the eligible
old owner's resources and queued intents. Historical phase, evidence, observations and
pending Runtime acceptance remain intact. A superseded predecessor cannot
resume; active, reserved or unknown source-writing effects remain guarded.
Debug corrections carry unfinished predecessor intent and acceptance into the
successor contract. Status and continuation requests do not create a new request
group. Functional bundled current-v1 repair, atomic application and recovery
must be qualified before active artifacts or installed readers are upgraded.
The successor's intake, scope, acceptance and source bindings are checked before
admission. Immediate transaction CAS covers every selected predecessor work,
the successor and the single shared ledger, with current journal and maintenance
bindings. An ambiguous request or an issued/unknown effect does not authorize
ordinary absorption. Exact public intake retry returns the existing admitted
successor; changed intent for that identity conflicts. Supersession is neither
completion nor user acceptance and does not rewrite raw native journals.

The public `vida-agent reconcile-artifacts --kind work-state --mode inspect
--project-root ABSROOT` returns `HostWorkspaceInspection/v1` from the existing
canonical SQLite database. It uses a constructor-free read-only connection:
no database creation, initialization, mutating pragmas or lifecycle advancement.
Missing state fails closed. Its copy/SQLite inspection validates the canonical
composite governance envelope and reads without mutating original SHM/schema/
journal mode. This projection is evidence, not a second status store. The same kind supports `plan`, `apply`, `resume` and `restore`, bound to
`--repair-id ID`; `plan` also records `--actor STRING` as attribution. The
current bounded repair normalizes an absent optional `request_transition` to
null using frozen preimages, postimages and dependency versions in one atomic
transaction. Restore changes only its owned field with advancing revisions;
pending, reserved or uncertain native effects remain guarded. This work-state
repair does not establish general consumer configuration/storage migration.

Consumer rollback binds an authoritative read-only HostState baseline and the
existing maintenance fence through restore. Initialization alone does not close
rollback; the cutoff is the first admitted new-work attempt, including an
attempt whose preparation later fails. `HostStateStore.recordAdmissionAttempt`
persists that canonical cutoff before fresh preparation, with exact request
retry/conflict checks. Current rows, admissions and pending native effects are
compared with the bound baseline; unknown or changed state blocks restore.

The Source primitive `HostStateStore.consumerMigrationState(receipt, mode,
files)` supports `baseline` and `restore` under current maintenance. Baseline
retains historical canonical rows as same-store beforeimages and clears active
rows; restore recovers exact old row semantics while maintenance metadata remains
monotonic. Its synchronous filesystem callback executes inside the transaction.
SQL and filesystem effects are not one atomic persistence system. The
async package-owned SDK entry `runConsumerMigrationState(input, files)` is
exported through `trusted-host`; input binds `repositoryRoot`, `operationId`,
`actor` and `mode: baseline|restore`. Its callback receives configured
`database_path`, `workflow_database_path` and `backup` bytes only on the initial
baseline, otherwise null. The callback must be synchronous and idempotent.
Unknown/inflight native or Mastra state is denied before callback effects. An
interrupted restore retains its durable restoring state and maintenance fence;
the exact operation resumes. Baseline retry reuses its beforeimages, and restored
retry calls the idempotent callback only when restored rows/admissions remain
exact. Source helper qualification and repository-only deployment adapter work
remain pending; no migration CLI or installed readiness is established.

Retain the canonical database and its WAL/SHM at the configured path, partition
archived work children around that authority, and obtain a consistent database
backup. Do not rename the live database root or substitute physical database-byte
equality, timestamps or maintenance generation for semantic state comparison.
Existing tasks remain inactive provenance, not migrated work. Required full
consumer snapshot restore is allowed only before the first new admitted attempt
and retains maintenance/CAS across the filesystem effect. Source primitives and
focused tests do not prove deployed consumer readiness or Runtime acceptance.

The retained selector cutoff path uses `withHostStateExclusiveTransaction` for
canonical SQLite immediate exclusion through selector/witness recheck and atomic
filesystem witness publication. It creates no persistent wx lock; process
termination releases SQLite exclusion. A historical orphan marker still fails
closed pending explicit maintenance/terminal repair or retirement of the old
selector. PID/age heuristics do not authorize deletion. This establishes no
power-loss guarantee or SQL/filesystem atomicity claim.

Research normalization preserves its immutable current-v1 reserved plan, exact
target-record CAS and unique lineage event. Under the existing changelog lock,
valid unrelated append-only events remain intact during apply, guarded read and
admission. Changed original prefix, target record or own event, duplicate own
event and uncertain partial effects remain conflicts. Recovery of a known
record-first partial write uses the same persisted observation and plan.

The pinned Bun launcher validates package metadata and the exact pin before
checking an absolute realpath executable from PATH. Only an exact version is
used; absent, malformed or mismatched PATH candidates fall back to the existing
npm pinned resolver. Explicit executable overrides retain strict checks. This
local tool discovery does not attest toolchain provenance or guarantee offline
operation.

## Host integration direction

Supporting facts, accepted direction and remaining activation decisions are
recorded in `research/openai-execution-backends.md`; that evidence document is
not an additional architecture contract or a runtime research receipt.

The generic runtime keeps orchestration, policy, state and artifact authority
separate from host adapters. The current adapter uses available native session
tools and records their actual outcomes through the public protocol.

Core is the sole owner of lifecycle, state, rights and acceptance. Connector
work covers Codex SDK, App Server, Agents SDK and Agents API adapters; those
adapters normalize only issued effects and events. Plugin UI/MCP uses public
interfaces and owns no duplicate lifecycle ledger. These domains remain inside
the two products `agent` and `plugin`. Optional future providers neither delay
the coordinated `0.1.2` release nor activate provider execution or API billing.
Its default remains built-in session tools. The connector public seam is not
yet implemented or verified and remains a GAP.

The target adapter sequence is OpenAI Agents API, TypeScript Agents SDK, then
Codex support around the same generic runtime. The beta Agents API provides
managed sessions, turns and events; the Agents SDK provides an application-owned
runner. They are separate execution surfaces, not alternate owners of our outer
workflow graph, HostState, authorization or acceptance.
[Agents API overview](https://developers.openai.com/api/docs/guides/agents-api/overview),
[Agents SDK](https://developers.openai.com/api/docs/guides/agents/sdk).

A backend adapter executes only an already-issued role action and normalizes
opaque session/turn/event/call references, status, output, artifacts and pending
actions. It maps actual terminal results into the issue/report CAS protocol;
idle status is not success and unknown effects are not automatically repeated.
An API required action is not attributable human approval. SDK approval
interruptions and runner state supplement the existing authority contract;
they cannot grant scope or user acceptance.
[Managed sessions](https://developers.openai.com/api/docs/guides/agents-api/sessions/manage),
[SDK guardrails and approvals](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals).

API activation is not authorized by this roadmap. Owner decisions on credentials,
scopes, costs, environment and data handling precede enabling paid provider
execution. No SDK dependency or provider execution is implemented by this move.
The current standalone CLI does not call native session tools itself. Codex
local thread support is a future connector boundary; experimental App Server
support is not a migration prerequisite or a production guarantee.
[Codex SDK](https://learn.chatgpt.com/docs/codex-sdk),
[App Server](https://learn.chatgpt.com/docs/app-server).

## Settings direction

The user has approved the existence of a separate generic agent settings
section. It does not edit flows, roles or agents and cannot disable invariant
checks or grant permissions through a UI. Project defaults and allowed product
overrides are the intended precedence; directory configuration remains a
separate deferred requirement.

Candidate fields remain proposals: connection/version/status, bounded
concurrency/timeouts/retry, effective permissions, logging/redaction/retention,
runtime state/cache/temp roots, context budgets/exclusions, notifications and
health/provenance. Provider/model/credential controls are later work; no field
set or settings UI is implemented or approved by this document. Codex UI
preferences belong to its plugin adapter, not the generic core.

## Project and product skill catalogue

The repository owner requires skills to be recorded for both the shared project
and each product (`agent` and `plugin`) as official-documentation research is
completed. Attribution: the human request in Plugin owner chat
`01a0ef6f-c387-77a1-828f-54d4e91e3648` on 2026-09-30. Each catalogue entry
identifies its project or product owner, canonical skill source, primary-source
documentation pointers, applicable scope and evidence status: `discovered`,
`proposed`, `authored` or `verified`. Research discovery does not imply that a
skill has been authored or verified.

Proposed generic agent categories are lifecycle execution, ownership and
recovery, configuration and paths, skill selection, and connector contracts.
Connector research retains the official pointers in Host integration direction;
project-specific categories use their own current official research sources.
The generic agent remains independent of a Codex or provider execution adapter.
Actual `SKILL.md` authoring and catalogue verification follow in a separate
scope after developer unblocking. The Plugin owner maintains its product
requirements, behavior and acceptance in the three Plugin canonical documents.

## Delivery priorities and acceptance

Prioritize verified developer unblocking, project migration to the actual
runtime, optimization, then new functionality. Detailed execution-speed law
has one owner: the development-lifecycle self-development protocol.

Acceptance requires actual global npm/PATH discovery from an unrelated cwd,
package-owned resource reads, fresh initialization with exact project maps,
preserved owner settings on repeat initialization, and a genuine typed fresh
work intake without manual integrity values. Consumer migration requires
atomic/recoverable current-v1 repair and exact fenced retirement with unrelated
product data preserved. Static tests never close attributable Runtime acceptance.

Current Code evidence includes the full transferred source, public umbrella
discovery, package/consumer initialization access split and new-repository
reconciliation. The installed `0.1.1` package is immutable; the coordinated
`0.1.2` candidate remains pending. Selected external-package run, qualified
consumer artifact repair/rollback, final assurance and current installed Runtime
acceptance remain GAPs. Focused Source checks do not qualify a complete release.
The future OpenAI/SDK/Codex adapters and per-product directory extensions are
separate planned work. The old executor-only repair does not prove general
configuration or storage relocation.
