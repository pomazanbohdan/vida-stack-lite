# Agent runtime system specification

Owner: agent product maintainer. Class: canonical living system specification.
Repository-only source trace (not an installed consumer dependency): the current attributable repository/distribution and developer
unblocking decisions in `.agent/work/core-cloud-continuation-20261002/WORK.md#native-only-public-delivery-decision`.
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

The only public agent distribution is one native `vida-agent` executable per qualified
OS/CPU target, embedding Bun 1.4.2. Direct installation, public commands and first
run require no external Node, npm or Bun executable and no first-run network
bootstrap. Every existing public SDK export remains a maintained library
interface; an executable does not replace in-process imports or declarations.
Public agent CLI installation through npm is not supported; npm artifacts serve
SDK library imports only. Source development/publication tools may have their own
prerequisites. Native delivery binds the complete selected artifact, declared target and successful
formation provenance. Task behavior is verified in development, not at installation.

The PATH command preserves supported public commands, aliases, arguments, exit
behavior and `vida-agent instructions --path NAME`. Immutable embedded schemas,
templates, instructions and native/WASM resources materialize when physical paths
are required into a private cache bound to the product version and exact payload.
Unsafe paths, partial publication, tampering and conflicting materialization fail
closed; original guarded-filesystem native attestation is preserved. Consumer
YAML, project documents and database/WAL/SHM remain external under the explicit
`--project-root`. Generated instructions use public discovery, not a copied
implementation or machine-specific installation path. Generic runtime behavior,
ProjectContext, ownership/CAS, maintenance, Cedar, fs-safe and Mastra/LibSQL
semantics remain unchanged. A convenience ABI or loader flag is not established
as a supported mechanism without actual target qualification.

Recognized `GAP-VIDA-RUN-CLI-*` failures retain their code-defined public message
before phase/reason inference from parser text. This keeps unsupported-argument
diagnostics stable when usage text contains lifecycle option names. The blocked
JSON envelope, exit code 1, existing next-action suffix and runtime/context
detail mapping remain unchanged; private parser text is not exposed.

Source native construction uses the pinned Bun compiler and a frozen production
install into a private physical copy. It includes the existing package-owned
code, schemas, instructions, templates and production native/WASM resources in
one executable. The executable serves its own Bun child runtime. It creates no
consumer dependency installation or first-run download. Native build outputs
bind current source inputs and one actual target; their presence grants no
release qualification. SDK packing derives a separate library manifest that
excludes native assets and standalone scripts while preserving exports.

Physical resource publication uses an exclusive per-payload lock, private sibling
staging and a single rename. Concurrent callers reuse only the complete verified
result. A bounded wait rejects an unfinished or uncertain publisher without
stealing its lock. Failed private staging remains available for inspection.
Before a command uses the materialized runtime, it checks the exact regular-file inventory and bytes; partial, changed,
linked, hardlinked or foreign entries reject without replacement. Consumer state
is outside the version/payload cache.
The immutable cache is reconstructable executable data. The owned publication
lock is flushed before file writes; cache files do not require individual
persistence flushes. Namespace publication remains atomic and every launch
verifies all bytes before using them, so an incomplete cache after interruption or power loss
rejects. This policy does not alter database, source, approval or release-journal
durability.
Version and help use the same public CLI formatter with the immutable compiled
manifest and do not materialize or read unused runtime resources. They grant no
work, source-write or Runtime authority. Instructions and the exact read-only
install --check route materialize one immutable discovery view: all instructions,
the existing installer-protected inputs, maintained bunfig.toml and public CLI/formatter. They use
the same lock, exact inventory and byte checks, with a view-specific payload
identity; unused production dependencies are not materialized. Any runtime, initialization or other install route uses the complete payload in its separate immutable cache.
The discovery view does not establish dependency, full-product or Runtime
qualification. Runtime resource creation uses at most
eight disjoint asynchronous file writes per batch and waits for every write to
settle before any failure releases the ownership lock or permits publication.

The SDK library package derives its root from module location and validated
identity, owns dependencies and resources, and checks declared ESM entrypoints
without loading dependency code. Import-only exports remain valid; absent
entrypoints block initialization. It does not use consumer source or `NODE_PATH`,
and initialization does not install dependencies in the global package.

Package changes cannot silently reinterpret active consumer artifacts. A
functional bundle-owned current-v1 repair must bind exact preimages, source,
authorization and current versions, apply atomic changes with recovery, and
repair configuration, initialization, selector and generated instruction
pointers before retiring the former consumer bundle. Existing consumer v10
and unrelated files remain until the replacement is verified. Prior tasks
are preserved as inactive provenance; new work does not inherit their rights.

## Development task packet text screening

The public `buildDevelopmentTaskPacket` boundary screens free-text packet fields
and string-list values before constructing `DevelopmentTaskPacket/v1`. It
rejects explicit credential assignments and formats, including passwords,
tokens and API keys, authorization and cookie credentials, client secrets,
private-key material, bearer values, compact JWTs, cloud signature credentials and
URL user-info credentials. A clearly redacted placeholder remains acceptable.

Short protocol words are contextual: a bare `state`, `session`, `code`, `sig`
or `signature` label does not make ordinary prose sensitive. Text such as
“Both Source documents explicitly state: …” and labels such as `state: pending`,
`session: active`, `code: generated` and `signature: required` are valid.
Qualified OAuth/OIDC parameters, SAML response values and session identifiers
remain sensitive in their protocol context, including `state`, `code`, `nonce`,
`SAMLResponse`, session identifiers and their actual URL query values.
The same rule applies wherever text is supplied to the packet, so selecting a
different field cannot bypass it. Supporting rationale and official reference
applicability are recorded in the [packet-text screening applicability](research/agent-framework-reference-registry.md#packet-text-screening-applicability).

## Build version selection

The existing release owner selects one version for each new build operation.
Default to PATCH plus one from the last confirmed successful build. A requested
MINOR increment resets PATCH to zero. A MAJOR increment resets MINOR and PATCH
to zero. An explicit version must be valid
and higher than that baseline. The controller fixes the version before reviewed
Source publication; CI forms exactly that declared Source and version.

Successful formation and artifact publication confirm the baseline. Failed or
UNKNOWN attempts leave it unchanged and retain their pending operation. An exact
completed retry returns the existing result. A new successful build must not
reuse a completed version. Concurrent requests serialize through the existing
release owner; they do not create a second version ledger. Package metadata,
native version, archive, manifest and CI result must agree. Installation preserves
the selected version and does not create another build.

The release owner persists the actual CI terminal result and selected published
artifact against the current request. It then closes that operation or records
its exact failed or UNKNOWN state under the existing release locks and CAS.
An acknowledged completion has one durable result and one confirmed-version
pointer. Lost acknowledgement retries return that result without another build.
An observed failed CI conclusion is a failure, not an unknown outcome.

Ordinary selection reads only the current operation and confirmed build
baseline. It does not enumerate earlier request directories or query their
runs. A historical unresolved operation uses a separate supported recovery
command once; its retained history does not become a routine build gate.
Recovery preserves previous requests, results, FAIL and UNKNOWN evidence.

The version has the normal MAJOR.MINOR.PATCH form defined by
[Semantic Versioning](https://semver.org/). This product uses automatic PATCH
increments by human policy; a version number alone grants no qualification or
Runtime acceptance.

## Source development controller

The bundle-owned development-controller seam provides prepare, inspect, verify
and controlled execution for this Source repository, whose target has no active
runtime selector. Construction rejects a target with an active selector; existing
selected-root containment remains unchanged. General consumer controller mode is
outside this contract. An immutable qualified current-candidate package root
outside the editable target supplies actual runtime modules, while the target's
logical `runtime.bundle` remains `packages/agent`. This is explicit execution-
package selection, not a target worktree, alias, installed predecessor fallback,
FIFO bypass, global PATH change or production selector activation.

Existing current-v1 bindings already separate target `source_revision` from
controller `runtime_code_digest` and code paths. Preserve repository/project
identity, original human-request attribution, exact target scopes, Host/Work
state, authorization, leases and CAS without adding schema fields or WorkGroup
identity. Expected authorized target edits continue the same attempt through the
unchanged controller and invalidate only proof bound to changed target bytes.

Prepare constructs a candidate controller and operational qualification metadata;
inspect reports actual construction/readiness without granting authority. Verify
requires pinned current SDK exports, dependencies, native/resource integrity and
actual isolated initialization, scope, admission and an own-target bin-addition
report regression before readiness. Controlled execution revalidates those
bindings and rejects controller drift, wrong package identity, pin or dependencies.
A copied tree alone is not qualification. Internally computed bindings travel
through supported operations; callers do not manually compute/replay hashes.
Qualification metadata cannot grant human approval, a lease, delivery or Runtime
acceptance. Outside-scope authorization denies undeclared writes; this does not
promise physical filesystem isolation or detection of arbitrary unrelated edits.
Public controller output presents compact status, typed identity and next action.
The complete inventory remains in the private manifest and exported API. Parent
verification checks the complete package before and after the child qualification;
the child returns the supplied exact binding without duplicate inventory walks.
Opt-in bounded stage markers expose install and snapshot elapsed time. These
changes do not claim a speed improvement without comparable measurement.
No current controller or successful qualification is inferred from this contract.

Each controller child runs under one exclusive compound reservation at
`<controllerRoot>/observations/`. The controller retains the exact executable
and arguments, parent and child working directories, pinned runtime context,
start and end times, terminal status, signal or spawn error, and the complete
stdout and stderr bytes before returning, summarizing or throwing. These records
are sensitive controller-owned operator evidence: the environment map and its
values are not persisted, but captured arguments, paths or streams may contain
sensitive text. The portable core does not define or enforce the host's
filesystem authorization policy and makes no OS-principal confidentiality
guarantee. The public CLI keeps its existing bounded, redacted diagnostics. The
immutable qualification's three declared repair children are nested under the
active parent reservation. The parent completes only after every declared child
has a complete retained receipt. Completed observations remain after
qualification-fixture cleanup. An incomplete or `UNKNOWN` child outcome, a
collision, or failed receipt persistence retains the exclusive reservation
across process restart and blocks every independent child launch. There is no
implicit retry, alternate observation root or cleanup path; the existing
lifecycle must establish a supported disposition. Controller and qualification
child timeout and output bounds remain unchanged. These receipts are Source
evidence and grant no admission, authorization, delivery, installation or
Runtime acceptance.

Initial controller-root inspection has a separate fail-closed diagnostic. If only
the first `canonicalDirectory(controllerRoot)` call throws a typed `ENOENT`, the
inspector retains the original filesystem error on `cause` and reports
`Development controller root is unavailable.` The public CLI keeps its blocked
`GAP-DEVELOPMENT-CONTROLLER-001` envelope and does not emit the filesystem path.
This applies to absent and dangling roots; it does not create or recover a
controller or grant execution rights. Later missing `controller.json`, malformed
metadata, permission failures and other non-ENOENT errors retain their existing
outcomes.

The existing `reconcile-artifacts --kind runtime-config` operation accepts a
schema-valid change limited to the executor model and reasoning, or the exact
maintained prewriter workflow delta. Prewriter adoption supports multiple
configured projects and preserves their registry, integrations and other
settings exactly. It does not
select a model on the caller's behalf or reinterpret an issued invocation.
Selected consumer installations retain their selector binding. Source without a
selector requires the `agent` project at `packages/agent`, a private workspace
that declares that package, the `vida-agent` package identity and its complete
maintained executable inventory. In the existing operation fields,
`selector_digest` binds selector absence and workspace metadata, while
`bundle_digest` binds the Source executable bytes. Every phase rechecks this
identity, inventory and selection; appearing selectors or changed bytes deny
continuation. No synthetic selector, alternate operation format or source lease
is created. The maintenance fence, unchanged-state CAS, exact YAML/receipt
checks and global quiescence remain mandatory. An expired active owner or an
unknown effect still blocks applying a new configuration. Only the public
operation updates the initialization receipt after the authorized YAML edit.

The frozen global-state digest includes each checked row's scalar metadata and
the SHA-256 digest of its exact stored payload bytes. Row parsing, integrity and
quiescence checks still run before aggregation; the aggregate omits duplicate
parsed values and raw payload text while preserving deterministic row order.

## Terminal observations and exact owner release

Task outcome, effect certainty and lease ownership are independent. A known
terminal partial Source invocation may be captured as `reported_failed` and its
Host invocation completed with that same failed observation. One Host transaction
settles the exact matching local source approval, records the unchanged issued
journal and an unverified candidate inventory, then releases only the old owner's
ticket, claim and lease. It preserves lifecycle phase, assurance, original issue,
configured stage/index, generation and immutable history. This is neither task
success, no-effect proof, acceptance nor a new grant. Unknown or still running
writer effects require reconciliation; expiry alone never proves a terminal
outcome. Cooperative local native evidence is consistency evidence, not a
cryptographic authentication or physical isolation claim.

The public `run --capture-stopped-source true` surface has explicit inspect,
plan, apply and resume modes. An exact approved manifest binds the original
owner/work/attempt/issue/reservation, terminal observation and candidate bytes.
Commit rechecks these bindings and current CAS atomically. Exact retry tolerates
unrelated disjoint coordination, but denies dependent work/journal changes or a
new overlapping grant even if that later grant has been released. Original
expiry remains in recovery evidence; ordinary released-ticket normalization does
not extend the old lease. Capture allocates no successor rights.

The public `run --capture-historical-terminal-synthesis true` route handles an
exact `synthesize_task` issue whose terminal body was produced but whose report
was denied and whose original Journal observation is still null. `inspect` is
read-only. It checks the retained body, follow-up input, denied report and the
complete parsed report body against the native observation, plus the original
issue, current configured context, Host ownership, engine state and exactly two
admitted predecessor results. The configured target stage must be a readonly
synthesize_task that produces ResearchSynthesis/v1; later readers rebuild the
two admitted predecessor identities and digests from the original Journal and
canonical records before accepting the receipt as a frozen candidate. The apply
call consumes the exact inspected bindings and rechecks Work, Ledger, Journal,
maintenance and original-owner FIFO state. One immediate Host SQLite transaction
stores an immutable receipt with the exact body bytes and provenance, releases
only that owner's exact ticket, claim and lease, preserves same-owner queued
tickets and prior ledger operations, and rejects unrelated proposed ledger
changes. It leaves the Journal and engine snapshot unchanged. The result is
known_terminal_unaccepted; the task remains unfinished. It grants no acceptance,
execution rights, Source authority or new lease. A retry returns only the
matching receipt after the Host verifies the current post-release Work/Ledger and
unchanged Journal; that check performs no write. Changed evidence or dependent
state denies. Resume requires that same exact prior receipt. Bounds, strict UTF-8,
original report denial, predecessor identity and current CAS checks apply before
the Host effect.

An apply call has a trusted-caller precondition: the current active session or
controller must still retain attributable human authorization for this exact
work, attempt and action. If that caller evidence is missing or lost, stop
before the Host effect. The installed CLI checks caller-provided handles,
pointers, inspected bindings and Host consistency; those values and checks do
not authenticate the human or grant authorization. A recovery review remains
read-only and is not authorization to capture or release the owner. The current
userRequestPointer identifies the current human intent and supplies the
release decision pointer. Separately, inspection binds
original_operation_reference to attribution.pointer in the exact accepted
scope bytes and binds those bytes themselves. The historical reference is
traceability evidence only; it is not caller identity or authority.

### Partial Source accounting after owner retirement

The distinct `run --capture-retired-source true` route uses
`RetiredSourceCapture/v1` inputs and receipts. The active stopped-source route
and its strict contracts remain unchanged. This route requires suspended Work
with no lease, its exact prior retirement operation and released original
ticket/claim, the original still-pending issue/reservation, an uncertain Host
attempt with null result, and its stored `commit_unknown` approval.

The trusted session retains the actual interrupted turn and original issue
mapping. All observed commands must be terminal; no Source writer may remain
active. An interrupted turn needs its attributable tool/turn records, not an
invented final message. The operator and original actor remain distinct.
`RetiredSourceTurnRead/v1` carries portable retained thread/turn records. A
Codex read export is one optional input adapter; it does not require Codex,
Desktop, a particular host or an external attestation. A historical child-agent
read does not establish the current operator's custody of the observed result.
Account for original mutation commands, referenced patches and file-change
events at the path level. Account for every later overlapping grant or
correction with its recorded terminal result. Order grants by ledger sequence
or revision, including tickets queued before retirement and granted afterward.
Missing attribution or unresolved competing effects deny application. Observed
original changes and later authorized corrections remain separate. This failed
result accounting does not require reconstruction of each historical file edit.
The current candidate snapshot describes an unverified scope, not attribution
of every current delta to the original actor.

One existing Host transaction follows
[SQLite transaction semantics](https://www.sqlite.org/lang_transaction.html).
It rechecks Work/Journal/Ledger/maintenance CAS,
records only `reported_failed` for the original issue, completes that Host
invocation, and applies only its matching approval. It preserves the retired
ownership, suspended Work, original scope, historical failures and attempt.
No new lease, Source rights, execution, retry or Runtime acceptance is granted.
Exact retries are idempotent; dependent writes and changed evidence deny retry.

Required development regressions cover missing/foreign terminal evidence,
wrong owner/issue/retirement, stale CAS, incomplete effect attribution,
overlapping active or unresolved writers, preserved later corrections, atomic
rollback and exact restart retry. The installed lifecycle owns final task
assurance and the whole-system checkpoint before live accounting. This is a
specified repair; installed availability and actual settlement need evidence.

`run --release-completed-readonly true` releases an exact completed readonly
owner without retroactive Source authorization. Accepted observations must match
the original engine, issue, configured read-only tools and bounded configured
egress hosts. A wholly unissued downstream wave is inert only with no issue,
observation, reservation, activation or normalization. Release never executes
that wave. Unknown/unbounded egress and issued writer effects deny this route.
The release decision uses the stored binding as provenance; current Source-file
or installed-package byte drift alone does not prevent relinquishing that old
readonly owner. Current configuration, original-engine completion evidence,
owner identity and Work/Ledger/Journal CAS checks still apply. Release changes
no source outcome, grants no write rights and establishes no Runtime acceptance.
Fresh writer execution requires ordinary FIFO ownership and current authority.

`run --retire-interrupted-source-owner true` provides `inspect` and `apply` for
one exact started Source writer whose provider result is unknown. Inspection
takes the target identity and attempt and the current owner's cooperative
`--native-session-handle`. It derives the unique pending Source issue, stored
approval and Work/Ledger/Journal/maintenance versions from the configured Host.
Apply consumes that returned projection, an owner decision pointer and
cooperative interruption evidence. It requires the handle to match the stored
intake, original lease and Source owner; no second active work, live lease,
execution capability or current Source/package byte equality is required.
Current configuration, project identity, original approval and CAS remain
checked. This narrow operation cannot issue Source writes or create leases.
The persisted owner and delegated Source writer are distinct identities: the
parent owner can remain active while the observed child is interrupted. The
owner decision explicitly correlates the held scope with that child without
inventing an original tool-call binding. The evidence records the source
thread as interrupted, references the actual `read_thread` and `list_agents`
observations, and lists no active Source writer IDs. These references are
cooperative evidence, not API attestation or proof of process-level
quiescence.

Apply performs one HostState transaction that marks only the exact started
attempt uncertain with a null result, releases only its Source ticket and
claim, and suspends that owner. It preserves the journal and `commit_unknown`
approval. It does not create a Source observation, no-effect proof, replay
right, new generation, source-write authority or acceptance. Exact retries are
operation-bound; active overlapping owners and earlier FIFO waiters deny
retirement. A retained exact apply request supports lost-acknowledgement retry;
changed requests or conflicting later ownership are rejected. The unknown effect remains unresolved, and late results stay
fenced from the released owner.

A known-terminal VERIFY failure may use the existing forward runtime-code rebind
under an explicit owner correction basis, exact attempt/live lease/CAS and verified
installed-package lineage. Preserve the original failed journal and Mastra snapshot;
then issue an explicit corrective generation through the existing Host operation.
The original INTAKE rebind and unknown-effect guards remain separate. Only current
runtime-bound evidence can support delivery; correction retires stale proof through
the lifecycle's existing invalidation rules. No automatic retry, acceptance or
configured assignment-index reinterpretation follows a runtime rebind.

## Local release workflow

After authorized source corrections, the orchestrating session forms exact
local native target assets and separately maintained npm/SDK artifacts through
the repository-owned release workflow. This is an authorized delivery effect, not user Runtime
acceptance. The initial package version is `0.1.0`. A verified successful CI
build advances the baseline for the next new build. Each new build selects the
next patch by default; the caller can request minor, major or a higher exact
version. A failed or unknown build does not advance that baseline. Recovery of
the same pending operation retains its operation and version, including after
formation; it does not allocate another version. Installation has its own outcome
and does not repeat version selection. A new delivery follows the existing
supported disposition of its predecessor. Durable publication state is project-owned under
`.agent/work/agent-local-release`, independently of scratch archive retention.
The pending, per-operation and successful receipts use the strict current
`VidaLocalReleaseState/v1` contract: package version, operation identity and
status are required; worker PID, timing, source/archive bindings, exact npm
metadata, installation-start marker and verified installed locations are
phase-specific evidence. Unknown fields and other schema identities are
rejected. Removing scratch output preserves uncertain effects in the durable
per-operation journal and cannot authorize replay.

The explicit repository-owned same-version system-update preparation preserves
the current successful manifest version and manifest bytes, allocating a distinct
operation after a completed update. The normal release allocator still advances
the next patch. Both use the same immediate admission exclusion and strict
current-v1 release state; no extra artifact field or alternate ledger selects the
mode. Same-version preflight validates successful pointer/journal identity,
version and successful status before allocator metadata effects. Pending pointer
and journal identities/versions must match, while their statuses may differ.
An unfinished matching update returns its actual journal status/install_started
without rewriting either record. An outstanding patch, missing/mismatched
baseline or unsupported manifest rejects without rewriting those artifacts.
The sole reconciliation exception is an exact completed pending installation:
existing archive and installed-tree proof must match before repairing its success
pointer; the baseline is re-read and validated before new allocation. SQLite
writer exclusion does not make the separate filesystem saves atomic. Preparation
metadata is not installed proof; version equality never replaces exact payload,
archive, operation, current assurance or installed postchecks.

Candidate preparation settles version and ownership before assurance. Applicable
actual test outcomes bind their relevant executable inputs, allowing reuse when
those inputs remain current. Each final target payload is formed once and
identified by structured exact artifact metadata; SDK library archive formation
uses prepack. A pending operation retains its candidate identity while its
distribution implementation and qualification are reconciled. The final exact
target archive is formed once, then the authorized Source commit/push order runs.
Three actual fresh history-isolated blind reviews, reverse validation and
current public documentation CLEAR bind the sealed source and that same archive
before installation. The local maintainer adapter
verifies consistency and currentness; the orchestrating session verifies native
review provenance. Local JSON grants neither cryptographic tool-origin proof
nor physical filesystem isolation. No caller skip or approval boolean bypasses
the required joins.

### Same-operation native retarget

The packaged `reconcile-artifacts --kind release-retarget` command owns fixed
`inspect`, `plan`, `apply` and `resume` operations for one existing uninstalled
release. An isolated conversation/controller establishes the human directive;
the CLI validates its frozen attribution and state consistency. No host,
Desktop, provider or credential issuer selects that authority.

Only an original `awaiting_assurance` SDK operation without `install_started`
is eligible. Preserve its operation/version, pending pointer and successful
pointer bytes or absence. Preserve every other current-v1 release field; only
`pack_metadata`, `source_binding` and `tarball_sha256` may change. PID is retained
metadata, not evidence of quiescence. Admission then operation SQLite exclusion
uses the existing release database paths under either Node or embedded Bun.

The fixed Source caller `release-local --stage-native-retarget OP --candidate
RELATIVE_JSON` consumes an already formed native archive and exact metadata;
it does not compile, execute or install it. Stage the bounded archive through
the existing pinned fs-safe binary and archive APIs. Verify exact regular file
inventory, packaged Source bytes, native manifest and asset bytes. Static
staging never qualifies the executable or proves its compiled behavior.

Reserve candidate and custody directories exclusively. Root copying may
overwrite only files within that newly owned namespace. Preserve the old SDK
archive, operation receipts and referenced logs, scope/review/reverse evidence
and operational input evidence with exact seals before canonical replacement.
An incomplete existing namespace, missing staged byte/seal, changed pointer,
Source drift, busy worker or foreign/mixed effect denies without overwrite or
reconstruction. Old failed and UNKNOWN evidence remains retained.

Publish a fail-closed planning reservation under the lock pair before custody
copying. Clean planning or a lost initial phase ACK can continue the same frozen
plan only while the custody namespace is absent and candidate, Source, receipts
and pointer preimages still match. Reserve its first custody directory under the
same locks. Existing partial custody denies; missing previously staged bytes
are never reconstructed. Completed custody with a lost phase ACK can resume
only from its final valid seal, publication bytes and unchanged preimages.
Extraction, copying and byte checks run outside the lock pair. Freeze Source
bytes and physical observations in one scan; recheck those identities and exact
pointer bytes under the same lock pair before bounded publication. Known phases
are custody, archive publication, release publication and completion. A lost
phase ACK recognizes only the exact frozen pre/post images and resumes the same
plan. Pending and successful pointers are never published by retarget. This is
recoverable staged publication, not a cross-file atomicity or hostile-writer
isolation claim.

An active or missing-phase repair blocks worker reuse and qualification. A
completed repair permits ordinary status/PID progress while retaining its exact
candidate binding. It grants no qualification, new admission or installation.
Current formation provenance and artifact integrity qualify the selected package
for delivery. Development tests/reviews and user Runtime acceptance remain separate;
formation and installation do not require new seals or repeated assurance cycles.

The repository-only evidence owner is `tooling/agent/release-ci-evidence.mjs`.
Its portable boundary receives an actual attributable trusted session/controller
observation and an already approved profile. It checks consistency; file JSON,
saved success, a callback boolean or Git origin does not establish origin or
authorization. No particular provider, machine, OS, Desktop or external issuer
is required for runtime authorization/recovery/assurance. Replaceable adapters
are separately qualified; target OS/CPU identifies compatibility, not human trust.

`VidaCIDeliveryRequest/v1` binds original operation/version, repository/exact
sorted projects, native target and current Source. The owner computes its opaque
request ID and exclusively creates `ci/<request-id>/request.json` under that
operation. Identical retry checks exact bytes. Partial/conflicting writes remain
UNKNOWN without overwrite. An authorized Source edit selects a new proof request
within the same operation and retains old evidence; it never reruns CI itself.
No active release/tests/retarget/Host v1 fields change.

The CI producer encodes `VidaCIDeliveryResult/v1` from actual observations and
formed bytes. It binds request, run/attempt, archive, native manifest, embedded
payload and executable. Post-upload artifact identity belongs to the controller
observation, which binds retrieved result bytes to the actual artifact; the
producer cannot know it before upload. Require native-build, native-install,
public-routes, offline-runtime, native-dependencies, state-preservation and
upgrade-recovery checks. Failed/skipped/missing/stale/UNKNOWN observations deny.
CI uses existing `build:pinned` then `prepack:pinned`; local release qualification
does not form its prerequisite candidate.

The manual Windows workflow uses tooling/agent/native-ci-delivery.mjs for
native-build -> emit-build -> publication. Formation invokes no test suites.
The isolated frozen package lock, declared current Source, platform and version
are bound to one actual request/run/attempt. emit-build requires the successful
build receipt and unchanged archive, manifest, native and installer bytes.
It publishes the existing six formation files and a separate archive/result
metadata artifact. The current result declares only native-build; it makes no
functional-test or Runtime-acceptance claim. Current package qualification uses
this provenance/platform/integrity evidence and no separate testing ladder.

The reader accepts exactly the current native-build profile or the retained
explicit seven-check profile. Every declared check must match actual successful
observations. Historical profiles, failures and UNKNOWN remain unchanged.
Issued formation retains exclusive custody and is not automatically reissued.
The lifecycle instruction owns sequencing; this specification owns behavior.

The Windows delivery entry is `packages/agent/tooling/install-windows.ps1`.
It accepts `-Action install|update|uninstall` and `-Source` with an explicitly
selected local EXE/ZIP or a direct HTTPS URL. No Node, npm or external Bun is needed.
It uses the current user's `%LOCALAPPDATA%\Programs\vida-agent\bin\vida-agent.exe`.
ZIP input uses the standard single-disk release format: at most six flat files,
member names up to 128 bytes, directory metadata up to 64 KiB and no archive
comments or ZIP64. Preflight bounds metadata before .NET allocates entries.
ZIP input is read without general extraction. Only the exact native executable
is extracted; an included manifest binds its bytes and Windows x64 target.
Embedded URL login credentials, ambient authorization, redirects, linked paths
and non-flat ZIP members reject. Explicitly selected signed query URLs are
allowed; their tokens remain private to the operator.
Input and native sizes are bounded. A byte digest is not publisher authentication.

Installer actions serialize with one file lock. Update stages the candidate next
to the command and uses standard .NET File.Replace with a transient previous
file. It verifies public version and installed bytes. It runs no test suite or prerequisite probe. Conditional
rollback restores the observed previous bytes only if the target still matches
the candidate. Failure or interruption retains recovery files for inspection;
no automatic retry occurs. Success removes only installer-created staging and
previous files. A small installer-owned receipt binds the native path, bytes
and installer-added user PATH entry. Uninstall requires this matching receipt
and removes only its native file and owned PATH entry. Project data, lifecycle
state, npm shims and unrelated files are preserved. Existing legacy release
payload cleanup is a separate exact-owner delivery action; no broad deletion.

This adapter owns physical Windows delivery. It does not issue lifecycle or
Source rights or grant user Runtime acceptance. Use exact current formation
proof before delivery and actual installed byte/version/PATH proof afterward.
Do not repeat development tests, reviews or documentation assurance at either
boundary. Keep original release identity and historical failed/UNKNOWN custody.
The future automatic Release-only consumer contract remains a separate task.

The optional explicit downloader `downloadGitHubCIDelivery` binds the selected
successful run/attempt/workflow/repository and exact artifact to its actual job's
start/completion interval and selected published commit. It accepts only a
qualified exact HTTPS storage host redirect, with no forwarded API credential,
and reserves transport exclusively before fetching storage bytes. Stream, digest,
failed and partial observations retain the file; existing custody refuses another
download. Transport ZIP is bounded to256MiB, nested TGZ to240MiB and result JSON
to8MiB. The observer reuses the existing fs-safe archive reader and exact Source
lock bindings; unavailable or drifting optional jszip is a GAP, not an implicit
installation or alternative parser. No current v1 request/result/release/Host
schema changes. Broad latest-stable dependency/tool and caller adaptation is
the last-priority 0.1.3 lane, after native UPDATE01/developer-unblocking work and
required installed checkpoints, before final 0.1.3 delivery and acceptance.
P0 work retains exact current qualified pins; metadata drift alone does not
block every step. Actual required runtime/reader defects and missing target
qualification still block their dependent effects. Prepared workflow pins do
not establish latest qualified dependencies or an updated installed environment.

The read-only retarget view validates sealed staged bytes and current published
archive. Installation selects its archive-owned asset, never Source `dist` or a
locally executed build verifier. CI joining checks Source once, then rechecks
frozen physical observations and request bytes after the asynchronous boundary.
The observer receives copies; its changes cannot replace the local bindings or
approved profile snapshot. Install fencing, locks and UNKNOWN custody remain.
The local assurance owner also freezes tests.json and the three lane logs,
rechecks their bytes after CI observation and rechecks physical input identities.
Identical input sets share one read; a changed operational input cannot reuse
earlier local proof even when it is outside the declared Source binding.

### Stale native qualification reset

The packaged `reconcile-artifacts --kind native-delivery-evidence` command has
one fixed repair: remove stale derived qualification joins from an existing
uninstalled operation. It accepts only an `awaiting_assurance` operation whose
pending pointer, journal, version and current package version agree, with no
`install_started`. Its current six-field source seal must identify that same
operation and version, bind the original release and archive, and name Source
bytes that differ from current Source. A current seal, missing seal, malformed
record, busy admission or operation lock, active installation or unknown
effect blocks the repair.

The command preserves the original operation, release, pending and successful
pointers, archive, native manifest and installer, test inputs and logs, CI
requests and observed results, retarget custody, review and reverse evidence,
scope, CLEAR and operational state. Its complete dependency closure records
physical file identity, bytes, directory membership and absences from the
existing readers. Large binary inputs use bounded binary observations; missing
results or observations remain GAPs.

When the dependency closure reads a `VidaStandaloneBuild/v1` manifest, each
`inputs` entry must contain exactly `path`, `bytes` and `sha256`. The byte count
is a safe nonnegative integer and the digest is a lowercase SHA-256 value. The
path resolves relative to the agent package through the existing strict
reference boundary. Other `inputs` arrays remain string references, and
`pack_metadata` retains its existing path context.

`inspect` reads current state. `plan` freezes attribution, release identity,
Source and dependency observations, and beforeimages or absences for the fixed
`tests.json`, `source-seal.json` and `assurance.json` files. It reserves an
operation-owned repair namespace and stores complete custody before removal.
An incomplete or foreign namespace is UNKNOWN and is not reconstructed.
`apply` and `resume` use the release admission and operation locks, recheck the
frozen inputs under those locks, and durably record progress before each
atomic file removal. A retry accepts only the exact beforeimage or expected
absent postimage with intact custody and unchanged dependencies. Unexpected
bytes or missing custody preserve UNKNOWN. The three removals are recoverable
steps, not one filesystem transaction.

The synchronous local test-evidence, source-seal and assurance writers acquire
the same admission lock followed by the operation lock. They recheck pending
operation and repair state under both locks. A writer is denied while a repair
is active or UNKNOWN; after completion it may write only genuine current proof.

Success requires all three derived joins to be absent, every original byte and
absence to remain in custody, the protected closure and pending operation to
remain unchanged, and the repair state to be complete. The result reports
`awaiting_new_qualification` and explicit missing-evidence GAPs. This repairs
consistency only. It does not qualify a payload, grant Source rights, install a
native package, accept a Runtime, create missing results or observations, or
change existing release artifact formats. Initial qualification uses synthetic
fixtures; original-target execution remains inspect-only until separately
admitted.

The optional GitHub adapter reads exact run attempt, immutable workflow definition,
required job/steps and artifact metadata under explicit controller policy.
Provider ZIP integrity is separate from nested archive/asset integrity. Reuse
guarded archive APIs; missing optional ZIP support remains a qualification GAP
without dependency installation or a custom parser. No provider profile/pipeline/
credentials is activated and no real CI output exists. Source ingress/publication
authority remains a separate decision under the Sidecar Git policy.

After transport digest validation and before either archive-entry read, the
observer runs the existing library ZIP preflight once on the bounded physical
transport. Duplicate physical names or entries collapsed by ZIP parsing reject
before selecting result/candidate bytes, including with an available native
reader. Require both preflight and entry-read functions under the existing exact
Source dependency guard. Preserve transport bytes on refusal and recheck them
after successful entry reads. No backend is forced and no dependency is installed.

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
operation/PID status and stage duration. Native installation uses the exact
qualified target asset. Its delivery manifest declares the destination, PATH
change, ordering, prior-install preservation and supported rollback effects; npm
global installation is not proof of native primary installation. Verify version,
all public command routes, physical instruction discovery, native/WASM behavior
and offline runtime independence from an unrelated cwd. SDK library dependency
qualification remains separate from public agent installation. Interrupted or
failed verification inspects the exact installed
artifact before repeating effects. Registry publication, consumer initialization,
configuration overwrite, commits, tags and push are outside this command.

The native default user-bin is `%LOCALAPPDATA%/Programs/vida-agent/bin` on
Windows. On Unix it is `XDG_DATA_HOME/vida-agent/bin` when `XDG_DATA_HOME` is set,
otherwise `~/.local/share/vida-agent/bin`. Version- and operation-bound release
trees are siblings of `bin`. Preserve existing npm shims and explicitly declare
PATH changes in the delivery manifest. First publication uses exclusive creation;
an upgrade binds CAS to the exact observed prior entry. An unknown installation
outcome requires observation and reconciliation before another effect, not blind
replay. The manifest declares prior-install preservation and supported rollback;
consumer configuration and DB/WAL/SHM remain external.

Compilation uses deterministic pinned tools and explicit build inputs, retaining
useful function/class names and disabling ambient dotenv/bunfig/build-environment
configuration. Minification and bytecode require actual command/native-resource
checks; performance or size improvement is claimed only from comparable measured
evidence. Short commands and control return target under two seconds, separately
from elapsed long-operation time. Native CI build/artifact verification and English product-
version release notes/scripts are prepared and qualified without executing
registry or GitHub publication merely as a test.

Standalone acceptance traces SA-CLI to public command/runtime independence,
SA-RESOURCES to immutable resource/native provenance, SA-STATE to external
consumer state and existing governance, SA-OPT to measured pinned compilation,
SA-RELEASE to one operation and exact native assets, with separate SDK library evidence, SA-NOTES to
current English product/version notes, SA-CI to native-runner build/artifact/install checks with separately qualified local agent behavior
and prepared publication tooling, and SA-ASSURANCE to fresh final reviews, reverse
validation, CLEAR and attributable delivery observation. The accepted trace is
retained in `.agent/work/teamlead-standalone-release-20261001/WORK.md`.

Agent behavior tests, coverage and CRAP run locally. Build, packaging and
installation checks belong to CI/CD and are not local agent test tasks. Do not
create or run build/install test suites, compiler probes or copied-package
installation harnesses. CI/CD may run these delivery checks, but not agent
behavior tests, coverage, CRAP or mutation. Mutation requires an explicit manual
launch. Missing local or CI/CD evidence remains a GAP, never a pass.
Runtime qualification and attributable user acceptance remain separate from
CI/CD delivery checks and local Static evidence.

Public agent installation and system updates require the qualified standalone
asset with embedded pinned Bun. An SDK/npm archive is not a fallback delivery.
Keep the current pending candidate identity and preserve any uninstalled archive
and actual receipts. Retargeting uses supported bundle-owned reconciliation; no
manual journal edit, invented successful installation or replay of UNKNOWN
effects is permitted. Native and CI acceptance retain their actual GAPs. Only
verified installed native behavior can establish developer readiness.

## Scoped source and lease continuity

Project membership for a repository path comes from the deepest matching
configured `project_root`. Equal deepest roots are explicitly shared by those
projects. A nested root owns its descendants and excludes a broader parent
project there. Membership comparisons are case-sensitive on POSIX and
case-insensitive on Windows. The public singular path resolver keeps unique-root
callers unchanged and requires an explicit selected member for an equal-root
path.

The public scope command accepts `--path` for paths that belong to a selected
project and for repository-shared paths outside every configured project root.
An outside-root path becomes source evidence only through the exact current
scope and selected `ProjectContext`; it does not grant write authority. During
admission, every `allowed_paths` and `implementation_paths` entry is checked
against the selected project before the source snapshot or lease capability is
created. Configured wiki, internal and skills locations are informational and
do not form a closed path allowlist or change `code_selectors`.

Repeated `--repository-path` values remain limited to exact repository-shared
files outside every configured project root. They enter the same current-v1
bounded, stable, no-follow snapshot as `--path`, but provide read-only evidence
and never source-write authorization. Duplicates, collisions, traversal,
symlinks and unsafe paths fail.

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
successor boundaries; exact retry/restart is idempotent. Source now implements
`HostStateStore.commitCompletedSourceReport` to commit journal, work and shared
ledger together, and `reconcileCompletedSourceOwnership` to reuse the exact
durable predicate for historical expiry/drift cleanup without journal rewrite.
Qualification covers expiry/drift, transaction fault, foreign/started negatives,
peer FIFO, correction, retry and sequential writers; current outcomes belong to
the release operation's actual evidence. No nested ordinary CAS, new caller keys or
artifact-schema fields are introduced; Source implementation does not establish
qualified delivery or Runtime acceptance.

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

### Optional task source in one Host

The canonical Host root owns configuration, project context, work artifacts,
SQLite and the shared coordination ledger. An absent task-source binding keeps
the existing same-root behavior. A typed request explicitly opts into another
source checkout. It does not initialize a second Host or grant Source rights.

`TaskSourceBinding/v1` binds the original work, attempt, thread, repository,
sorted projects, configuration, project context, scope and acceptance to both
roots. It retains the observed Git common directory, branch, HEAD and CWD.
Trusted integration checks physical paths and aliases. Matching Git metadata
alone does not establish Host authority.

The existing Host reserves branch, worktree and logical file resources through
FIFO and CAS before issuing a create or adopt action. The session executes the
fixed Git arguments and reports the actual result. An uncertain result retains
the same operation for inspection without automatic reissue. Missing Host state
denies before creating a directory, branch, worktree or task-local database.
Before transferring claims or issuing another mutation, the final Host
transaction checks retained action/preparation pairs. An issued or unknown
mutation for the same Work blocks a distinct mutation, including a later
attempt. Exact retries return no command. Inspection and outcome reporting
remain available; another Work uses the existing resource FIFO.
A reported binding also blocks a distinct binding mutation for the same attempt.
There is one observed Source root per attempt. Current read, inspection and
report paths verify the action's exact preparation revision and digest as well
as its operation identity. A mismatched pair grants no root or effect.
Git's [worktree contract](https://git-scm.com/docs/git-worktree) supplies checkout
mechanics; VIDA retains scope, ownership and outcome authority.

Root resolution denies incomplete effect storage, orphan actions and reserved
non-queued tickets without retained effect records. A missing first journal
does not select another root: fresh admission uses the canonical root only when
inspection proves no TaskSource action exists for this Work.

The finite historical settled-writer release reads the exact original attempt's
reported root without requiring a current execution lease or current config.
It verifies protected action/preparation/report pairs, original owner or release,
workspace and scope. Uncertain or ambiguous bindings deny. The existing caller
still compares current scoped bytes with the retained postimage before release
and exact retry. This read grants no current execution or Source rights.

Public inspection returns a separate `SourceExecutionContext/v1` projection.
It supplies the canonical Host root, validated Source root, tool working
directory and current binding reference. The controller uses that working
directory for Source tools. Scoped source reads and fingerprints use the same
binding; configuration, intake, artifacts and SQLite remain in the Host root.
The binding retains its original authorization scope. An accepted writer report
may advance the journal's current scoped Source bytes without replacing that
root binding. Later reads verify both identities and retain the original root;
they do not require current bytes to equal the pre-write scope.
The projection grants no rights and changes no existing persisted v1 contract.

### Required checks before a Source effect

The Host validates applicable current plan and independent security evidence
before reserving a Source attempt. It uses the genuine Host-created request,
current work and journal, scope and acceptance bytes, task packet and configured
project identity. Actual Cedar and Edictum decisions remain required alongside
the attributable scoped human permission. A locally formatted approval receipt
does not substitute for a policy decision.

Admission registers the exact validated implementation scope and acceptance
contracts as current lifecycle references in the same Host Work. Metadata-only
preparation grants no native execution; issuing a wave requires actual admission.
Prewriter stages receive the task packet before implementation exists. Stages
consume implementation results only when their configured contracts require it.

The existing `review_source_prewrite` wave contains a read-only source planner
for all Source work and a security reviewer for high-risk work. The planner
reports actual scope-to-acceptance trace, verification and rollback. The Host
attaches its accepted `source_plan` in TRACE, then advances to PLAN. Security
policy attaches in PLAN. A security report that arrives first remains in the
journal until the plan is attached; an exact retry finishes attachment without
running either reviewer again. Both use `LifecyclePreparationObservation/v1`.
Post-write validation is identified by the configured `ValidationReceipt/v1`
output contract. Delivery and final assurance consume only those validator
results. A prewriter plan is not a validator verdict or validation receipt and
cannot satisfy the required post-write stage. Both gates remain required.

Configuration loading and pure graph inspection remain available for valid
historical configurations. Missing current plan or required prewriter evidence
still denies a Source effect. A post-write security validator cannot satisfy
the configured prewriter gate.

Apply the same high-risk rule in workflow compilation and both Source gates:
high lifecycle risk, or a packet flag of `high`, `security`, `data_loss` or
`migration`. A low lifecycle label cannot cancel a high-risk packet flag.
Preserve the raw packet flags. Use the effective lifecycle risk consistently
when compiling requests, reconstructing engine state and exporting its witness.

Missing, stale or foreign required evidence denies before attempt and effect
markers and before a Source action is issued. High-risk work requires its
configured independent prewriter review and actual observed journal result.
Final assurance remains after development; it cannot supply a missing prewriter
review. Exact completed retries retain their existing idempotency. Changed
source or context invalidates the affected evidence. Cedar's
[authorization contract](https://docs.cedarpolicy.com/auth/authorization.html)
defines policy evaluation; the Host binds its result to the protected operation.

Edictum evaluates the actual configured tool call before its effect. Record read
evidence only after a successful read; a dry-run decision is not execution proof.
The configured prewriter result must be persisted and attached before writer
issuance. The result cannot be supplied later by final assurance. This follows
Edictum's [workflow gates](https://github.com/edictum-ai/edictum#workflow-gates)
and [execution pipeline](https://docs.edictum.ai/docs/concepts/how-it-works).

### Recovery across delivered configuration

Global configuration repair validates disposed historical outcomes under the
configuration digest retained by each protected Work. Current YAML does not
replace original read-only rights. If the digest differs, the reader resolves
current-v1 beforeimages from bounded, applied and released configuration
operations in the configured work root. It verifies operation integrity,
workspace/repository identity and configuration bytes against the stored
digest. Missing or changed original bytes deny; no arbitrary YAML fallback or
execution grant is created.

Terminal synthesis custody retains its capture-time ledger and maintenance
versions. Later unrelated ledger changes and configuration repairs do not erase
custody. The current revision/generation must not precede the capture; equal
ledger revisions require the exact digest. Original Work, Journal, body,
release, ticket and claim bindings remain exact. Active or UNKNOWN effects and
current ownership still block global repair. Recognition never accepts the
synthesis or reissues UNKNOWN work.

Owner: Agent/Core. Business intent: delivering Source or changing the requested
executor must preserve accepted local work and leave a supported recovery path.
The desired repository configuration, the configuration accepted by the local
initialization receipt, and each work's original execution configuration are
distinct identities. A delivery may change desired bytes; it cannot copy another
host's receipt, database, lease or acceptance into local authority. Issued requests,
attempts, models and terminal FAIL/UNKNOWN observations retain their original
bindings. New execution requires an explicitly accepted current configuration.

Recovery control is dispatched before the ordinary current-execution gate.
The Source-only public `run --release-historical-owner true --mode inspect|apply
--project-root ABS --native-session-handle OWNER --baseline-config REL
--request REL` validates a bounded original YAML against the local receipt,
unchanged repository/projects/integrations/schema and an executor-only desired
model/reasoning change. It opens existing Host and original Mastra state for
inspection; it never initializes or resumes a workflow. The inspected request
returns opaque Work, Ledger, Journal, maintenance and original evidence bindings.
Apply revalidates them and releases only the original owner's exact claim and
owned queued intents, with no queue promotion, generation advance or acceptance.
The CLI checks cooperative caller consistency. An owner string or JSON report
is not authenticated caller authority; the trusted invoking session must retain
actual owner/authorization evidence. Missing live caller authority blocks apply.

Three finite predicates are separate: accepted completed readonly activity; one
unknown no-egress readonly issue with no Host writer history; and one accepted
`synthesize_task` preparation, one authoritative completed `develop_task` writer,
and exactly two failed `validate_focused` correctness/requirements validators.
No additional issued action, corrective mapping, reservation, activation or
normalization is admitted by the settled-writer predicate. Its bounded explicit
`preimage_ref` is a pure complete `ScopedSourceSnapshot/v1`, not a response envelope.
The original Work/lifecycle/engine input/requests bind that admitted preimage;
the authoritative writer/journal bind the postimage. Full ordered preimage to
postimage changes must equal all four admitted writer paths and reported changes;
current scoped bytes must equal that postimage. Missing or changed evidence
denies without effects. Inspect does not reconstruct or discover historical bytes.
`test.read` is permitted only for terminal configured validation inspection;
it grants no test execution or broader UNKNOWN readonly capability.

Every journal-backed release checks Journal CAS in the same immediate Host
transaction as Work/Ledger/maintenance CAS. Changed completed or failed evidence
cannot release ownership. Maintenance acquisition checks queued and active
ownership and the frozen global Host/journal/governance state on the same Host
connection inside its immediate acquisition transaction before writing a fence.
The trusted rebind operation owner performs this synchronous verification;
caller booleans and JSON cannot bypass it. Validated cooperative readonly UNKNOWN
evidence remains unchanged. Exact held-operation/token retries preserve the fence.
Host and Mastra databases and filesystem receipts form recoverable sequences;
they do not establish cross-store atomicity.

Because SQLite transactions do not nest, acquisition-verifier Host snapshot
reads use the existing immediate transaction and connection. A private
synchronous scope also permits a receipt-checked maintenance inspection to read
through a deferred transaction on that same connection. In both cases, only the
snapshot reader skips the ordinary held-fence availability check; database
support, receipt/project checks, stored-row checksums and identity, Work/Ledger
pair validation and maintenance-generation observation remain active. The
scope is cleared in `finally`, rejects asynchronous callbacks, and does not
relax nested Host mutation checks. See the
[SQLite transaction documentation](https://www.sqlite.org/lang_transaction.html#transactions)
for its transaction and nesting behavior.

The configured Mastra engine has one Host-owned producer exclusion. Before
storage initialization, start or resume, the actual configured journal and its
bound Host acquire the protected governance reservation in an immediate Host
transaction. Acquisition checks physical database/root, current configuration,
exact sorted projects, workflow/selection/original attempt, Work/Ledger/Journal
CAS, maintenance generation and admitted live claim/FIFO ownership. Mechanical
preparation without intake binds the same configured identity and grants no
Source, native dispatch or recovery authority. Invalid start/resume input denies
before reservation; resume requires the exact current journal observations.

The reservation becomes `commit_unknown` before any asynchronous engine effect.
Only the Host's private in-process handle permits its bounded journal sync and
settlement. Ordinary journal writes and Host ownership, correction, suspension,
retirement and maintenance writes deny during reserved/UNKNOWN production.
Initialization and each start/resume settle only after existing-file inspection
proves actual engine/journal agreement and unchanged current CAS/config/owner.
The read-only engine inspector validates a contiguous configured wave prefix,
starting with empty observations. Each completed wave preserves its input and
appends exactly its configured completed action observations; its output is the
next wave's input. Suspended frontier payloads preserve this chain. Terminal
success requires every configured executed wave and the exact last output as
the result. Missing, future, foreign or inconsistent wave state denies before
producer acquisition or settlement. Correction schedules come from the bridge's
configured correction or the Host-bound journal, never from persisted request
metadata. This inspection grants no recovery authority or Runtime acceptance.
Separate database commits are not atomic. Termination, drift or failed settlement
retains UNKNOWN; close, elapsed time, PID or restart cannot clear or replay it.
Generic governance operations cannot create or settle this protected namespace.

The CLI admits intake and validates current scope before opening the producer.
Journal-only retrieval inspects actual persisted engine state through the readonly
reader. It constructs the protected bridge only when start/resume requires engine
production; inspection never initializes storage, fabricates a journal, settles
UNKNOWN or authenticates recovery. Data-only admitted execution consumers perform
fresh configuration/project/active-lease/canonical-intake/native-thread/current-code
checks synchronously without issuing a kernel capability. Actual capability
consumers construct the kernel and retain current runtime checks at every later
pre-effect and post-await boundary. No persistent freshness inventory cache exists.
Both consumer paths use the kernel owner's shared live-admission predicate:
current configuration and exact work/project binding, matching active ticket and
claim, thread/generation/resource ownership, future ticket and claim expiries, and
the existing nonblank256-character/control-free native-handle bound. The predicate
returns a fresh snapshot, grants no capability and is not a new public SDK surface.

Canonical JSON retains its existing serializer and finite node/depth/byte bounds,
dense own array elements, descriptor/hook/prototype/cycle rejection and legal
shared references. Runtime configuration digests may be reused only for actual
loader-owned deeply frozen configurations. Every digest read still checks live
inherited serialization hooks without invoking accessors; current YAML bytes
select their current configuration. Arbitrary caller objects remain uncached and
fully validated. Digest reuse grants neither authority nor runtime freshness.

Direct bridge callers require the actual configured ledger. Staged witnesses
inspect existing completed persistence under Host exclusion and never initialize
or resume engine storage. Missing journal is not engine-absence proof. Crashed
UNKNOWN reconciliation still requires the exact authenticated recovery-control
ingress and shipped artifact repair; local handles and test capabilities do not
provide that authority or user Runtime acceptance.
Physical identity checks detect persistent file substitution. SQLite connections
open configured filenames; these checks and Host exclusion assume cooperative
managed writers. They do not provide a descriptor-bound no-follow guarantee or
isolation from hostile same-user filesystem replacement.

The recurrence prevention contract also requires the complete original scoped
snapshot to be retained at admission before any writer effect, within the
filesystem provider's supported durability guarantees, through
the work's existing artifact references. A digest alone cannot recover missing
preimage entries. Fresh local admission publishes canonical `ScopedSourceSnapshot/v1`
metadata through contained exclusive creation under the configured work root,
at `<work-id>/scoped-source-attempt-<attempt>.v1.json`, and references it through
the existing Work artifact array. It retains every ordered scoped entry,
including absent files; it is not a source-byte backup or rollback payload.
The same-attempt preparation may reuse only exact existing bytes. Partial,
conflicting, linked or oversized evidence denies admission without overwrite.
Host's immediate admission transaction rechecks retained bytes and current
source before commit. Shared Host retries and local returns require the same
immutable base execution run; a competing attempt cannot reuse another attempt's
Work. Existing references must match the original attempt, scope, AC and bytes;
missing or changed evidence denies retry and is never rebuilt from a postimage.
Historical Work lacking the reference is left unchanged. Filesystem publication
and SQL commit remain separate: interrupted preparation can leave an unreferenced
file, which supplies no rights or execution authority. Windows publication
flushes file contents but does not promise directory-entry survival after power
loss where directory synchronization is unsupported. Missing retained evidence
fails closed without reconstruction. Metadata retention does
not close historical proof, artifact repair, engine or installed Runtime GAPs.
Unprepared work without a journal has one finite release-only route:
`run --recover-unprepared-work true --mode inspect|apply --project-root ABS
--native-session-handle OWNER --request RELATIVE_JSON`. Inspection returns the
retained apply request; apply consumes those exact returned versions and original
Work/ticket/claims. The trusted isolated controller must hold attributable,
target-specific disposition authority. A handle, JSON or inspection grants no
authority. Source repair permission does not authorize live disposition.
The existing cooperative boundary applies: the isolated local session/controller
establishes actual human authority in its current conversation before invoking
apply. The CLI checks the declared owner, original context, disposition pointer
and current CAS; it does not authenticate the human directive or create another
issuer, token, Desktop or machine-trust dependency.

The first release records a calendar-valid RFC3339 timestamp in the operation's
created_at field and uses exactly that same string for each released claim's
renewed_at. An exact lost-ACK retry validates the retained operation value as a
string and calendar-valid RFC3339 timestamp before constructing typed claims; it
preserves that exact string and returns durable state without another release.
Missing, non-string or invalid retained time is denied with
`unprepared recovery operation timestamp invalid`, without a fresh-time fallback
or state change. The current CoordinationOperation/v1 schema checks timestamp
shape but admits impossible calendar dates; Host applies its existing RFC3339
validator at this boundary. No schema relaxation, coercion or new artifact format
is introduced.

This route accepts only the exact same-owner unsealed INTAKE execution-only
claim, with no assignments, journal across any retained attempt or corrective
generation. It validates original intake/configuration/run identity and current
storage mapping. The existing Host immediate producer fence rejects every
pending or UNKNOWN producer, checks maintenance availability/generation and
FIFO, then holds exclusion across the existing-file engine census and Work/Ledger
CAS. The census requires the current engine file, schema, integrity and physical
identity, rejects any corrective-history row, and rejects any surviving
same-work base/corrective/unknown-alias snapshot. Missing, malformed, oversized,
corrupt or incomplete evidence denies; journal absence and PID absence are not
engine or no-effect proof. Corrected work remains outside this finite predicate.
The census preflights row count and aggregate physical bytes in SQLite, then
strictly validates canonical JSON text or JSONB with `json_valid(snapshot,9)`
and bounds decoded JSON bytes before fetching payloads. NULL, malformed BLOB
and JSON5 values deny; guarded projection never decodes an invalid row. Valid
storage is read through `json(snapshot)`, as in the existing snapshot reader
and pinned Mastra/LibSQL adapter. No engine rewrite or parser is introduced.
SQLite's [JSON functions contract](https://www.sqlite.org/json1.html) owns this
storage decoding; VIDA retains the original identity and absence checks.
Its 256-row/8MiB physical and decoded ceilings can also deny a healthy engine with
unrelated retained history. Such denial is an availability GAP, not evidence of
target-run absence; a future paged owner census is required at that ceiling.

Recovery resolves the selected repository/projects through the current validated
configuration and registry at both public inspection and Host apply/retry.
The original baseline still binds the Work, intake, run and engine census;
it is never passed as a current registry snapshot. A valid current configuration
revision change alone does not deny this finite recovery. Changed repository or
selected project IDs, integration mapping or original storage deny. Descriptor
and path metadata with the same identity/mapping are validated by the current
registry, not compared to an unsupported historical registry hash. This grants
no configuration adoption or execution rights. The existing historical-context
reader follows the same boundary. Mastra's
[snapshot contract](https://mastra.ai/en/reference/workflows/snapshots) preserves
workflow/run identity; it does not replace VIDA's owner, CAS or no-effect checks.

Apply suspends only the original execution and releases its exact ticket/claim,
co-committing one current `CoordinationOperation/v1` release row. Original binding,
run/attempt, contracts, artifacts, FAIL/UNKNOWN and other owners remain unchanged.
Exact lost-ack retry verifies the retained request and released postcondition;
changed request, stale CAS or later same-work progress denies. Unrelated ledger
progress is preserved. No new lease, Source rights, journal, Mastra run, configuration
adoption, release qualification or Runtime acceptance is granted. Ordinary run
recognizes the partial preparation before new issue/engine preparation and
returns `GAP-VIDA-RUN-PREPARATION-001` with this inspection route. Current configuration
admission remains separate. Host and Mastra commits are distinct; this fence does
not claim a distributed transaction or physical isolation from hostile writers.

Foreign/orphan ownership, uncertain writer/governance effects, surviving engine
outcomes and unsupported corrective shapes remain blocked. Build/install evidence
belongs to CI/CD; agent-state fault/CAS/retry checks belong to the local test lane.

The explicit reconciliation kind `runtime-config-delivery` adopts an already
delivered executor model/reasoning change. Inspect/plan require a bounded local
`--baseline-config` that matches the initialization receipt and the current root
YAML as `--target-config`. Repository, projects, storage, integrations and schema
remain exact. It freezes the baseline, target, receipt, runtime and quiescent
global state in a separate strict `SourceDeliveryConfigRebindOperation/v1` at
`runtime-config-delivery-operation.v1.json`. The standard artifact and its schema
remain unchanged. A reader never converts or resumes an artifact of another kind.
The delivery digest binds its artifact kind and plan. A changed schema tag cannot
reuse a standard operation's digest or maintenance fence.

Apply holds the existing maintenance fence and returns `receipt_rebind_ready`.
Resume changes only the receipt through atomic CAS after checking the frozen
target and dependencies again. YAML and historical work are not written. Restore
may abandon only before a receipt effect while the target and old receipt remain
exact. After an effect, resume forward. Pending acceptance and FAIL/UNKNOWN remain.

A Source correction during that held operation uses the same public
`runtime-config-delivery` owner and one additive
`RuntimeConfigSourceCorrectionRepair/v1` sidecar. Repair inspect and plan freeze
the original operation and fence, Source beforeimages and exact authorized
changed paths. Repair apply accepts a bounded report of the new whole package's
formation, native integrity and actual installed observations. The trusted
session owns those observations; report JSON supplies consistency and CAS only.
Planning may use `--publish-operation` to bind an existing qualified publication.
This is correlation only; its CI, Source and installed-native proof still must
match during apply. A frozen request retains that ID, and a different explicit
ID denies retry. Do not form or install another package solely to align IDs.
An engineering checkpoint may keep the current semantic version and pending
publication operation. Version rollback denies. Apply still requires a fresh
CI run and artifact, exact Source/native inputs and the actual prior installation
bytes. The original fenced configuration operation stays distinct.
The installer performs one version/byte postcheck and returns its structured
result. The caller reuses it and confirms PATH once. Project recovery and
admission are separate from installation; their failure does not repeat it.
The formation owner may advance that operation's current pointer only for a
different Source request, Source binding, run and artifact at the same version.
It retains the prior validated pointer with its immutable request/result before
atomic advancement. A conflicting result for the same request still denies.
Native installation evidence uses a separate root-confined, descriptor-pinned
streaming checksum bounded by the manifest asset size. It rejects links and
identity, size or timestamp drift. Ordinary Source-read limits stay unchanged.

`repair-withdraw --expected-request` may withdraw only the exact revision-1
requested sidecar with no report or completion. It validates the original
fenced operation, fence, state CAS and immutable custody, then archives exact
sidecar bytes before removing that sidecar under the existing owner locks.
An exact absent retry confirms the archive; a different active request denies.
This permits corrected Source to be planned again under the original operation.
It changes no Host, YAML, initialization, original operation, fence or UNKNOWN
outcome and grants no execution or acceptance rights.
The repair writes only its sidecar. It neither rewrites the original plan nor
releases maintenance, changes historical work or grants execution rights.

The applied bridge is checked again during normal resume and its supported
postconditions. Lost acknowledgements continue the exact operation. Foreign
fences, intervening maintenance generations, changed custody or stale package
proof deny. A historical terminal capture may cross its own maintenance
acquisition only when the verified held receipt binds capture generation plus
one to the held and current generation. Unfenced checks retain exact equality.

Original-task continuation remains separate from receipt adoption. It binds
the accepted configuration and installed-runtime transition through fresh
Work, Ledger, Journal and maintenance CAS. It preserves the original owner,
attempt, scope, acceptance and history. Only the exact original released
resources can be reacquired after contention checks. The configured runtime
joins the latest original-owner ticket to its single released claim and release
operation by ticket identity and the full execution/implementation resource set.
The release disposition and Source intent retain separate pointers. Unrelated
later ledger revisions do not invalidate that release; current CAS still binds
the apply. Reacquisition rejects overlapping owners or waiters. An active
continuation rejects any overlapping active owner and earlier FIFO waiter;
later queued work waits without invalidating the current owner.
The configured runtime returns a real unfinished action; known terminal and UNKNOWN actions are not
automatically reissued. Actual original-owner continuation is required evidence
after delivery, not a consequence of Source checks or physical installation.

The runtime-code reconciliation owner supports a finite continuation of the
same suspended work after a proven delivered configuration transition. The
old Work configuration must match the transition's verified baseline; the
target must match the accepted current initialization and executing bundle.
The Host commits the current binding and same-owner resource reacquisition in
one immediate transaction under fresh Work, Ledger, Journal and maintenance CAS.
It preserves the original attempt, contracts, request pointer and history.

A captured known terminal synthesis returns a historical-terminal review action
over its exact retained receipt and body. It does not reissue synthesis or invent
an observation. A persisted unissued frontier may return its exact configured
session request. Current uncertain writer or governance effects deny execution;
retained disposed read-only UNKNOWN history remains unchanged. The Mastra
frontier projection and Host transaction are separate boundaries. A returned
review action grants no Source write or Runtime acceptance.

For a retained terminal engine run, the public consumer retrieves the one
current read-only review from its Host continuation receipt before ordinary
engine lookup. It issues and reports that action through the existing journal
CAS. It preserves the old terminal snapshot and calls neither engine start nor
resume. Lost issuance acknowledgement retains the same issue and UNKNOWN;
an exact report retry returns the persisted result. Unsupported frontier
continuations remain an explicit GAP and cannot start a replacement workflow.

The artifact reconciliation owner provides `--kind delivered-work-continuation`
with `inspect`, `plan`, `apply` and `resume` for a stale stored receipt digest.
The receipt payload must satisfy its current contract and exactly match the
linked Work, Ledger and Journal. Repair preserves their bytes, the owner lease,
rights, outcomes and acceptance. It changes only the stored digest and its own
repair operation. Plan retains exact beforeimages and dependency CAS.

Repair reservation shares session-producer exclusion. An active or UNKNOWN
producer denies reservation. A reserved or UNKNOWN repair denies new producers
and continuation reads. Application and repair completion commit atomically;
exact resume checks the dependency tuple and afterimage. Changed payload,
state, owner or dependency denies. This is consistency evidence, not package
qualification or Runtime acceptance.

The future configured-frontier validator requires immutable engine snapshot
bytes bound to the old unissued developer action and completed prefix. Its old
request retains the original configuration and Source scope. The action binds
the current target configuration and Source scope separately. Changed Source
entries require the exact authorized beforeimage bridge; a target digest alone
cannot authorize them.

For current prewriter continuation, derive the entire reviewer wave from loaded
repository configuration, the accepted original task and its protected lifecycle
risk. The completed prefix and old developer request stay unchanged. The current
reviewer requests replace only the successor journal items at the same run and
wave step. Compare every request in order with that derivation. Omitted security
reviewers, duplicate requests, developer leakage and issued or reserved items
deny. A caller cannot lower the protected lifecycle risk to omit security review.
The authorized Source entries must equal the actual scope diff; extra latent
entries deny. Successor Work has one permitted projection: advance revision,
bind the current configuration/runtime/Source, reacquire the checked original
owner lease, and enter active review. Lifecycle updates only its revision,
Source revision and configuration binding. Preserve the run ID, input, risk,
scope, contracts, artifacts, assurance and retained references exactly.

The bundle-owned repair supports inspect, plan, apply and exact resume for this
receipt branch. The Host resolves current configuration and the original accepted
intake itself. The intake bytes, task, native owner, project set and workflow must
match their protected bindings. Caller JSON cannot select a different risk or
reviewer wave. Reservation and application retain the existing producer fence,
maintenance generation and exact Work, Ledger and Journal CAS.
For the historical delivery proof, the recorded maintenance generation equals
the closed transition fence generation. A normal configured-frontier proof uses
current Host maintenance CAS and independently verifies the config operation's
actual typed released fence. The prior Work run and Source revision match its Journal, whose path
set equals the accepted Work scope. One reacquisition advances Ledger by exactly
one revision.

Immutable Host history remains readable after later Work progress or lease
expiry. Live repair still requires the exact recorded successor tuple and a
current lease. Interrupted application retains UNKNOWN and blocks a new producer
until exact repair resume. Repair changes only the stored receipt digest and its
own operation; it grants no Source or Runtime rights.

The configured-frontier Host producer verifies the exact existing suspended
engine through a read-only retained reader. It derives current reviewer requests
from the protected intake and current configuration, then commits one receipt,
same-owner lease and full successor wave under the existing transaction and CAS.
The original developer stays in the immutable beforeimage, and the completed
prefix stays unchanged. Exact retry returns the retained result before another
engine read. The Host lookup exposes the whole reviewer wave and each item's
retained issuance/report state. It rejects missing, duplicate or foreign items.

The Source public run consumer and same-run adapter preserve the old run and
completed prefix, then advance to the current developer only after the complete
current prewriter reports. Their installed delivery and chained configuration/code
proof remain pending. The functional repair checkpoint must already be installed
before the first active receipt is produced. Historical behavior stays unchanged.
Source checks do not establish installed continuation or Source rights.

Runtime endpoint byte evidence retains each endpoint's own declared inventory.
Resolve every selected package-relative file from exactly one valid manifest
input. Validate all input paths, exact fields, byte counts and digests; other
valid manifest inputs do not widen the selected inventory. Compare endpoint
files through a temporary union with explicit absent entries, while preserving
each endpoint's original aggregate digest. Ordinary task scopes still require
equal path sets. This comparison supplies no configuration, Source or Runtime
authority, and does not establish a historical update chain.
Generated SDK exports use the exact maintained JavaScript inventory. Retain
them in the runtime digest and verify the successor manifest against the
installed package; do not require generated files in Source Git. Every copied
target schema must match its corresponding maintained Source schema in path,
size and digest, even when the copied output did not change. Git verification
still covers all maintained runtime and task-source targets.

The Source normal-config planner selects the actual wholly unissued request;
it requires no invented issue or terminal capture. It preserves the Host-bound
human Source instruction and verifies its exact original scope, owner and task.
The retained suspended frontier may be in implementation or awaiting-followup
execution phase; verify the actual unissued developer through the retained
engine before resuming. The historical terminal-review predicate is unchanged.
The config operation covers the full repository registry while the task retains
its exact project subset. The config operation ID and native update operation ID
remain distinct. Resolve the native update identity through the existing release
owner and compare the installed executable's own byte observation with its
selected manifest. Caller reports alone do not attest an installation call.
Installation in another environment consumes the immutable artifact and its
manifest. It requires no Source checkout or developer-host paths/state. The
target owns its one integrity/post-install observation. Reuse that structured
result only for that target; it does not establish admission or current runtime
in another environment.
The Source repository adapter checks changed files against exact regular local
Git blobs, including their size and bytes. Reported hashes are only hints.
Local commit evidence does not prove remote publication or grant rights.
The package-runtime endpoint diff is independent from task-source mutation
authority. The existing self-development permission and native release owner
cover an authorized causal package correction; task implementation paths do not
limit the installed runtime's inventory. This evidence never extends task Source
rights or substitutes for actual whole-package qualification and installation.
Only accepted implementation and documentation paths may change in this scope
bridge. Paths present solely for reading or evidence remain unchanged. The
documentation set is maintenance scope, not Source-write approval; retain its
sidecar policy and final DocFlow. Do not require a delivery CLEAR checkpoint
before the read-only prewriter. Every configured-frontier report, issue, resume
and returned offer first runs the ordinary admitted current-runtime guard.

After this continuation, the admitted runtime guard can use the current package
inventory only through the validated Host-stored normal continuation receipt.
Join its original intake reference, owner and prior binding with the current
runtime/configuration/schema and ProjectContext. Keep the protected original
intake unchanged. Ordinary admission still requires its original inventory.
This Source branch requires the qualified whole repair checkpoint before its
first active receipt; installed delivery and actual original-work restoration
remain pending.

Before changing an active strict artifact schema, qualify and ship its supported
artifact/dependency repair command. Same-attempt correction still requires current
scope/configuration and base-to-corrective engine authority before admission.
Historical corrective rebinding remains a GAP; receipt adoption and disposal
alone do not authorize execution. Source implementation is not installed proof.

Acceptance evidence: isolated historical predicate controls in
`tests/runtime-config-rebind.test.mjs`, concurrent completed/failed journal
controls in `tests/bun/host-state.test.mjs`, and configured terminal-validator
capability controls in `tests/final-assurance.test.mjs`. Required full-chain
qualification additionally covers initialize A, admit work under A, deliver B,
preserve history, diagnose/release only eligible A ownership, repair/adopt B,
correct within the original attempt, and restart/interruption at each boundary.
Missing installed/native/caller and attributable user-testing evidence remains
Runtime GAP; fixture success never supplies it.

#### Host-independent recovery-review ingress

All reusable VIDA behavior must remain host-independent. Recovery, authentication,
authorization, execution and assurance must never require a particular machine,
operating system, desktop application or provider. Core defines portable identity,
proof, authorization and session contracts. Replaceable boundary adapters may
implement platform integrations only when separately qualified against those
contracts; platform identity or API availability cannot define Core rights.

In the human-given isolated agent environment, the active internal session and
controller are the trusted caller. Target-specific attributable human intent
binds one read-only recovery review. No external issuer, OS, Desktop, provider
attestation or credential enrollment is a prerequisite for this internal route.
The executing caller and historical owner remain separate roles; the caller
never acquires the historical lease by presenting its identity.

The existing pinned run entrypoint provides a separate `--recovery-review true`
route with exact `--mode prepare|begin|complete|inspect`, `--project-root` and
`--request` arguments. It precedes ordinary admitted execution and reuses
`inspectHistoricalOwnerContext` for original configuration, receipt, engine and
journal evidence despite the supported desired-configuration drift. Mixed
ordinary execution flags deny. JSON input is a bounded export from the trusted
caller's history, not an authentication token or another canonical artifact.
When current configured sources no longer reproduce an original request, the
caller may include its exact `originalContexts` collection. Each entry binds one
expected action, wave, stage, work and attempt to a strict `ConfiguredContext/v1`
body. The inspector validates its selected sources/skills, byte and excerpt
limits, self digest, and complete context/file bindings against the canonical
request retained in the journal and engine. Missing, duplicate, extra, foreign,
or altered bodies deny; a truncated excerpt never proves the full source bytes.
The collection remains in caller history and in-memory validation, and is
excluded from the returned recovery request and persisted Host bindings.

`prepare` freezes caller session/controller, attributable instruction reference,
original repository/projects/work/attempt/historical owner, source scope,
baseline/receipt/engine/current-runtime bindings and current Work/ledger/journal/maintenance CAS.
HostState uses the existing strict `OperationReservation/v1` in the protected
`vida-recovery-reviews` namespace. Generic reservation and settlement deny this
namespace. Its operation key permits one recovery review per original target
and attempt. Local historical checks and CAS run inside the existing immediate
transaction; source reads remain cooperative, not filesystem exclusion.

Historical Source snapshots remain unchanged in Work and Journal. `prepare` reads
current bytes over exactly their declared paths, including prior authorized
in-scope corrections. `begin` and `complete` compare bytes to that prepared
current snapshot. Current bytes never replace historical authority.

`inspect` reads the retained reservation after a Source or runtime update. It
requires the exact saved request, unchanged original configuration, engine,
owner and current Work/Journal/ledger/maintenance bindings. The reservation
must match the entire saved request. Changed current Source or runtime bytes
do not hide a prior `reserved`, `commit_unknown` or `applied` status. This
read-only path grants no effects. `begin` and `complete` still require the
prepared current bytes and reject drift.

The caller retains the full returned request and any required original-context
collection in its same-thread history, then resupplies them unchanged for
`inspect`, `begin`, `complete` and identical retries, including after restart.
`begin` requires that exact request and records `commit_unknown` before the
actual native read-only invocation. The active caller owns invocation and
observation; Core does not dispatch tools. `complete` requires the matching
action/session/controller, native agent/tool reference and full observed
result. A matching terminal PASS or FAIL stores its result digest as `applied`.
Identical completion retry is safe; altered results reject. Timeout, disconnect
or missing observation leaves UNKNOWN and cannot authorize reissue. Lost
original-context custody after begin also leaves UNKNOWN and does not permit
reconstruction or reissue. Result and original-context bodies stay in caller
history; current Source is independently snapshotted at prepare and checked
again at begin/complete.

These checks establish cooperative report consistency, not independent native
tool-origin attestation or Runtime acceptance. Both PASS and FAIL grant no Source
write, owner disposition, configuration adoption or Runtime rights. Original
Work, Journal, tickets and claims are preserved; producer and maintenance fences
remain applicable. Subsequent Source admission requires its own original-context
FIFO/CAS authority. No parallel ledger or cross-system atomicity is implied.

The route is Source implementation; fixture regressions do not qualify actual
native observation, installed delivery or Runtime acceptance. Existing
`CodexDesktopAdapterContract/v1` remains a compatibility surface and does not
supply or constrain internal recovery trust. Active strict-v1 shapes are unchanged;
future changes still require functional bundle-owned artifact/dependency repair.
Supporting facts and qualification limits are in the
[framework reference registry](research/agent-framework-reference-registry.md#host-independent-recovery-review-ingress).

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

`run --release-unissued-owner true` exposes that finite case with
`UnissuedOwnerReleaseRequest/v1` and the explicit `unissued_prepared` predicate.
Inspect and apply use the original owner's handle, baseline engine, scope and
Work/Ledger/Journal/maintenance versions. The existing release transaction keeps
the whole unissued frontier inert. It grants no Source rights, new execution,
configuration adoption or task acceptance. The historical request format and
its completed/unknown predicates remain unchanged.

`run --release-settled-research-owner true` provides a separate finite release
with `SettledResearchOwnerReleaseRequest/v1` and `settled_research`. Each observed
action must be a completed configured readonly assignment with an admitted
research or synthesis artifact. Its normalization plan, activation use, original
ticket, run, scope and observation must match. The retained record, activation
history prefix and changelog event must pass the existing lineage validators.
The reader uses the original research paths and checks their bytes again. It
does not acquire a research write gate or adopt the current configuration.

The successor frontier must be wholly unissued and unreserved. Pending or
unknown effects, failed observations, a Host writer assignment, missing records
or changed lineage deny release. The existing owner, FIFO, maintenance and
Work/Ledger/Journal CAS checks still apply. Release retains all observations,
artifacts, FAIL/GAP findings and the unissued successor. It grants no execution,
configuration adoption or task acceptance. Exact retries return the same
suspension; the prior historical and unissued request formats stay unchanged.

`run --release-readonly-bookkeeping-owner true` uses the distinct
`ReadonlyBookkeepingOwnerReleaseRequest/v1` and `readonly_bookkeeping` predicate.
It releases only the original readonly owner. Every committed activation plan
must bind to the original action, issue, ticket and scope, and its canonical
history prefix must pass strict validation. Normalization plans require a
matching completed observation and the committed physical record/changelog
lineage. Every Work artifact at that path must match schema, stage and bytes.
Absent canonical admission remains GAP; this route never admits an artifact or
satisfies a produced contract. Missing or changed physical records deny release.

There are no Host writer assignments or reservations. At most one issue may
remain pending, with no egress rights and no normalization plan. Preserve that
UNKNOWN and all terminal observations. An inert successor has no issued action
or bookkeeping reservation. Original owner, Work/Ledger/Journal/maintenance CAS
and overlapping FIFO checks remain. Release leaves the engine and all records
unchanged and grants no execution, configuration adoption or acceptance.
An exact expired lease may be disposed while its active ticket and claim still
match owner, generation, resources and expiry. This is not renewal. Any other
overlapping queued, active, ready-for-handoff or blocked ticket denies release.
The prior historical, unissued and settled-research families remain strict.

A config-rebind read may retain a pending activated UNKNOWN from this predicate
only when the original release operation is still exact. The persisted
decision pointer and admitted native session must reproduce exactly one of the
two supported original request intents. The released ticket, its single
released claim, activation ticket and generation, source scope and current
quiescent resource scope must all match. The existing readonly-bookkeeping
inspection revalidates the original activation history. A later global ledger
revision is allowed when that scoped release proof remains exact and no current
ticket overlaps its resources. Rebind preserves the original pending Journal
item and engine snapshot and binds the activation and release evidence into its
state digest. It does not infer an effect outcome, settle or replay the issue,
normalize a result, admit an artifact, or grant Source, Runtime or acceptance
rights.

The historical owner routes may select `--context-history` with an existing
retained `VidaAgentRunResult/v1` body. The caller's configured contexts bind to
one canonical journal action each and pass the existing strict context and
engine checks. The current documentation is not substituted for those retained
bodies. Extra, foreign or changed bodies deny. The export remains cooperative
evidence; it does not authenticate a caller or authorize lease disposal.
This reuses [Mastra's retained workflow snapshots](https://mastra.ai/docs/workflows/snapshots)
for state consistency. Host ownership and the existing SQLite transaction remain
the authority for lease release; the engine snapshot is never rewritten. This
also follows [SQLite's single-writer transaction boundary](https://www.sqlite.org/lang_transaction.html).

Reports of failed native research or synthesis remain durable terminal
observations. They create no successful research artifact and cannot satisfy a
success gate. An exact action, issue and observation retry must return the current
persisted snapshot after a lost acknowledgement, including after wave advance;
a changed payload conflicts. This does not deduplicate external effects.

Known source-writer failure must remain distinct from unknown effects: preserve
the durable original issue and effect identity, create no successful artifact,
and grant no replay or no-effect proof. Public exact-ACK ordering preserves the durable exact retry; known writer-failure
handling remains a separately tracked behavior GAP. General same-work/attempt
correction after accepted negative validation is required; its current
implementation GAP is explicit corrective assignment authority and artifact
repair. The configured assignment index remains its original parallel slot.
An explicit correction generation, distinct from ownership lease generation,
must bind the new Host-issued corrective assignment to immutable completed
history, actual negative findings, attributable `correction_authorization`,
preserved `recovery` evidence, current scope/acceptance and a live exact-path
lease. All issued actions must have attributable terminal outcomes before this
transition; an unknown outcome grants no replay. HostState owns the atomic
authorization and journal transition. A functional bundle-owned artifact
repair command with fenced atomic application and resume/recovery must be
qualified and shipped before changing active current-v1 artifacts. Runtime
readers do not fall back to prior shapes. Correction does not forge a new
predecessor identity, reuse a lease generation as its ordinal, imply physical
isolation or confer delivery/Runtime acceptance. One owner-authorized correction
permits one bounded configured corrective execution. A further FAIL stops
again until another explicit owner authorization; there is no automatic retry
loop. The workflow's `max_attempts` keeps its existing work-attempt meaning and
does not limit correction generation. Repair restore preserves semantic prior
authority in strict current-v1 shape, including explicit generation zero for
base attempts; raw preimages remain provenance. New assignment or work writes
after the frozen repair postimage block restore through dependency CAS.

The explicit correction-generation repair may normalize a proven original
non-corrective Source attempt while its provider outcome remains unknown.
Require the unchanged generation-zero assignment identity, zero correction
count, matching original Host and journal receipts, and the exact issued action
with its retained authorization. Normalize only the wholly absent
`correction_generation`/`correction_authorization` pair to `0`/`null`, including
the nested authorization receipt. Partial fields, corrective history, mismatched
authority, competing Source ownership and unrelated unknown effects fail closed.
Unrelated execution-only read-only claims remain unchanged under ledger CAS.
Journals requiring no correction metadata normalization remain unchanged frozen
CAS dependencies, including issued read-only actions without a Host reservation
or observation. Their unknown outcomes are neither settled nor inferred. Every
journal requiring normalization retains the complete issued-action checks;
an unrelated unknown action inside that changed journal still blocks repair.
An observed terminal Host attempt may retain its original started reservation
receipt. Require exact stable attempt fields and a matching recorded observation
and Host result digest; only status, result and result digest may differ between
that original receipt and its completed Host attempt. Preserve both states.
Preserve the
attempt's status, null result and observation, issue, approval, scope and lease;
repair neither releases ownership nor settles `commit_unknown` or authorizes
replay. Freeze work, journal, ledger, governance and maintenance dependencies
and apply all postimages in the existing immediate transaction with CAS. Exact
resume and semantic restore retain strict current-v1 shape. The bundle-owned
repair operation stores an
ordered aggregate of individually validated, bounded rows with a checksum of
the exact stored payload. Its immutable recovery projection is not one public
ingress document; public input and individual row limits remain unchanged.
Owner retirement
and outcome reconciliation remain separate public operations on the actual
owner's state.

Before fresh admission, package-owned executable inventory establishes runtime
identity; caller-selected subsets cannot define that authority. Source CLI and
SDK use the same canonical package-root inventory, including live renewal,
expired recovery and runtime-code-rebind; public run requires the complete
expected exports. Copied-package source or generated-engine omissions fail
before engine construction. Qualification must bind those boundaries to the actual executing package and
current release operation.

For first clean cutover, old accepted subset-engine intakes are archival or
lawfully superseded only. No old-subset reader fallback or conversion to new
engine artifacts is supported. A developer request that failed before admission
starts fresh canonical work in the same chat. Unknown native effects remain
protected; typed quiescent supersession is neither COMPLETE nor Runtime
acceptance. Recovery accepts only exact owned execution or validated file
resources. Effective graph validation must retain required producers/consumer
cardinality; suspension retires only own unissued queued intents. Their precise
current defect/evidence dispositions remain in the existing audit research.

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
All child or disjoint contours of one attributable human request reuse the same
original scope `attribution.thread_id` and `attribution.pointer`. Generated
intake filenames identify operational artifacts, not new human requests. A
genuinely changed human request supplies its own attributable reference; do not
introduce a WorkGroup key or derive request identity from an intake pathname.
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
The internal migration writer and maintenance-release verifier share one persisted
encoding: SHA256 of the exact `JSON.stringify` payload bytes stored in the
operation row. The verifier separately checks parsed semantic binding, status
and fence; it does not substitute canonicalized parsed JSON for that byte check.
This changes no active schema or public digest contract.
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
exact. The SDK helper and repository-only deployment adapter require actual current
qualification before consumer deployment. No migration CLI is implied; current
installed readiness comes from public release state and delivery evidence.

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

Research artifact repair plan/apply resolves Ajv, YAML and schemas through the
existing executing `runtimePackageAccess` package root. The explicit consumer
root anchors repaired artifacts; it is not a validator/dependency source and
needs no copied `vida-agent` tree or alias fallback.

A fresh Host context with no retained assignments may inspect an absent optional
Mastra journal table/row read-only without creating it. Retained started or
uncertain Host assignments require their journal and fail closed when it is
missing. Table absence proves neither terminal completion nor quiescence for
retained effects; it cannot bypass terminal ownership reconciliation.

Research normalization preserves its immutable current-v1 reserved plan, exact
target-record CAS and unique lineage event. Under the existing changelog lock,
valid unrelated append-only events remain intact during apply, guarded read and
admission. Changed original prefix, target record or own event, duplicate own
event and uncertain partial effects remain conflicts. Recovery of a known
record-first partial write uses the same persisted observation and plan.

`run --resume-historical-normalization true` is a separate original-owner
continuation for one completed research observation with an already-reserved
`ObservedResearchRecordPlan/v1`. `inspect` returns machine-computed bindings for
the accepted baseline and receipt, original engine, original owner, action,
plan, observation, activation, source scope, and current Work/Ledger/Journal/
maintenance versions and raw target-byte bindings. The inspect and result
envelopes state `caller_identity_authenticated: false` and
`caller_authorization_required: true`. Inspection also binds
`original_operation_reference` to the retained accepted scope's
`attribution.pointer`; apply and resume compare that pointer with the inspected
request. It is a trace reference, not caller authentication or authorization.
`apply` requires that exact inspected request; `resume` uses the same request to
retry only an exact record-first or complete pair publication. The route reads
the original accepted configuration and engine through
`inspectHistoricalOwnerContext`, then acquires the existing changelog and
activation-history locks before the immediate Host transaction. That transaction
rechecks the original Work/Ledger/Journal/maintenance CAS and the producer fence
before safe asynchronous atomic writes. It compares raw bytes and rejects invalid
UTF-8. On failure, an existing beforeimage is conditionally restored only while
the current bytes still match the exact candidate. Newly created exact reserved
candidate bytes remain as resumable custody when the safe repository interface
cannot remove them; the route reports failure and does not claim that the
beforeimage was restored. A plan with an existing record beforeimage and no
changelog beforeimage is denied before publication because its mixed partial
state cannot be resumed safely. It does not update Work, Journal, lease,
artifacts or configuration, and grants no execution, owner disposition,
artifact credit or Runtime acceptance. Foreign bytes, altered lineage, changed
bindings and event-without-record state remain denied.

The pinned Bun launcher validates package metadata and the exact pin before
checking an absolute realpath executable from PATH. Only an exact version is
used; absent, malformed or mismatched PATH candidates fall back to the existing
npm pinned resolver. Explicit executable overrides retain strict checks. For
nested shell commands, the launcher uses npm's `.bin` directory only when the
alias resolves to that same pinned executable; otherwise it prepends the
executable's own directory. This supports npm's Linux `bun.exe` payload without
accepting a different Bun. Standalone runtime marker checks and child arguments
remain unchanged. Local tool discovery does not attest toolchain provenance or
guarantee offline operation.

Safe repository locks treat the requested path as the protected resource and
create an exclusive `.lock` sidecar, preserving any existing payload bytes.
On Windows, an acquisition-only opened-file identity mismatch or the precise
deleted-file `EPERM`/`stat` failure is reported as lock contention only when the
same pinned filesystem root confirms that the sidecar is absent. A present
replacement or a failed absence check preserves the original failure. The
original error remains attached as the cause; ordinary permission errors remain
denials. Existing callers retain their bounded retry policy; this classification
adds no retry loop or deadline. Once the protected callback starts, neither its
errors nor release errors may become retryable acquisition failures.
On Linux, sidecar names longer than 199 UTF-8 bytes use a fixed-size
`.vida-resource-lock-<sha256 of resource basename>.lock` name in the same
directory, reserving room for reclaim and quarantine suffixes within NAME_MAX.
Linux lock acquisition, stale-lock quarantine and release stay bound to opened
directory/file identities and fail closed on foreign or changed entries. The
lock namespace change requires quiescence while upgrading cooperating writers;
it does not promise coordination with older processes still using the prior
in-place lock name.

Linux replacement stages and synchronizes complete bytes in a private sibling.
The attested descriptor-relative `renameReplace` publishes that file atomically;
raw readers see complete old or new bytes on successful publication. The
expected target identity and content are checked under the same `.cas.lock` as
cooperating writers. This is cooperative CAS, not a kernel conditional rename
against arbitrary same-privilege namespace changes. Directory listings remain
advisory and can include private siblings.

CAS locks use the same byte-bounded resource-lock naming rule. Private staging
and backup names reserve room for cleanup quarantine suffixes. Long target
basenames use a deterministic bounded sibling stem and a distinct backup suffix.
Recovery recognizes original and bounded backup names without confusing a
literal target basename with another target's bounded stem. Cleanup quarantine
names are also byte-bounded. Ambiguous custody remains fenced.

Private backup creation may use the native exclusive clone or, for supported
clone-unavailable errors, a bounded descriptor-to-descriptor copy. Copy fallback
never publishes partial bytes under the final target name. Writer exclusion
continues through owned staging cleanup and recovery; unresolved identity or
backup custody keeps the operation fenced. Shared directory traversal closes
owned descriptors on every component failure. FIFO existence probes are
nonblocking, while non-regular content reads still deny.
Before retiring an original backup, recovery reopens and verifies the restored
pathname against its descriptor identity and expected content; ambiguous or
substituted targets retain the original backup. These checks do not provide
physical fencing against noncooperating writers or a power-loss guarantee.

The Mastra adapter converts the exact physical database path with
`pathToFileURL`. Literal percent signs, fragments, spaces and Unicode therefore
resolve to the file checked by its existing inode fence. Tester evidence accepts
the declared Host-bound `sourceStore` input and still rejects unknown caller
fields or stale Source. A confirmed no-effect recovery retry checks the stored
proof, decision and renewed lease before returning unchanged state; it does not
consume another verifier, generation or CAS. UNKNOWN work is never reissued.

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
local package qualification nor activate provider execution or API billing.
The local package default remains built-in session tools. The connector public seam is not
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

Select dependency-ready self-development batches by one prior qualitative
workflow/step/token estimate, with shared developer unblocking first and installed
dependencies preserved. Each whole verified engineering outcome requires an
exact qualified local system update without changing the current semantic
version before dependent next-batch effects. There is no separate achieved-
savings/OPT19 scoring lane. Detailed execution policy and assurance sequencing
have one owner: the development-lifecycle self-development protocol.

Acceptance requires actual native primary PATH discovery from an unrelated cwd
with external runtimes absent and first-run network unavailable,
package-owned resource reads, fresh initialization with exact project maps,
preserved owner settings on repeat initialization, and a genuine typed fresh
work intake without manual integrity values. Consumer migration requires
atomic/recoverable current-v1 repair and exact fenced retirement with unrelated
product data preserved. Static tests never close attributable Runtime acceptance.

Current Code evidence includes the full transferred source, public umbrella
discovery, package/consumer initialization access split and new-repository
reconciliation. Read candidate/installed versions and readiness from public
local-release state and current operation receipts, not a specification snapshot.
Selected external-package runs, consumer repair/rollback, final assurance and
installed Runtime acceptance require their own current evidence. Focused Source
checks do not qualify a complete release.
The future OpenAI/SDK/Codex adapters and per-product directory extensions are
separate planned work. The old executor-only repair does not prove general
configuration or storage relocation.

## Distribution, recovery and evidence boundaries

Verification subprocesses consume any finite enclosing caller/host/case budget,
including setup and prior operations; ordinary phases have no implicit total
deadline. Cleanup preserves the
reporting half of the existing reserve; a spent allowance records unknown
termination without another cleanup effect. Child return, cleanup allocation,
cleanup execution and whole-command duration are independent observations.
Operating-system delays may exceed an allocated deadline and never establish
successful termination. Unknown children retain their mutable fixtures and block
reuse or teardown. The verification policy and command inventory remain owned
by [TESTING.md](../TESTING.md).

Native exclusive creation reuses one initialized Root promise while validating
the first construction and each actual effect. Package attestation and original
root identity are checked after the creator caller's await, immediately before
native mkdir/create dispatch without an intervening JavaScript await, then
again after completion. Reusing the Root never caches attestation or grants
Host/work authority. Parent, path, byte, reparse, hardlink, collision and provider
durability/containment checks remain required. Wrong-platform provider
preparation returns unavailable before loading; libc inspection belongs only
to Linux target selection. Simulation, Source timings and successful local
Windows controls do not establish native target or Runtime acceptance.

Asynchronous CAS replacement and exclusive locking also reuse this Root. They
retain the original fresh package and root-identity checks before and after
awaiting it, before dispatching the lock or replacement helper. A cached native
binding is not current attestation. Drift during the await must deny entry
without changing payload, creating a lock sidecar or invoking the callback.

Descriptor simulation preserves the Linux production contract while adapting
Windows flush access only inside owned test fixtures. Temporary writable handles
require physical containment and the same private regular-file identity and
must close after the flush. Simulation cannot grant native durability evidence;
its verification contract remains owned by [TESTING.md](../TESTING.md).
The intentional directory-synchronization simulation applies only to a directory
descriptor; a mapped directory cannot suppress a regular-file identity check.

The Source reaudit findings apply to their recorded snapshot and must be
revalidated against current Source. Merged Linux portability changes are Source
evidence, not Windows or installed release acceptance. Native standalone remains
the target distribution; until its tracked implementation and target-specific
qualification exist, normal npm packaging describes only the implemented SDK
compatibility payload and verifies that payload. An absent native builder cannot
be a working default prepack dependency or be replaced by an unverified archive.

Runtime initialization retries bounded lock-acquisition contention on Linux and
Windows, rereading the receipt under the acquired lock. Once the protected
operation starts, an error is returned without retrying its possibly completed
effects. Pending-to-bound receipt identity and source CAS checks remain required.

Research-wave local preparation and possible external exposure are distinct.
Durable issue identities precede preparation; recovery retains the same issue,
work and journal identities. A durable exposure barrier must precede returning
any issued action. Once output may have escaped, null observations do not prove
no external effect and never authorize redispatch. Legacy incomplete preparation
is recoverable only through an explicit operation proving the whole original
wave could not have been exposed; otherwise it remains uncertain.

Tester reports currently provide cooperative report consistency bound to the
observed tester action and current source bytes. They do not attest execution of
an expected subprocess suite. Public delivery projections must distinguish the
tester-reported verdict from verified test execution; stronger automated
execution-proof assurance requires a trusted execution boundary and cannot be
manufactured from another caller-controlled exit code or reference.

The reported SQLite corruption incident has no available frozen DB/WAL/SHM or
reproducer in the supplied attachment. Its cause is unlocalized; no database
repair, data deletion, or successful causal fix is inferred from Source changes.

Workflow compilation validates the effective graph after risk filtering, before
opening or starting Mastra: at least one assignment must remain, required stages
and declared terminals must survive, and consumed artifacts need effective
producers. Filtering preserves each original assignment index. An empty or
incomplete graph is a typed block, never a successful no-op.

Public session actions carry a versioned resolved profile bound to the current
configuration: model, reasoning, execution mode, mutation scope, resolved tool
and egress policy, and configured skill references. This projection declares
requirements; `enforcement_status: not_asserted` does not certify native host
capabilities, sandboxing or actual policy application.

Current strict implementation scope supports the ordinary typed research result
and synthesis normalization path. Undeclared `research_mode`, `answer_only`,
`save_document` and associated output hints are not supported public scope
fields. Strict schema validation rejects these fields; the ordinary typed normalization
path remains the single supported contract.
