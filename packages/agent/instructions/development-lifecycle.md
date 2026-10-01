# Development lifecycle

This is the portable lifecycle contract for the runtime named by the project
configuration. The root `AGENTS.md` is the bootstrap entry and the project
`AGENT.sidecar.md` supplies product sources and exceptions. Project data and
work records stay outside the runtime bundle. The active runtime selector binds
the installed bundle; a copied bundle alone does not change lifecycle authority.

## Execution and evidence

Route a read-only request through source inspection without creating execution
state. A tracked mutation binds one project, work item, source revision, scope,
configuration digest, schema digest, runtime digest and exact ownership before
writing. Preserve `BR → SR → AC → evidence/GAP`; a derived ticket or graph is
not the business or system source of truth.

Lifecycle and acceptance authority stays with the runtime and attributable
session evidence; configured agents do not grant themselves that authority.
The local controller must establish actual user authorization in the current
conversation before authoring `LocalSourceWriteAuthorization/v1`. The CLI
assumes trusted local orchestration and observed built-in session tool results;
it checks the declaration's scope, work, configured writer, live lease, policy
and CAS consistency rather than authenticating the human directive. The
declaration grants no independent-review, delivery or user Runtime acceptance
authority. This cooperative boundary does not physically exclude a malicious
local caller with full filesystem access. Keep the existing containment,
permission, ownership and freshness checks.
The candidate CLI uses Mastra with LibSQL for one configured stage graph and
snapshot, and the existing HostState work, ticket, lease, source-write policy
and attempt ledger for fresh admitted work. Persist the governed attempt,
lease and native issue marker before exposing a source-writing action.
An unknown native outcome remains blocked until an observed terminal result,
no-effect proof or explicit reconciliation exists. An interruption request
alone is not proof of quiescence. Retry must not repeat a possible side effect.

The orchestrating session alone invokes built-in collaboration spawn or follow-up,
send, wait and interruption tools. Prepare or resume the same work, attempt,
selection and scope; use the returned `state_version` compare-and-swap values
to issue the ready wave with `--issue-wave true` before a native call. Submit
each observed result through `--report` with the latest version. Mastra resumes
only after the complete wave has been observed and bound to its suspended
request set. An issued action with an uncertain outcome stays blocked from
automatic reissue. The CLI cannot call session tools or maintain background
agents after the session exits.

An attributable new request reuses the validated scope's exact
`attribution.thread_id` and opaque `attribution.pointer`; equal pointers preserve
parallel contours of the same request. A different pointer may absorb eligible
predecessors only under the same stable native session, repository and exact
sorted project set. Prevalidate the successor intake and current predecessor
contracts, then admit it, supersede selected works and release only their rights
and queued intents in one immediate HostState/shared-ledger CAS transaction.
Preserve lifecycle phase, seals, observations, raw journals and pending Runtime
acceptance. Supersession denies old resume and never fabricates completion or
acceptance. Corrections carry unfinished predecessor intent and ACs. Exact intake
retry returns the persisted successor; changed intent conflicts. Status and
continuation requests retain their request group. Ambiguity, reservations,
issued/unknown source effects or stale versions deny ordinary absorption; an
interruption request alone is not quiescence.

Read-only intake owns no future implementation files. Its ordinary active
ticket owns one real same-work execution resource, claim and lease expiry;
this serializes the same attempt without blocking unrelated work. Identity,
context and source bindings remain current. Acquire exact exclusive file
ownership under fresh source and
work/ledger/journal CAS immediately before the first configured source writer
is issued. Validate the assignment's configured source-write rights rather
than inferring read-only permission from an empty attempt history. Retire the
execution-only ticket and claim through an ordinary release and allocate a new
current-v1 writer ticket; never rewrite immutable ticket authority. Actual exclusive
resources determine contention and handoff blocking. Tenant, project and
BR/SR/AC navigation metadata do not create project-wide exclusion.

The existing public continuation route may release an exact owner with one
issued unknown configured read-only action, including an expired claim. Bind
the original read-only rights, same thread/work/ticket/claim/generation and
current work, ledger and journal CAS. Require no reservation, pending
normalization, writer assignment or uncertain writing effect. Keep earlier
FIFO ownership intact and later queued contenders unchanged.
Completed predecessors need actual terminal observations; their prior permitted
official-docs access does not make the pending no-egress action uncertain.
Preserve the old journal, issue, handle and unknown observation; release is neither completion
nor no-effect proof. Current source drift alone does not prevent relinquishing
the old rights. A replacement or new writer needs fresh source and authority
bindings, and a late old reply cannot advance the replacement generation.

Ordinary suspension requires a current exact-owner lease. An expired ticket and
claim may be released only for active unsealed INTAKE preparation with a current
bound unissued journal, no completed waves, observations, reservations, host
assignments or effects, and no competing owner or earlier FIFO blocker. Preserve
the suspended attempt and admit a successor separately. Issued or uncertain work
requires its supported recovery operation; interruption and expiry alone prove
neither quiescence nor no effect.

Live same-owner lease extension uses the public `--renew-lease true` mode with
the latest inspected state version and current fence. A started or uncertain
writer may renew only its same live ticket/generation with current scoped source,
bound assignment/reservation and unrevoked source-write authority. This grants
no expired or foreign takeover and resolves no unknown effect. Expired accepted readonly
work instead uses `--recover-expired-lease true --rebind-current-bundle true`
only under the exact unchanged source/scope/config/schema and verified original
attributable authority. Recovery replaces the old ticket/claim at the existing
delivery generation through shared HostState/coordination/journal CAS, preserves
accepted evidence, and permits no unknown pending outcome or writer assignment.
The executing package is explicitly rebound; no prior approval or observation is
rewritten as new evidence. The system specification owns the detailed contract.

An authorized forward correction may use the fixed admitted completed-readonly
capture operation while the parent maintenance overlay blocks ordinary work.
Verify the exact original issue/run/configuration/source and readonly rights,
capture actual completed observations by CAS, then release only the same owner's
exact ticket and claim, including an expired pair. This grants no new lease or
rights and preserves phase, outputs and pending acceptance. Captured completion
remains normalization pending; it does not accept canonical research or advance
Mastra. Keep the overlay across partial-success recovery and reject ordinary
normalization before effects. Obtain global HostState maintenance and publish
the bundle only after exact owner release and current quiescence checks.

The public `--inspect true` launcher mode reads persisted work, pending native
issues, and lease expiry without renewing a lease or issuing a tool. A paused
configured cooperative read-only research action may be replaced only under
the exact frozen work, scope, source, and configuration bindings. The old
issued outcome remains unknown and cannot satisfy the current action; a new
issue and source lease are bound to the replacement generation. A late old
report is rejected. Unknown source-writing effects still require terminal
observation or explicit reconciliation before reuse or source takeover.

Caller JSON cannot prove tool origin or grant approval, independent review,
delivery execution or Runtime acceptance. Match a report to the actual session
observation, current action/issue and source scope. The admitted local source
write requires its live exact-path lease and current `source.write` authorization;
it does not grant `delivery.execute`. At configured validator and tester stages,
parse structured pass/fail results, reread affected source bytes and reissue
the existing trusted receipts from the persisted journal. A completed stage is checked against its declared produced contracts and bound
artifacts; task-packet-only synthesis does not require unrelated research.
Research-producing work requires a genuine current `ResearchResult/v1` before
its success gate; an untyped summary grants no such authority. A failed research
or synthesis report is a durable terminal observation, creates no success
artifact and cannot pass that gate. Exact action/issue/observation retry after a
lost acknowledgement returns current persisted state even after wave advance;
changed payload conflicts. Mastra's authoritative persisted outcome projects
ledger status; a null suspended step alone remains blocked. Preserve original
assignment indexes through filtering and select graph-declared terminal outputs.
For synthesis, each predecessor result keeps its own local source IDs. The
issued action supplies a catalog bound to the exact sorted result IDs and
digests; cite sources only as `rN:<local source ID>` from that catalog.
Qualified keys do not make repeated external locators or independence groups
independent. Validate the full synthesis result before accepting its report
CAS, so an inadmissible citation leaves the observation and governed artifacts
unchanged. A native observation that later fails normalization remains a
reported observation, not proof of no effect. The bundle-owned synthesis
correction path preserves its original issue and observation while binding
any new issue to a fresh catalog.
If session tools are unavailable, record an execution GAP and stop before
effects. This CLI invokes no external provider, Desktop/API, App Server, MCP,
plugin or agent-host service. Runtime acceptance remains attributable to the
user's testing of the delivered version.

Use one strict current v1 schema for each active artifact. Before a future
current-v1 schema change, implement and ship one functional bundle-owned
artifact repair command for all affected active files and dependencies,
including atomic application and recovery. Until it exists, stop before
changing active artifacts. Runtime readers accept only current v1; archived
old state never becomes production input or a reader fallback.
The public work-state repair is bounded to its declared optional transition
field and dependency preimages. Qualify its public inspect/plan/apply/resume/
restore behavior before live repair or a reader upgrade; it is not general
consumer migration proof. Read workspace baseline through the constructor-free
read-only public projection. Consumer full-snapshot rollback is allowed only
before first new admitted work and must retain maintenance/CAS through restore;
initialization or timestamps alone do not classify that boundary. Canonical admission-attempt persistence now precedes fresh preparation. Source
consumer migration primitives preserve same-store historical row beforeimages,
use a synchronous filesystem callback under maintenance/transaction, and restore
old row semantics while maintenance metadata stays monotonic. Retain canonical
DB/WAL/SHM paths and partition work children; use a consistent backup, not live
root rename or physical database-byte equality. Consumer deployment wrapper
integration and negative qualification remain pending. SQL/filesystem effects
are not claimed atomic and old tasks are not migrated.
An authorized in-scope source edit continues the same work attempt and
invalidates only evidence bound to its prior bytes. Configuration, schema or
installed-bundle authority drift, and out-of-scope source drift, stop
continuation until an explicit rebind. A template is never an implicit
configuration source.

The public reconciliation kind `runtime-config` binds the approved executor
model/reasoning change in one strict `ConfigRebindOperation/v1`. Inspect reads
the proposed authored YAML and current quiescent state; plan freezes baseline
YAML, initialization provenance, project/integration/workspace identity,
selected bundle and global row versions. All other configuration values remain
exact. Actor/instruction strings are attribution, never caller-issued approval.
First apply holds the existing maintenance fence and returns
`author_config_required` before the owner authors the exact target root YAML.
Apply/resume then checks those bindings under the held fence and atomically
changes only the initialization receipt's configuration digest. No YAML or
template is written; prior work retains its old configuration and remains stale.

Queued/active ownership, active leases, started/uncertain assignments and issued
native actions without observations block preparation or receipt mutation.
Suspended rows and unissued ready requests alone are not effects. Restore only
abandons an exact baseline YAML/receipt operation: release its own fence and
record `abandoned_no_effect`, `rollback_performed:false`. It restores no source,
receipt, bundle or snapshot. Actual rollback is unsupported; forward resume is
required after a configuration/receipt effect. These are cooperative local
bindings, not physical exclusion or user Runtime acceptance.

The exact `AGENT.sidecar.md` and root YAML manifest pair may retire deployment
ownership together while both local files remain. Other omissions are rejected.
Historical forward proof binds its own manifests. Selected mutable changelog
preservation is checked against safe current configuration after selected
bundle integrity validation. Retirement never authorizes filesystem deletion,
template replacement or an arbitrary mutable-output exception.

For a code-producing route, establish the smallest correct B/S/C trace, freeze
scope, implement, run the applicable focused checks, then reconcile affected
documentation. On one final sealed payload, run the required complete tests,
coverage, complexity/CRAP and mutation gates, three fresh independent reviews,
reverse validation and CLEAR. A changed payload invalidates its bound
assurance. Static checks and delivery cannot close Runtime acceptance; only
attributable testing of the installed fingerprint can do that. Cutover rollback
closes when the durable cutoff witness records the first admitted new-work
attempt before state writes. A later preparation failure does not reopen
rollback; recover forward. The retained selector path now uses canonical SQLite
immediate exclusion for witness publication rather than creating a persistent
wx marker. A terminated process releases that exclusion; historical orphan
markers still fail closed until supported repair or old-selector retirement.
No PID/age deletion, power-loss or SQL/filesystem atomicity claim is implied.

## Self-development protocol

Immediately save research results, accepted decisions and discussion outcomes
in the corresponding current product or project document. Separate verified
facts, proposals, accepted decisions and open questions; register ownership,
maps and lineage together. Chat or a work record alone is not the product
source of truth, and a research note is not a fabricated runtime receipt.

The agent product architecture is owned by `docs/system-specification.md` in
the source package. This protocol owns execution policy, not a second product
architecture specification.

When developer unblocking and migration are active together, prioritize verified
developer unblocking, then project migration to the actual runtime, then
optimization, then new functionality. Preserve the current acceptance and
authorization boundaries; preparation or source smoke does not imply installed
readiness or Runtime acceptance.

When changing the agent runtime, load the project sidecar, this section,
`TESTING.md` and the focused instruction before planning or editing. Reuse a
source-bound context while its bytes and authority remain current. Keep one
writer for overlapping paths. Use bounded independent agents for research and
required review; do not create a separate agent for each helper or file.

The main optimization target is fewer agent execution steps without loss of
required quality. Remove repeated discovery, handoffs, state writes and test
runs, while preserving each authorization, CAS boundary, failure state, review
and evidence class. Batch mechanical host operations only when the same checks
and recoverability remain observable. Run focused tests while editing and the
full assurance wave after the payload is stable. Do not claim a measured
reduction without a comparable baseline.

Test-speed changes must reduce comparable end-to-end wall time while retaining
the same checks and verification semantics. Compare the same tool versions,
resources and cold/warm conditions; report resource, cache and load variance
that limits the comparison. Increased timeouts, skipped checks or weakened
verification do not count as gains. Report measured and estimated savings
separately. Continue only while the next safe expected end-to-end saving is at
least 5%; stop below that threshold.

Measure short-command and control-return latency; target less than two seconds,
and investigate and optimize overruns. Start long tests, builds and installs
asynchronously and return control early. Report actual end-to-end duration
separately: an early yield is not faster execution. Reuse verified dependencies,
warm caches and exact deltas without skipping or weakening checks or forcing
timeouts. Record a tool's unavoidable minimum-latency exception explicitly.

Agents do not calculate, copy, paste, request or enumerate hashes as manual
work steps in prompts, work records, reviews or routine handoffs. Pass the
runtime's returned version and typed identity through its public operation;
the runtime computes essential byte and content bindings at the trust boundary.
An expected in-scope source edit does not start a new work attempt. It
invalidates only evidence and assurances that depended on the prior bytes,
which the lifecycle rechecks before delivery.

When distinct read-only configured roles can inspect the same frozen input and
do not require independence, one actual Luna invocation may return separately
typed observations for each already-issued role/action; record each response
against its own issue ID and receipt gate. Do not pre-run a later stage before
Mastra issues it. The final three blind reviews are fresh and independent;
batching logical role views never substitutes for those reviews.

Consult current official specifications only for unresolved framework or
platform mechanics; repository-specific authority comes from current local
contracts. A user directive updates its existing instruction owner and
maintained template in the same authorized work, with attribution in the work
record. Do not create a competing agent memory document or an additional
schema version to avoid repairing current artifacts.

Production functions target CRAP 1 for pure transforms, 2 for one meaningful
decision and 3 for compact coordination. CRAP 4 is reserved for a cohesive
critical invariant whose branch order matters, with negative and mutation
evidence. The release gate is `CRAP < 5` for every maintained function; low
CRAP never substitutes for security, migration or persistence counterexamples.

## Delivery and cutover

The delivery manifest separates deployable bundle and root integration files
from repository-only tests, product documentation and work evidence. Under one
maintenance fence, drain in-flight work, archive source bytes, apply the sealed
cutover manifest with per-file CAS and journal, install exact sealed
bundle bytes, verify integrity, then start one new task on clean state. Neither a copied
directory nor a passing static suite proves the delivered runtime works.
Release the fence only after the active state and installed package are valid.
