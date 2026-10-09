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

All child or disjoint contours of one attributable human request reuse the same
original scope `attribution.thread_id` and `attribution.pointer`. Generated
intake filenames identify operational artifacts, not new human requests. A
genuinely changed human request supplies its own attributable reference; do not
introduce a WorkGroup key or derive request identity from an intake pathname.
Equal pointers preserve parallel contours of the same request. A different pointer may absorb eligible
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

Release source-file ownership after accepted terminal writer completion; hold no
implementation files during read-only tests, reviews or user Runtime wait.
A NEW terminal report validates current observed project-source snapshot before
binding `source_scope`. Cleanup of ALREADY durable exact success instead binds
its journal `reported_complete`, matching Host completed result and current
issue/reservation/generation/CAS. That durable match permits own-file release
even after prior lease expiry or permitted external-source drift. Neither expiry
nor drift alone proves completion. Preserve history, results, phase and
execution-only coordination; work remains incomplete and Runtime unaccepted.
A new execution-only lease grants no Source-write authority.

Perform release of own file rights and safe queued intents in one co-located
journal/work/shared-ledger CAS transaction. Drift stales byte-bound proof under
existing fresh-read/invalidation; do not keep a stale file lock solely for proof
currentness. Corrections acquire fresh scope/FIFO and invalidate changed-byte
proof only. Live/unobserved/started/uncertain/unknown/foreign/mismatched effects
stay fenced pending existing explicit terminal/quiescence reconciliation; agent
done, expiry and old Code packets cannot substitute.

Use one reconciliation at report/intake/recovery/suspend/successor with exact
retry/restart idempotency. The Source atomic report seam and historical cleanup
now use `commitCompletedSourceReport` and `reconcileCompletedSourceOwnership`;
qualification covers expiry/drift, fault, peer FIFO/retry and sequential writers.
Actual outcomes belong to the current release operation's evidence. Avoid nested ordinary CAS, new caller keys or schema fields. Native child
grouping retains stable orchestrating Root and exact repository/projects/pointer
boundaries; foreign sessions/projects stay outside absorption. Cooperative key
equality is not physical isolation; consumer changes remain its owner's scope.

Fresh Source admission, renewal, expired recovery and runtime-code-rebind share
canonical package-root runtime inventory through CLI/SDK. Public run requires
complete expected exports. First clean cutover archives or lawfully supersedes
old subset-engine intakes; no fallback or new-engine artifact conversion is
supported. Failed-before-admission requests use fresh canonical work in the same
chat. Preserve unknown effects; supersession grants no completion or Runtime
acceptance. Writer evidence does not substitute for independent qualification.

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

Known terminal partial Source work uses the public stopped-source capture route:
record the exact failed observation and unverified candidate, settle the matching
effect and release only its old rights in one Host transaction. Never infer a
terminal result from lease expiry, return a newer grant as an old capture result,
or replay the old writer. Completed readonly release uses configured bounded
egress and exact accepted observations; a wholly unissued downstream wave stays
inert. It requires no retroactive Source authorization and grants no new rights.
The system specification owns capture, retry and release guards.

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
The fixed `native-delivery-evidence` repair resets only stale tests, source-seal
and assurance joins for an original uninstalled `awaiting_assurance` operation.
It preserves the current release formats, source inputs, requests, results,
observations, review evidence and operation identity. It stores exact custody
before removal, uses the release admission and operation locks, and resumes only
from an exact beforeimage or absent postimage. The synchronous local test, seal
and assurance writers use the same lock order and deny an active or unknown
repair. Synthetic cases qualify Stage5; they do not qualify a payload or
authorize an original-target effect.
The public work-state repair is bounded to its declared optional transition
field and dependency preimages. Qualify its public inspect/plan/apply/resume/
restore behavior before live repair or a reader upgrade; it is not general
consumer migration proof. Read workspace baseline through the constructor-free
read-only public projection. Consumer full-snapshot rollback is allowed only
before first new admitted work and must retain maintenance/CAS through restore;
initialization or timestamps alone do not classify that boundary. Canonical admission-attempt persistence now precedes fresh
preparation. Source
consumer migration primitives preserve same-store historical row beforeimages,
use a synchronous filesystem callback under maintenance/transaction, and restore
old row semantics while maintenance metadata stays monotonic. Retain canonical
DB/WAL/SHM paths and partition work children; use a consistent backup, not live
root rename or physical database-byte equality. The async trusted-host SDK helper
binds
repository root/operation/actor/mode and supplies configured database paths plus
initial backup bytes, null on retry. Its filesystem callback is synchronous and
idempotent; unknown/inflight state denies effects. Interrupted restore keeps its
fence/restoring state for exact-operation resume. Current helper and
repository-only deployment adapter evidence is required before deployment; no
migration CLI is implied. SQL/filesystem effects are not claimed atomic and old tasks are not migrated.
Use the existing executing package root for research-repair validators,
dependencies and schemas; consumer artifacts stay rooted in the explicit project.
Do not use a copied consumer package or alias fallback. Optional missing journal
inspection is read-only only for fresh contexts without retained Host assignments;
retained started/uncertain effects with missing journal fail closed, never infer
quiescence. Standalone fixtures use supported OS temporary directories or explicit isolated
roots with owned cleanup; Source-workspace scratch is ignored outside package
Source.
Read dynamic version/readiness, qualification, installation and Runtime status
from public release state and current work/operation evidence, not living
instruction snapshots.

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

For a code-producing task, establish its B/S/C trace and exact scope. Run
focused behavior checks while developing and the full applicable task suite
once after corrections. Perform the independent reviews required by the
changed risk once for that task. Keep security, data and explicitly required
quality checks in this development lane. Reuse current evidence; invalidate
only proof affected by changed inputs. Reconcile changed documentation once.
Formation and installation do not rerun these tasks or require another review,
coverage, mutation, reverse-validation or documentation cycle. Delivery cannot
grant user Runtime acceptance.

Cutover rollback
closes when the durable cutoff witness records the first admitted new-work
attempt before state writes. A later preparation failure does not reopen
rollback; recover forward. The retained selector path now uses canonical SQLite
immediate exclusion for witness publication rather than creating a persistent
wx marker. A terminated process releases that exclusion; historical orphan
markers still fail closed until supported repair or old-selector retirement.
No PID/age deletion, power-loss or SQL/filesystem atomicity claim is implied.

## Self-development protocol

Use the latest stable published version of every package and development tool.
Before adoption, retrieve current official package metadata, release notes and
API documentation. Adapt affected code to breaking or behavioral changes and
use new capabilities when they improve the authorized task. Qualify the adapted
behavior before adoption; do not preserve an obsolete version merely to avoid
the necessary code correction. After qualification, retain exact version, lock
and immutable action bindings for reproducible execution; floating `latest`
references do not establish an up-to-date or qualified installation. Record
available, prepared, qualified and installed versions separately, with explicit
GAPs when the current environment or accepted Source has not been updated.

Keep all reusable VIDA behavior host-independent. Never introduce a mandatory
dependency on a particular machine, operating system, desktop application or
provider for recovery, authentication, authorization, execution or assurance.
Use portable contracts with replaceable, separately qualified boundary adapters;
platform-specific mechanisms must not define core identity, rights or policy.
In the human-given isolated agent environment, the trusted active session and
controller with attributable target-specific human intent define the internal
recovery-review boundary. Do not require external issuer, OS, Desktop or provider
attestation for that internal route. Preserve original context, readonly scope,
canonical reservation, current CAS and UNKNOWN/no-reissue behavior. The caller
owns actual native invocation, observation and same-thread request/result body
custody. Core verifies cooperative report consistency; a review grants no Source,
owner disposition, configuration adoption or Runtime rights. Separate Source
admission remains required. The current product contract is owned by
`docs/system-specification.md#host-independent-recovery-review-ingress`.

All subsequent native agent launches and resumes use `gpt-6-luna` for every
role under the current human model directive. Finish an already issued native
invocation under its original bound model; never rewrite its configuration or
report a different model retroactively. A configured model conflict requires
the supported typed configuration/rebind route before a new dispatch.

For delivered-configuration drift, preserve desired repository bytes, local
accepted initialization and historical work bindings as distinct identities.
Use the recovery-control boundary before ordinary execution admission; load
the original configuration and engine/request evidence rather than deriving old
rights from current YAML. Disposal grants no execution, configuration adoption
or Runtime acceptance. Preserve original snapshots, attempts, FAIL/UNKNOWN and
owner identity, with journal/work/ledger/maintenance CAS and FIFO. An owner handle
or caller JSON is cooperative evidence, not caller authentication. Missing
trusted live caller authority blocks effects. Do not infer engine absence from
Host journal absence or copy another host's operational state during delivery.
The architecture, finite supported predicates and repair/adoption/retention GAPs
are owned by `docs/system-specification.md#recovery-across-delivered-configuration`.
Artifact repair must be shipped before changing an active strict operation;
same-attempt correction needs its own current execution authority. Standing
human authoring permission remains valid within its accepted scope; apply the
required review and fresh ownership gates without asking the same permission
again. Human-authorized app reports do not substitute for native issuance,
Source rights or Runtime acceptance; reconcile uncertain sends before retrying.

Immediately save research results, accepted decisions and discussion outcomes
in the corresponding current product or project document. Separate verified
facts, proposals, accepted decisions and open questions; register ownership,
maps and lineage together. Chat or a work record alone is not the product
source of truth, and a research note is not a fabricated runtime receipt.

The agent product architecture is owned by `docs/system-specification.md` in
the source package. This protocol owns execution policy, not a second product
architecture specification.

Select dependency-ready self-development work by one prior qualitative estimate
of the largest workflow, execution-step and token benefit. Shared developer
unblocking takes priority; respect installation dependencies before migration
or new functionality. Freeze one whole dependency-ready engineering outcome.
Subfixes, tests and reports are not separate completed tasks. Preserve acceptance
and authorization boundaries; Source smoke does not imply installed readiness.

When changing the agent runtime, load the project sidecar, this section,
`TESTING.md` and the focused instruction before planning or editing. Reuse a
source-bound context while its bytes and authority remain current. Keep one
writer for overlapping paths. Use bounded independent agents for research and
required review; do not create a separate agent for each helper or file.

Ordinary work uses the configured VIDA runtime lifecycle exclusively. When
that lifecycle is blocked, repair its cause locally as an architectural Source
code change, then immediately update the whole qualified runtime through its
existing owner and resume the configured flow. This bounded exception does not
authorize private-state edits, fabricated admission, replay of `UNKNOWN`
effects, weaker controls, a new authorization framework or partial-agent
delivery. Preserve current Source ownership, CAS, final assurance and native
qualification requirements.

The repository owner's explicit emergency instruction may authorize the lead
developer to repair Source manually when the runtime's own admission, lease or
recovery defect prevents its supported repair flow. Record the original work,
attempt, terminal blocker and instruction once. Limit this exception to the
causal code, regression checks and maintained instructions; retain one writer
and inspect competing claims before edits. Do not fabricate a live lease,
rewrite private operational state, replay UNKNOWN effects or treat the exception
as Runtime acceptance. Verify the correction, update the whole qualified system
runtime, then recover the original attempt through its repaired public operation
and return to the configured flow. Do not repeat the same permission question.

For an admitted task with a separate Source root, inspect its current task-source
operation before Source tool calls. Use the returned `SourceExecutionContext/v1`
working directory for those calls. Keep configuration, intake and operational
state in the canonical Host root. The projection does not grant Source rights;
current ownership and policy checks still apply at the effect boundary.

The main optimization target is fewer agent execution steps without loss of
required quality. Remove repeated discovery, handoffs, state writes and test
runs, while preserving each authorization, CAS boundary, failure state, review
and evidence class. Batch mechanical host operations only when the same checks
and recoverability remain observable. Run only focused agent behavior checks while editing
and run the full applicable current task suite once after its corrections are
complete. Reuse that current evidence in the mandatory installation assurance
wave; do not repeat the full suite after each subfix.
Collect terminal failures and review findings before starting a correction batch.
Join disjoint writers before checking the batch. Workers do not each launch the
same checks. One selected completion run may also serve as the regression check;
do not run the same cases again under another command name. After a failed full
run, recheck changed behavior and its direct callers only. Retain the failed run
and reuse passing evidence only where its affected inputs remain current.
Do not add a full candidate cycle solely to score an individual outcome or
interrupt a long check already running. Reuse accepted evidence only while its
inputs remain current; changed inputs invalidate their affected proof.

Keep files and context proportional to one responsibility. Use size and observed
co-change as review triggers, not hard line or token caps. Extract cohesive pure
contracts and validators before transaction code; HostState remains the single
CAS owner. Command entrypoints route to existing focused handlers. Tests split
by behavior and share fixture setup only when semantics match. Each document has one owner.
Read the relevant symbol or section first; use typed IDs and compact status
projections, then retrieve exact evidence only when required. Do not copy large
work, Ledger or receipt bodies into prompts or parallel summaries. Preserve
current passing proof through one correction batch and one delivery checkpoint.
Use the directly returned CI run ID and current operation; do not scan history
for routine correlation. Do not create extra architecture or benchmark lanes
solely to reduce context. A split must reduce repeated reads or change coupling.

For authorized agent execution optimization, use at most ten iterations.
Find one evidenced bottleneck, apply its smallest portable correction, run its
focused regression, then inspect the remaining path. Reuse existing execution
logs; do not start a separate scoring lane. Stop when no safe useful correction
remains, and record the remaining limits. Run the full applicable task suite once
when the corrections are stable, then perform current final assurance.

Select exact affected test files/cases and direct callers during development,
including configuration/schema/filesystem/subprocess dependencies outside static
import graphs. Reuse current build outputs and immutable prepared fixtures while
their inputs remain unchanged; mutable consumer state and required live integrity
checks remain separate. The launcher and ordinary test phases have no implicit
total-duration limit. Explicit caller/host deadlines and operation-specific case,
probe, install and cleanup/report bounds remain binding; malformed input rejects
before effects. An unbounded command does not serialize Infinity into a native
timeout or deadline metadata. A removed limit is not measured speed improvement.

Use the prior estimate only to rank ready work. Do not create a separate achieved-
savings, ROI, benchmark, token-accounting or repeated optimization-scoring lane,
including OPT19. Estimated benefit is never measured evidence. Preserve every
functional, security, data and mandatory numeric quality gate; increased
timeouts, skipped checks and weakened verification do not establish improvement.

After each whole verified engineering outcome, update the authorized local
system agent with the selected exact artifact and its declared version.
Version equality is not byte identity. Preserve the original operation, failed
or UNKNOWN effects and historical evidence. Reconcile uncertainty before retry.
New dependent effects wait for the actual installed byte/version/PATH proof.
This checkpoint does not grant user Runtime acceptance or registry publication.

### Formation and installation policy

Each new successful build advances the product version. The release owner
selects the next version before Source publication and formation. Default to
the last confirmed successful build's PATCH plus one. An explicit human request
may select the next MINOR or MAJOR version, or a specific higher version. MINOR
resets PATCH to zero; MAJOR resets MINOR and PATCH to zero. Keep package,
request, manifest, native executable and formation result versions equal.

Confirm the new baseline only after successful formation and artifact
publication. A failed or UNKNOWN build does not confirm or consume its version.
Resume its exact pending operation instead of allocating another version.
An exact completed retry returns the existing artifact; it does not form another
package with the same version. Serialize version selection through the existing
release owner. Preserve historical operations and receipts. Installing an
already selected artifact does not advance its version or require a new build.

Persist each current CI terminal result and published artifact before closing
its release operation and confirming the version baseline. Use the existing
owner locks and CAS. Normal next-build selection reads the current operation
and confirmed baseline only. Do not census historical CI requests on that path.
Historical unresolved work uses an explicit supported recovery command;
preserve its FAIL/UNKNOWN custody and return one actionable next step.

The Source release tool exposes `--prepare-after-disposition --proposal REL`
for that one-time recovery. It reads a bounded local consistency proposal and
revalidates it under the existing owner lock before version preparation. The
proposal grants no Source or Runtime rights. Normal `--prepare` uses the current
operation and confirmed baseline; it does not discover historical requests.

This section is the single owner of this policy. Package qualification consists
of actual successful formation provenance, declared Source and version, target
platform, and exact archive/manifest/native byte integrity. The current CI result
declares only native-build. This is delivery qualification, not evidence of
functional testing. A supported historical profile that explicitly declares
seven checks still requires all seven; never rewrite old claims as minimal proof.

Do not run test suites when forming or installing a package. Do not require
fresh task reviews, coverage, mutation, a new seal or CLEAR for every formation
or installation. Those belong to the changed development task and are reused
while current. An unchanged selected artifact needs no new build or Git effect
solely to install it. Publish changed reviewed Source before its CI formation.

Use four delivery steps: publish changed reviewed Source, issue one cached CI
build, retrieve and qualify its exact artifact, then run the maintained installer.
On every build or installation change, remove repeated work and duplicate
scripts before adding another step. Reuse the existing owner, current evidence
and returned results. Keep this simplification part of ordinary maintenance.
Keep one current operation and its confirmed baseline. Reuse the selected run,
download and current task evidence; do not rediscover them at every step. Observe
cache restore/save in that run. Cache absence is not an installation gate.
No extra candidate cycle, prerequisite probe, repeated review, numeric run or
documentation closeout belongs to delivery. Recovery runs only after a real
failure or uncertain effect and resumes that exact operation.

Use one maintained platform installer. Windows uses install-windows.ps1 with
the selected local EXE/ZIP or direct HTTPS address and install/update/uninstall.
It checks the selected bytes and manifest platform, replaces the fixed command
with a transient previous file, and observes installed version and bytes. The
session confirms effective PATH once. Failure preserves recovery custody;
conditional rollback never overwrites a drifted target. Remove the exact owned
previous consumer binary only after verified success. Preserve project state.
No prerequisite probes, installation test suite or permanent predecessor tree.

Use the installer's successful structured result for that target's version and byte
postcheck. Do not repeat those same reads or CLI launches in a second observer.
The target environment installs the immutable CI artifact independently. Its
integrity and platform checks use artifact metadata, not the developer's Source
files, local paths or Host state. Installation observations belong to that
target; they do not prove another environment's admission or runtime freshness.
Project configuration, recovery and work-admission inspection are separate
operations, started only when the current task needs them. They are not
installation postchecks or reasons to reinstall a successfully updated asset.

After every successful whole-system runtime update, notify the configured
TeamLead through the authorized coordination channel. Reuse the current delivery
result. State the installed artifact/version, tasks and fixes delivered, actual
original-work recovery result, and remaining blockers. Name the developers or
work items that can resume only when their supported continuation and current
rights are confirmed. Installation success alone is not developer unblocking.
Notify before dependent next-batch work; do not add a test, build or duplicate
installation observation to send this message. Retain the sent-result reference.

Target short-command and control return below two seconds; retain existing
elapsed/failure diagnostics without a separate optimization measurement lane.
Start long tests, builds and installs asynchronously and return control early;
an early yield is not faster execution. Reuse verified dependencies, warm caches
and exact deltas without weakening checks or forcing timeouts. Record an actual
tool minimum-latency exception when it applies.

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

Before research, resolve the canonical target from the current ProjectContext
and sidecar. Anchor every search, file operation and shell command to that
absolute target or its explicit working directory. An inherited working
directory or mirror is not target authority. Negative findings name the actual
target and bounded searched scope; inactive copies are labelled provenance.

For every reported defect, perform a bounded web search of current official
specifications relevant to the failure, including external agent frameworks in
`docs/research/agent-framework-reference-registry.md`; do not limit research to
installed dependencies or require every listed framework for every defect.
Record verified sources, applicability and the chosen invariant in current
product research and decision documents. Repair the shared root cause and its
single state or contract owner, reconcile affected callers, and retain one
behavioral regression. Reuse existing framework primitives; an architectural
fix does not require new abstractions. Reduce agent execution steps, commands
and handoffs, streamline existing commands and keep outputs compact and
actionable while preserving authorization, recovery and evidence semantics.
Existing execution diagnostics remain separate from estimates; fewer steps or
larger timeouts alone prove no speed improvement. References inform mechanics;
current approved local contracts retain authority. An inaccessible relevant
source is an explicit research GAP, never fabricated support.
A user directive updates its existing instruction owner and
maintained template in the same authorized work, with attribution in the work
record. Do not create a competing agent memory document or an additional
schema version to avoid repairing current artifacts.

Run the final applicable behavior check and numeric checks sequentially on
stable Source. Keep one writer for coverage, CRAP and mutation outputs. If
concurrent heavy runs caused a case timeout, inspect its child outcome and run
the exact affected case in isolation before changing its declared bound.
Retain failed and UNKNOWN evidence; an isolated pass does not erase either.

Agent behavior tests, coverage and CRAP run locally. Build, packaging and
installation checks belong to CI/CD and are not local agent test tasks. Do not
create or run build/install test suites, compiler probes or copied-package
installation harnesses. CI/CD may run these delivery checks, but not agent
behavior tests, coverage, CRAP or mutation. Mutation requires an explicit manual
launch. Missing local or CI/CD evidence remains a GAP, never a pass. Tests and
comments describe the current architecture and supported behavior, without
narratives about absent legacy implementations. Formatter/TypeScript 7 hooks and
pre-push coverage/CRAP remain proposals for discussion; do not install or activate
hooks from this policy.

Apply `TESTING.md#new-and-modified-files` to every new or modified production
file. Developers author and correct the tests for their feature/fix within their
owned scope; independent validation remains separate. Vida-Test escalates
discovered product/runtime defects and test-tooling blockers during refactoring
to TeamLead with reproducible evidence instead of taking over production fixes.
Unchanged legacy improvement remains separately scoped, with affected gaps explicit.

`TESTING.md#evidence-and-quality-gates` owns the frozen per-function/risk CRAP
and complexity budget, non-regression baseline and independent coverage/mutation
criteria. The historical fixed executable CRAP gate remains an implementation
GAP until its separately qualified reconciliation. Do not claim a documentation
update implements a gate, changes a current installed instruction, or qualifies
missing numeric evidence. Verify actual runtime/runner versions for every check
and distinguish adapter, Source and installed executable observations.

Exact coverage/mutation targets and frozen budgets govern development and
truthful completion of its checks. They add no numeric barrier to the minimum
native formation/install profile or supported developer unblocking. Follow this
protocol's formation and installation policy without suites or repeated task
checks or reviews solely for those operations. Keep missing measurements pending
or GAP, separate from delivery and Runtime acceptance. Causal functional defects,
Source rights, CAS, UNKNOWN custody and integrity remain with their current
owners and required controls.

An explicit human standing instruction scoped to a Source repository may satisfy
its Git commit/push permission requirement. Apply that repository's Sidecar
exception and release order; do not transfer it to a consumer project or infer
Git authorization from Runtime acceptance. A failed package is no successful
formation trigger. The orchestrating session performs authorized Git operations;
the package release command remains outside Git. Qualification follows declared
current source-file and exact archive bytes; ordinary commits with unchanged
included bytes do not invalidate it. Changed included inputs invalidate their
affected proof, without manual integrity replay. This changes no generic
assurance or Runtime acceptance gate.

Public agent delivery uses only one standalone native executable per qualified
target with embedded pinned Bun. Preserve the generic runtime, public commands
and every maintained SDK library export. An SDK/npm artifact is library evidence,
not an alternative agent installation or a completed native checkpoint.
Public agent CLI installation through npm is not supported; npm artifacts serve
SDK library imports only. Direct installation/first run must require no
external Node/npm/Bun or first-run download. Package-owned immutable resources
use safe private version/payload-bound materialization when physical paths are
needed; consumer configuration and DB/WAL/SHM stay external. Reject unsafe,
partial or tampered resources without weakening native attestation, Cedar,
fs-safe, ProjectContext, CAS, maintenance or Mastra/LibSQL. Use actual full-product
native target checks, not a thin probe or assumed loader ABI.

Use the formation and installation policy above for the current delivery.
Keep one pending operation/version and exact asset identity. Formation proof,
physical installation and user Runtime acceptance are separate observations.
Use supported bundle-owned repair before changing active artifact contracts or
retargeting an uninstalled operation. Read historical explicit requirements as
declared; a new minimum profile does not weaken an old seven-check profile.
The maintained PowerShell adapter owns Windows physical install/update/removal.
It preserves npm shims and consumer state, and keeps the prior binary only for
the current recovery window. Qualification does not rerun task assurance.
Unblock waiting developers only through actual installed behavior and normal
admission. The GitLab runner target question remains separate and unanswered.

The final native manifest specifies target, destination, PATH, prior-install and
rollback effects; npm global installation cannot establish agent delivery.
Maintain every public SDK export. Pinned deterministic compile/minify/bytecode,
retained names and disabled ambient configuration need measured evidence for
optimization claims. Prepared CI/release notes/publication scripts create no
registry/GitHub publication authority or Runtime acceptance. Fresh final three
reviews, reverse validation and CLEAR bind the changed final source and assets.

For Source self-development, use only the bundle-owned prepare/inspect/verify and
controlled-execution seam with a qualified immutable current-candidate controller
outside the editable target. Preserve logical `runtime.bundle=packages/agent`,
actual target repository/project/request attribution and existing scope/lease/CAS
controls; controller code remains independent of target source revisions. Reject
construction for a target with an active selector and retain selected-root
containment. No predecessor fallback, worktree/FIFO escape, global PATH change,
production selector activation or general consumer controller mode is authorized.
Require actual pinned SDK/dependency/native/resource and isolated init/scope/
admission/own-target bin-addition report evidence before readiness. Revalidate
immutable controller identity and integrity before controlled execution. Target
edits continue the existing attempt through that controller while invalidating
affected byte-bound proof. Operational qualification metadata grants no approval,
lease or Runtime acceptance; authorization controls do not promise physical
isolation or global unrelated-edit detection. A copied controller alone is not
qualified, and manual integrity-value handling is unnecessary.

## Delivery and cutover

The delivery manifest separates deployable bundle and root integration files
from repository-only tests, product documentation and work evidence. Under one
maintenance fence, drain in-flight work, archive source bytes, apply the sealed
cutover manifest with per-file CAS and journal, install exact sealed
bundle bytes, verify integrity, then start one new task on clean state. Neither a copied
directory nor a passing static suite proves the delivered runtime works.
Release the fence only after the active state and installed package are valid.
