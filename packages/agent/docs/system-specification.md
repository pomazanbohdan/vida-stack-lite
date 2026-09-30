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
observations and pending readonly issues, and rejects issued writer bindings,
started or uncertain assignments, foreign ownership and expired leases.

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
The separate Mastra workflow store is preserved; no cross-database atomicity is
claimed. Old ticket capabilities and stale caller versions fail. Overlapping
active owners and earlier queued overlapping writers block recovery.

The unissued-empty preparation release remains distinct: an exact expired owner
may release only bound unsealed INTAKE preparation with no completed wave,
observation, issue, reservation, host assignment or effect. Preserve that attempt;
admit successor work separately. Unknown issued readonly work is not this case.

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
reconciliation. Global package installation, selected external-package run,
consumer artifact repair, final assurance and Runtime acceptance remain GAPs.
The future OpenAI/SDK/Codex adapters and per-product directory extensions are
separate planned work. The old executor-only repair does not prove general
configuration or storage relocation.
