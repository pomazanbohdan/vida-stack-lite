# Portable runtime verification

Owner: runtime maintainers. This file names required checks; it does not claim that they pass. Record command, cwd, exact tool/dependency versions, exit code, sanitized result, scope, and tested fingerprint. Missing, skipped, timed-out, or partial required evidence is a GAP. Keep Decision, Code, Static, Runtime, and GAP evidence separate; user acceptance must bind the delivered current version.

For test-speed changes, follow the single normative rule in
[`development-lifecycle.md#self-development-protocol`](instructions/development-lifecycle.md#self-development-protocol).
Existing phase and whole-command timings describe observations; case timings
alone do not establish aggregate savings. Removing a deadline is not a speedup.

## Local execution policy

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

During development, run only selected affected test files/cases and the smallest
regression controls for the current correction. Include callers, configuration,
schemas and subprocess routes that import graphs cannot discover. Pass an exact
file path together with a name filter so unrelated modules and expensive setup
are not loaded. Reuse current generated outputs while their inputs remain
unchanged. Missing or stale outputs are a GAP; do not run a local build. Do not run a
full suite after each subfix or repeat passing unchanged checks to score savings.

After the engineering task's corrections are complete, run the full applicable
current task suite once. Reuse its still-current evidence in final mandatory
assurance; source changes invalidate affected evidence rather than silently
reusing it. A failure requires diagnosis, a scoped correction and its focused
regression before the final affected completion check. Partial development
results never establish full qualification or Runtime acceptance.

Agent test commands have no implicit aggregate watchdog. Explicit caller and
operation-specific bounds remain binding. Preserve failed and UNKNOWN receipts;
process absence does not authorize replay or cleanup.

Generic command-failure controls use inert JavaScript output/exit children, never
compiler, build or installation commands. Check stdout-only, stderr-only and
both-stream nonzero failures: the diagnostic body separately labels each bounded
2048-character tail, while the saved terminal receipt retains full streams,
command identity, exit code and signal. Literal program arguments in the error
header cannot satisfy this check. Preserve trimmed stdout on success. The existing
retarget-state suite uses one pinned ordinary observer with its own shorter caller
bound inside the unchanged case bound; incomplete observation retains UNKNOWN
and owned fixture bytes without reissue or cleanup.

The five parameterized `interrupted %s resumes one current operation without
duplicate receipt effects` cases are serial restart/resume lifecycle wrappers,
not latency checks. They use Bun's disabled case watchdog and await each operation
before fixture teardown. Preserve their assertions, existing lock behavior and
explicit CLI/caller limits. The direct rebind API has no deadline option; do not
describe these operations as having a finite per-operation timeout. Other
individual case bounds remain unchanged.

## Primary standalone qualification

Trace the accepted SA-CLI, SA-RESOURCES, SA-STATE, SA-OPT, SA-RELEASE, SA-NOTES,
SA-CI and SA-ASSURANCE criteria in the existing system specification to actual
current evidence. Qualify each advertised native OS/CPU target on that target's
runner, including Windows x64 and only actually supported Linux targets. A
minimal executable probe or cross-compilation alone cannot qualify VIDA.

Local `test:resources:pinned` checks runtime resource integrity, concurrency and
interrupted publication with synthetic data. It does not build, pack or install.
Native delivery/build/install checks in this section belong to CI/CD. Their
current exact-asset receipts remain required and separate from local agent proof.

The prepared repository-only workflow `agent-native-delivery.yml` and
`tooling/agent/native-ci-delivery.mjs` contain seven sequential actual delivery
phases and one result-emission step. They are dormant and unexecuted here; Source
checks do not qualify the pipeline, firewall/native capability, exact asset or
installation. Public route denials need actual terminal child observations and
specific errors; prerequisite or UNKNOWN failures cannot count as valid denials.
The Windows/current-asset same-version upgrade controls do not establish other
target support or cross-version rollback. Qualify the approved provider/profile
and applicable standalone requirements before their activation or delivery.
Broad dependency/tool and caller adaptation is last in 0.1.3, after P0 native
UPDATE01/developer-unblocking and required installed checkpoints, before final
0.1.3 delivery and acceptance. Reuse exact current qualified pins for P0 work;
metadata drift alone does not block it. Actual required runtime/reader defects
and missing target evidence remain blockers for their dependent effects.

Local `release-retarget-state.test.mjs` contains only inert synthetic state and
provenance controls for CI dormancy, exact request/phase ordering, commit/attempt
artifact identity, redirect/credential separation and retained partial bounded
transport. Fetch is explicitly mocked; these controls never form, download from
a provider, execute or install a delivery asset. Keep the existing optional
ZIP-reader dependency-drift refusal separate from synthetic transport passes.

The public-observer ZIP regression uses actual existing archive APIs and only
mocked provider GETs. A valid synthetic ZIP must succeed; duplicate physical
result names must refuse before a successful observation, with transport bytes
preserved. `VIDA_CI_READER_ROOT` may explicitly name a prepared private dependency
environment; otherwise the repository root is used. Its agent package.json and
bun.lock must equal current Source bytes, and the unchanged production guard
checks actual resolved versions. Missing or drifting capability fails as a GAP;
tests never skip, copy or install dependencies. This verifies the local observer
boundary, not the normal Source environment, real CI/native delivery or installed
acceptance. Keep the exclusive transport fixture within the selected root and
retain UNKNOWN custody rather than deleting an active fixture.

Run every public command route and aliases from unrelated cwd with external
Node/npm/Bun absent from PATH and first-run network unavailable. Verify actual
Cedar WASM evaluation, original fs-safe native attestation/guarded I/O,
Mastra/LibSQL durable state, ProjectContext, CAS, maintenance, restart and repair.
Resource checks cover owned physical instruction paths, version/payload-bound
private materialization, path/link/hardlink escape, partial/tampered/conflicting
state, concurrency and interrupted publication. Consumer YAML/DB/WAL/SHM remain
external and owner values survive initialization, repair and installation.

Check native user-bin defaults on Windows and Unix, sibling version/operation
release trees, preserved npm shims and explicit PATH effects. Exercise exclusive
first creation, observed-prior upgrade CAS, changed/foreign prior entries and
unknown-effect inspection before replay; verify declared rollback effects without
moving consumer configuration or DB/WAL/SHM. Admission tests must reuse the
original human request reference across child/disjoint contours despite different
intake filenames, and absorb a genuinely changed request only within the existing
configured session/repository/exact-project boundaries, preserving old history.

Verify deterministic pinned Bun 1.4.2 build inputs, retained diagnostic names,
disabled ambient build configuration and actual minify/bytecode behavior. Measure
comparable startup/control latency, memory and size before claiming optimization;
short commands/control return target under two seconds. Preserve every maintained
SDK export and qualify library artifacts separately. Build/package CI and English
version/product release notes include actual changes, targets, prerequisites,
evidence and GAPs; preparing publish scripts does not execute publication.

Final source and exact native assets require current mandatory checks, three
fresh blind reviews, reverse validation and CLEAR. Verify explicit installation
manifest target/PATH/prior-install/rollback effects and actual installed behavior;
Public agent CLI installation through npm is not supported; npm artifacts serve
SDK library imports only. Public agent delivery
requires the standalone asset with embedded pinned Bun. Preserve SDK library
proof separately; a formed SDK/npm archive cannot satisfy this delivery gate.
Use the current pending identity and supported reconciliation for an uninstalled
operation; preserve its archive, failed observations and UNKNOWN custody. Native
and CI GAPs remain explicit; no bypass flag or publication is allowed.
Actual implementation/readiness and test outcomes belong to current operation
receipts; neither this checklist nor preparation establishes Runtime acceptance.

## Source development-controller qualification

Verify bundle-owned prepare/inspect/verify/controlled execution with an immutable
current-candidate controller outside editable Source. Assert logical target bundle
`packages/agent`, unchanged original repository/exact projects/request reference,
existing Host/Work scope/lease/CAS identity and separate target source/controller
code bindings without new schema fields. Reject active-selector targets; preserve
selected-root containment and deny worktree/FIFO/alias/predecessor escapes.

Require pinned current SDK exports/dependencies, fs-safe/native and embedded or
physical resource integrity, actual isolated init/scope/admission, and accepted
own-target bin-addition report behavior. Exercise controller tampering/drift,
wrong package/pin/missing dependency, undeclared target writes and expected target
edits that continue the same attempt through unchanged controller code. Check
normal affected-proof invalidation, restart and failure boundaries. Metadata and
inspection grant no approval/lease/Runtime acceptance; no global PATH or production
selector effect occurs. Qualification does not claim physical isolation or a
general detector for unrelated external edits. Record actual readiness separately
from construction; a copied tree or successful thin probe cannot close this gate.

## Candidate repository verification

The ordinary `npm test` command runs four disjoint agent phases: `test:pinned`,
`test:repair:pinned`, `test:host-state:pinned` and `test:run-entrypoint:pinned`.
These phases do not build or install. `local:candidate:pinned` is the final local
agent matrix; `ci:pinned` performs delivery preparation only. Use focused checks
during development and run the full applicable agent task suite once at task end.
Reuse still-current evidence; source changes invalidate only affected proof.
Selected tests that import generated SDK code need current outputs; refresh
changed outputs explicitly, never rebuild automatically for each test command.

When a caller selects a finite parent deadline, nested harness commands spend
that parent's remaining allowance;
pack/extract/install/repair and recovery calls never restart that allowance.
The pinned launcher propagates a bounded duration and same-host Unix expiry,
then each child establishes a local monotonic deadline. Expired or malformed
metadata fails before another child is launched. The original process-tree
deadline remains authoritative through clock changes; this is not a lease or
authorization mechanism. Reserve bounded cleanup/report time inside the parent
budget. Preserve operation-specific case/probe/install deadlines, including
five-second relocation cases, and bounded cleanup/report reserves. Record
timeout, cleanup command status/error and unknown termination
separately; a cleanup attempt or successful signal does not prove descendants
stopped. Unknown child outcomes prevent fixture reuse or deletion.

The existing reserve has two parts: cleanup may spend at most the time before
its final report half. A late child return can leave no cleanup allowance; record
that as an unattempted unknown outcome and retain its fixtures. Record child
return time, allocated cleanup time, actual cleanup time and whole-command time
separately. These are allocation and observation boundaries, not a hard real-time
guarantee against OS scheduling delays. Every repair CLI case charges setup and
in-process operations to its unchanged five-second case budget before any public
resume child; completed exit1 still requires the original structured CAS denial
and file, journal, lineage and maintenance-fence assertions. Unknown repair
children prevent later fixture reuse and database/root teardown.

A positive reserve also caps cleanup at its allocated half, even when a short
child leaves more parent slack. A zero reserve retains its existing unpartitioned
remaining-deadline behavior, without inventing a reserved report or cleanup half.

Native exclusive-creation checks reuse the initialized Root promise, without
caching package attestation. Verify the first native construction check, the
current package/root check after every caller await immediately before mkdir or
create, and unchanged postcompletion checks. Preserve real cached-await root
replacement denial, exclusive collision and unavailable attestation controls.
Attestation failure injection wraps only the test's synchronous package-read
import; it changes neither production APIs nor shared dependency bytes. Wrong
platform preparation may be skipped; actual supported-target behavior and native
assurance remain independently qualified. A completed Windows test or Linux
descriptor simulation does not qualify the whole native product.

The cached Root also serves asynchronous CAS replacement and exclusive locking.
Those callers retain their original pre-await and post-await package/root checks
before helper dispatch. Exercise attestation drift and root replacement during
the cached await; require unchanged payload, absent lock sidecars and no callback
entry. The creator's three-to-two check reduction does not apply to these callers.

Require an observed integer terminal status without timeout, signal or spawn
error before parsing command protocol output. Completed expected exit1 still
requires its original denial payload and assertions. Record the primary stage,
timeout, status/signal/error and actual cleanup command result; JSON EOF must
not mask an uncertain process outcome. Initializer cases pass one case-entry
budget through every sequential child, including Node delegation, within each
unchanged declared timeout and the phase ceiling. Retain their mutable package,
consumer and linked external fixtures on uncertainty, including case-finally
cleanup. Retain private fixture staging when a completed parent failure can carry an
uncertain nested descendant. No failed phase becomes PASS through retention or diagnosis.

Relocation prepares each immutable instruction layout once. Recovery shares copied immutable package bytes while each of
the four workflows retains separate project/config/Host/journal/artifact roots,
its actual work directory, and fresh CLI interruption/restart/CAS/report/replay
boundaries. Assert external logical package/resource mapping and package bytes
before and after each route. The recovery dependency junction establishes only
agent fixture setup, not delivery installation. Capture fixture and per-command stage
times plus whole-command duration and cache/resource conditions; partial output
or fewer setups alone is not a speedup or a passing phase.

Stopped-source capture prepares and verifies one actual physically contained
controller through the supported frozen-lock copy installation. Its disposable
Source-shaped qualification target is separate from every fresh consumer.
Consumer cases execute the copied package's public `bin/run.mjs` through fresh
copied pinned-Bun processes; they do not invoke controller exec against a foreign
target. Compare the actual package binding before and after each case, and deny
reuse and cleanup on drift or unknown child outcomes. Setup, binding checks and
children share any explicitly inherited phase deadline; the fixture imposes no
total setup/suite timer. Each case retains its 60000ms cap.
Its single async teardown hook uses the cleanup half of the existing 30000ms
cleanup/report reserve through Bun's supported HookOptions. This static hook
allocation is at most 15000ms; live checks before and after the final fresh
package-binding check deny deletion if the finite parent can no longer preserve
that allocation and its report half. Bun's general default hook/case timeout is
unchanged. Log the exact private root before deleting and actual completion
afterward; a hook timeout, failed or deferred deletion retains custody and never
authorizes another cleanup attempt. Other unknown roots remain untouched.
Synthetic review/owner manifests bind the returned real package and never imply
actual review, delivery or Runtime acceptance. Preserve the independent mutable
package-drift control and original raw missing/null completion assertion; the
latter also requires the copied public CLI's structured denial and unchanged Host.
Recovery calls establish the copied package's existing pinned environment before
each fresh public process, preserving cache identity and all process boundaries.

Canonical JSON regression preserves nested wire equivalence, legal shared
references, descriptor/getter/prototype/toJSON/cycle denial and unchanged finite
node/depth/byte bounds. Loaded config digest reuse is limited to loader-owned
deeply frozen objects and checks current inherited serialization hooks on every
read, including after caching. Fresh YAML revisions and mutable external callers
must still produce fresh validation and digests. Data-only admitted context
checks retain current configuration, project, lease, canonical intake, native
thread and runtime inventory denial; actual kernel consumers retain opaque
capability construction and their later pre-effect/post-await checks. Journal-only
CLI retrieval reads actual persisted engine state without initializing storage;
start/resume still open the protected producer and preserve UNKNOWN custody.
Kernel and data-only consumers share the existing live-admission and native-handle
predicate. Require active matching ticket/claim/thread/generation/resources and
future ticket/claim expiries, nonblank handles of at most256characters and no
control characters. Exercise a coherent expired lease and inactive matching
claim, plus the existing claim-expiry projection denial and unchanged Host on
invalid handle. A schema-valid lease alone does not establish live admission.

Run the current-v1 candidate checks below with declared Bun 1.4.2 and the frozen lockfile. A different global Bun must not silently change the selected version. Build-generated output counts only when source and package fingerprints match. `local:candidate` runs agent checks locally; `ci` is delivery preparation. Local aggregate checks exclude mutation; launch it explicitly when requested. First-cutover approval uses the retained-behavior matrix and exact outcomes below. Aggregate 100% coverage/mutation and `CRAP < 5` remain measured, owned post-cutover GAPs, as authorized by the user.

```text
bun run local:candidate
bun run test:toolchain
bun run preflight
bun run typecheck
bun run test:config
bun run test
bun run test:fuzz
bun run test:zombies
bun run test:deep
bun run quality:static
bun run test:coverage
bun run coverage:gate
bun run crap
bun run format:check
```

`bun run test:mutation` is a separate explicit manual launch, never an aggregate or CI/CD step.

Use focused checks while editing and record each final-fingerprint result. Re-run affected checks after relevant changes. The ultimate quality gate is aggregate 100% coverage/mutation and `CRAP < 5` for every maintained function, with real output; report first-cutover shortfalls as owned post-cutover GAPs rather than passes. V8 covers packaged TypeScript other than the five Bun-native sources, plus public packaged `bin` entrypoints; the Bun-native lane binds LCOV and Istanbul counters to exact bytes. Report dependencies, generated output, tests, maintained production source, and tooling separately in size comparisons. Old-state task/ticket transfer and retired facade compatibility are excluded by the authorized clean start. Retained behavior is verified through the current-v1 routes below.

| Retained behavior                                                  | Current-v1 executable evidence                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config, project identity and root initialization                   | `runtime-config-yaml`, `project-context-boundary`, `initialization`, `portable-instructions`; delivery installation evidence is owned by CI/CD.                                                                                                                                                                                           |
| Ingress, workflow routing, configured roles and failure no-write   | `configured-workflow`, `run-entrypoint`, `run-cli-main`, `edictum-workflow-completeness`, `runtime-kernel-boundary`, `cedar-validation`.                                                                                                                                                                                                  |
| Authentication, reservation, replay, restart and uncertain effects | `host-state`, `runtime-kernel-boundary`, `persistent-session-handoff`, `scoped-source-snapshot`, `observed-research-result`.                                                                                                                                                                                                              |
| Lifecycle reviews, reverse validation, status and delivery         | `lifecycle-state`, `observed-validation`, plus exactly three fresh blind final reviews and reverse receipts on one sealed fingerprint.                                                                                                                                                                                                    |
| Documentation CLEAR                                                | Public `vida-agent-documentation-clear` baseline/closeout/verify in `documentation-clear.test.mjs`, typed deletion lineage and map denial, and real checkpoint revalidation at DELIVERY/COMPLETE in `bun/lifecycle-state.test.mjs`. The configured project policy is preserved as project data; old operational receipts remain inactive. |

Project-path regressions exercise equal-root membership for either selected
member, deepest nested foreign exclusion, POSIX versus Windows case matching,
outside-root paths through exact selected scope, unchanged `code_selectors`,
and fail-closed multiple selection. Keep `--repository-path` limited to
read-only evidence outside every product root. Scope and admission checks retain
traversal and symlink denial; forged foreign admission records only its existing
attempt audit and creates no work or writer lease.

These entries name maintained files. Fixture progression is bounded Code/Static
evidence; complete native terminal behavior requires its own actual observations.
Record platform skips as GAPs rather than PASS or equivalent native proof;
host-neutral logic and simulation cannot close installed/native Runtime evidence.

Generic dynamic decomposition has no current consumer or accepted requirement. CLEAR tests must run against an isolated built bundle named by `VIDA_CLEAR_BUNDLE`; the active project policy, its source path and schema are checked before the public operation writes evidence.

### Linux I/O and nested pinned Bun commands

On Linux, run `tests/safe-repository-linux-simulation.test.mjs` through the
isolated Bun/Vitest driver. It covers resource sidecar locks, unavailable
reflinks, partial descriptor writes, ambiguous/foreign copy targets, identity
substitution and bounded recovery. `tests/safe-repository-completeness.test.mjs`
checks the active provider contract; `tests/windows-exclusive-create.test.mjs`
checks portable exclusive creation and resource-lock behavior. Windows-native
results require an actual Windows runner; Linux simulation is not native Windows
evidence. `tests/bun-toolchain.test.mjs` verifies that a `.bin/bun` alias is used
only when its realpath matches the pinned executable. These focused runtime checks provide Code/Static evidence and do not establish
installed user acceptance or Runtime readiness.

The Linux descriptor simulation runs its isolated Vitest child explicitly on
Bun and exposes captured output for known nonzero failures before its original
status and twelve-control assertions. Keep its120000ms child and180000ms wrapper
limits. On an actual Windows host, only tracked readonly private files inside
current physical owned fixture roots may use a writable, nontruncating flush
handle. Verify identical device/inode, private regular-file identity and physical
path before flushing, and always close the temporary handle. Unknown descriptors,
foreign paths, identity drift and actual flush errors remain failures. Verify
readonly flush success without content change and substituted-path denial.
Directory synchronization remains simulated; this adapter establishes neither
Linux native behavior nor Linux file or directory durability.
Classify that directory exception by the opened descriptor, never its current
pathname. A file descriptor whose path becomes a directory must be denied;
retain this counterexample inside the existing positive control.

## Audit-state and successor qualification

Run these checks on frozen current inputs; record outcomes in the current work,
release operation and public evidence. Focused and writer checks do not imply
full-candidate, installed or Runtime acceptance. Standalone fixtures use supported OS temporary directories with owned cleanup
or explicit isolated fixture roots. Source-workspace scratch belongs in ignored
`.tmp` outside package Source; neither enters the staged payload.
Measure control return separately from elapsed test time under the lifecycle
speed rule. Keep numeric/native-platform exceptions and unverified behavior as
explicit evidence GAPs, not fabricated passes.

- Recovery rebind updates coupled identity fields; the next admitted public
  action succeeds, the old controller fails and retained observations survive.
- Declared contract/artifact recovery accepts task-packet-only synthesis;
  failed research remains durable without a success artifact.
- Exact public lost-ACK report/intake retry returns durable current state before
  stale caller CAS rejection; changed payload conflicts. No external effect
  deduplication follows. Persisted Mastra outcomes project status; null step
  alone never completes.
- Live same-owner heartbeat keeps its current fence and unrevoked scope;
  expiry/foreign takeover stays denied. Stable assignment indexes and
  graph-declared terminal outputs survive filtering/permutation.
- Prevalidated successor and predecessors commit under one immediate work/
  shared-ledger CAS. Same-pointer parallel and foreign-session/project contours
  survive; own unissued rights/queued intents release. Preserve phase/evidence/
  raw journals and reject ambiguity, stale CAS, reserved/unknown effects.
- Public work-state inspect creates no database or mutating pragma. Repair
  dependency drift, atomic recovery, bounded owned-field restore, monotonic
  versions and unknown-effect guards precede active artifact/reader upgrade.
- Consumer baseline/restore retains DB/WAL/SHM path and consistent backup,
  partitions work children and restores semantic beforeimages. First new valid
  admitted attempt closes rollback even if preparation fails; initialization
  alone does not. Keep maintenance/CAS across synchronous idempotent callbacks.
- Migration integrity uses the same persisted raw JSON bytes in writer/verifier,
  with semantic status/binding/fence checks separately retained. Cover unknown/
  inflight-before-callback denial, initial backup/null retry, baseline faults,
  interrupted restore/held fence, exact retry and original-store SHM stability.
- Retained-selector cutoff uses SQLite exclusion rather than persistent wx lock.
  Prove owner exclusion, process termination and subsequent progress; historical
  orphan guards require supported repair/retirement, never PID/age deletion.
  Directory fsync's accepted limitation supplies no power-loss guarantee.
- Canonical runtime inventory is shared by CLI/SDK admission, renewal, expired
  recovery and rebind; complete expected exports and copied source/generated
  engine omissions must be checked before construction. Old subset intakes stay
  archival/superseded; no subset fallback or new-engine artifact conversion.
- Research repair reads validators/dependencies/schemas from the executing
  package root, independent of consumer/root copied-package layouts.
- Fresh optional journal absence may be inspected read-only only without retained
  Host assignments. Missing journal for started/uncertain effects fails closed;
  absence cannot prove quiescence or authorize ownership release.
- Preserve partial-init owner values, recovery intent/refusals/idempotency and
  Unicode boundaries. Source-only fixture expectations use current identities,
  maps, resource classes and helpful root-safe messages; isolate runner context.

Terminal-writer NEW reports validate current source before `source_scope`.
ALREADY durable success cleanup binds matching journal/Host completed result,
issue/reservation/generation and journal/work/ledger CAS; own rights release
survives prior expiry or permitted later drift. Test expiry/drift, fault, foreign/
started guards, sequential writers, peer FIFO, stale races and exact retries.
Read-only tests/reviews/Runtime waiting hold no implementation files. Keep work/
phase/results/history and execution-only coordination; release grants neither
completion nor Runtime acceptance or fresh Source-write authority. Drift
invalidates byte-bound proof; correction uses fresh scope/FIFO. No old Code,
agent done, expiry, nested ordinary CAS, caller keys or schema fields bypasses
these boundaries.

Known writer-failure handling, exact execution-resource recovery, effective
producer/cardinality validation and queued-suspension behavior retain their
current requirement/evidence dispositions in the existing audit research.
SAME-attempt bounded correction has no approved budget; linked successor alone
cannot close it. Optional answer/save surfaces, safe publication-temp cleanup and
ledger rollover/read lookup remain tracked requirements. Prove clean-ledger
headroom before admission; no unsafe current-v1 compaction or invented jobs cap.
Repeat-build optimization remains evidence-led follow-up. Full required reviews,
reverse validation, CLEAR, installation and attributable Runtime acceptance bind
the actual current operation; suite receipts belong outside this living contract.

## Portable bundle verification

Run `bun run verify` from the bundle root for the local agent subset. It neither installs dependencies nor copies or installs a bundle. `bun run ci` performs delivery preparation only; CI/CD owns exact artifact/build/install validation. The repository has no configured trusted CI/CD receipt path, so release qualification stays blocked on that evidence GAP. Local successful logs cannot substitute for CI/CD evidence or attributable installed user acceptance. Numeric coverage, CRAP and manual mutation proof remain separate local requirements.

## Required integration evidence

Explicit correction-generation repair must exercise a real isolated admitted
Source attempt with an issued action, `started` Host status, `commit_unknown`
approval and null observation. Remove only both correction fields from Host and
all mirrored receipts. Prove inspect/plan/apply/resume/restore preserves every
other semantic field and grants no replay, outcome or ownership transition.
Retain terminal repair coverage. Reject partial fields, corrective history,
foreign/mismatched receipts or approvals, competing ownership and dependency
drift. Inject transaction failure to verify no partial Host/journal changes;
strict readers reject the preimage and accept only the repaired current-v1
shape. Synthetic source fixtures do not prove live consumer repair or retirement.

Project configuration rebind uses the public reconciliation kind
`runtime-config` and a new strict `ConfigRebindOperation/v1`; existing YAML and
initialization schema formats remain unchanged. The maintained focused test is
`tests/runtime-config-rebind.test.mjs`. Required evidence covers read-only
inspect/plan database state, exact executor-only target, maintenance held before
owner YAML authoring, receipt-only CAS with provenance preserved, independent
queued/active and issued/uncertain effect rejection, own-fence release,
interruption recovery, no-effect abandonment and actual rollback denial.
Manifest/reader integration additionally verifies exact two-file ownership
retirement with local files preserved, partial/unrelated omissions denied,
historical parent proof without current YAML pinning, safe current changelog
path, new-work configured profile and unchanged stale old work. Fixture
authorization and receipts are test setup, never real native or Runtime proof.

These scenarios are required acceptance criteria, not claims that the candidate already passes all of them. The public `vida-agent-run` path uses one LibSQL-backed Mastra graph for configured stage progression and a CAS ledger for session action issuance and observations. The active session alone invokes built-in collaboration tools. A fresh admitted source-writing work item uses the existing HostState work/ticket/lease and narrowly scoped `source.write` approval path. Bounded source and context snapshots invalidate affected evidence when declared bytes drift; they cannot attribute an external edit during the same write interval or inspect undeclared paths. A research-free task fixture has actual read-only Luna validator and tester observations through issuance of `prepare_delivery`, with synthesis/developer steps explicitly marked TEST SETUP. A separate source test prepares `DeliveryInstruction/v1` from a persisted proposal and current receipts. Another injected-fault test proves that a pre-issue HostState effect blocks replay until explicit positive no-invocation/quiescence evidence is supplied, reconciled and bound to a successor lease generation. Research-producing workflows still need genuine current `ResearchResult/v1` artifacts; portable installation, full assurance and user acceptance remain open. Runtime acceptance is attributable only to the user.

| Area                      | Required observation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portable install          | Copy only the complete bundle into an unrelated repository/path/identity. With this checkout inaccessible, install declared tools, initialize root files, load its own project YAML, and prepare/resume a new no-provider Mastra public run. Repeated initialization must preserve existing project values. A final-payload result remains to be measured.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Configuration             | Every retained role, model, workflow, operation, policy, command and path field has a consumer. Missing/invalid root YAML blocks; safe YAML parsing rejects duplicate keys, aliases/merges/custom tags, unknown fields and unsafe paths. Digest drift in new work requires explicit rebind; no template fallback or silent hot reload.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Session bridge            | The active session uses built-in spawn/follow-up/send/wait and interruption request tools; issue is CAS-persisted before a native call and reports bind action, issue and observed result. Prove restart, stale/duplicate/foreign report rejection, unknown effect reconciliation and real native observations. An interruption request alone is not termination or quiescence proof.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Workflows and roles       | Show configured order, branches, joins, failure handling and restart for all five workflows through the Mastra graph. Only an admitted implementation role with an exact-path lease and scoped source authorization may write source. Current focused tests prove first-to-second progression for all five and a research-free task path through test receipt; complete native workflow and research-artifact evidence remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Policy and evidence       | For every runtime-authorized source mutation, bind Cedar/Edictum policy, current approval, exact work/attempt/session lease and HostState attempt receipt. The public route now uses this path for one admitted source-writing assignment. Confirm pre-effect revocation, crash/unknown reconciliation, scoped source reads before issue/report/validation/delivery preparation, and affected evidence invalidation on drift. External edits remain allowed; no physical exclusion or actor attribution within a shared write interval is promised. Three final independent reviews, reverse validation and CLEAR bind one sealed fingerprint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Current-state persistence | Prove LibSQL Mastra restart/resume, current HostState lease/attempt CAS, exact-path containment and stale writer rejection, interruption versus observed terminal result, uncertain-effect reconciliation and cross-project isolation. External edits on declared paths must invalidate affected proof at fresh-read boundaries. Platform-specific skips need an applicable equivalent or explicit disposition, not a Windows-only release gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Root integration          | Inventory and test root `AGENTS.md`, `AGENT.sidecar.md`, YAML config, old JSON config and schema, root `package.json`, `.gsd-capabilities.json`, the three `script/Install-AgentDevelopmentRuntime.ps1`, `script/Invoke-AgentDevelopmentRuntime.ps1`, and `script/Invoke-AgentRuntimeBacklog.ps1` entrypoints, `.gsd` resolver/runtime-gate/hooks, and maintained templates/generator. Search `.codex` for callers; edit only verified active pointers. Verify retained calls resolve to the new bundle, retired commands fail clearly, project settings survive in YAML, unrelated product scripts and unrelated GSD registry entries remain, no replacement GSD entry is invented, and no generator restores an old path. Verify the staged registry removes the old `agent-development-runtime` key and every `agent-runtime/capability` source; require registry bytes in the prepared manifest and selector entrypoint evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Archive and cutover       | Under quiescence, hash and journal same-volume renames of `agent-runtime/`, `tests/agent-runtime/`, eligible `.agent/work/` children, `.agent/coordination/`, `agent-runtime.config.v1.json`, and `agent-runtime.config.v1.schema.json` to inactive provenance; verify unchanged bytes and isolation from active lookup. Inventory JSON consumers, retire active paths at selector commit and prove YAML is sole effective config. Journal staged bundle, root integration and clean state with idempotent expected identities/hashes; switch one selector after validation. Interrupt the process at each step and before/after commit; on restart prove one active authority or fail closed on conflict. Test collision, hash drift, old route rejection and no old receipt entering new state. Verify `agent-runtime/` and `tests/agent-runtime/` are absent from active paths and active work rows and coordination start clean while canonical DB/WAL/SHM remain at their configured paths with a consistent backup; no archived task or ticket is imported, rebound, resumed, or accepted by the new runtime. Retain the old snapshot through install/smoke; rollback closes when the cutoff witness records the first admitted new-work attempt before state writes, even if later preparation fails. Scope durability claims to process interruption and supported filesystems; do not claim universal power-loss recovery. |
| Bundle boundary           | Inspect package exports and complete final directory. Reject concrete source-repository, project, tenant, developer-home, Desktop and old-runtime dependencies, production `./legacy`, historical converter/fixture, missing files, and active readers of root `agent-runtime.config.v1.json` or its old schema. Prove the old `.gsd` resolver/runtime-gate is retired and the root GSD registry cannot resolve `agent-runtime/capability`; no active hook targets old code. Repository-only archive, migration evidence and product docs are excluded from the deployable bundle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Assurance and delivery

The final layout is reviewed before installation. Run exactly three fresh history-isolated blind reviews, reverse validation, and documentation CLEAR against the same sealed bytes after quality checks. A relevant mutation, including detected external drift in the scoped source, invalidates affected checks and the bound review set. Before `execute`, validate the approved `VidaCutoverActivationDecision/v1` at `.agent/cutover/<cutover-id>/activation-decision.v1.json`: the plan, payload manifest, projected selector intent, and six separate parity/security/assurance/rollback/DEV/UAT evidence files must match their current hashes. Exercise missing, rejected, stale and changed-decision or evidence cases, including `--resume`; no direct selector publication path may bypass the decision. These byte checks establish integrity, not authenticated DEV/UAT observation, current-attempt Cedar/Edictum enforcement, or general external-edit detection. The delivery manifest identifies created and modified files, exact installation destination and order, archived/repository-only items, and post-install checks. Static tests, file copying and hashes do not close Runtime acceptance; obtain attributable user testing of the installed version. Apply the project's attributable Git authorization and Sidecar exception. This Source repository's standing pack-success commit/push order is owned by `AGENT.sidecar.md#source-package-git-policy`; qualification follows current declared source-file and exact archive bytes. Git HEAD/commit metadata changes alone do not invalidate it; changed included inputs invalidate their affected proof. No consumer Git authority or Runtime acceptance is inferred.

Focused preparation, archive, stage, and entrypoint tests provide Code/Static evidence for the staged registry and exact old-test archive only; the live registry and `tests/agent-runtime/` remain unchanged before cutover. Source and tests provide Code/Static evidence only. Require separate observation of built-in session tool calls, installed bundle behavior, selector-bound cutover and user Runtime acceptance. Do not report a Desktop attestation, migrated ticket, or Windows-specific proof as a substitute.

Linux lock regressions cover legal 255-byte and multibyte resource basenames,
contention, release and reacquisition. Recovery fault injection substitutes the
restored target after descriptor verification in orphan and rollback paths; both
must preserve the original backup and leave the foreign target unchanged.

## Reaudit regression obligations

Run `tests/bun/runtime-initialization.test.mjs` in the ordinary Bun aggregate,
including same-process and separate-process contention, unchanged receipt identity,
foreign/stale receipts and bounded acquisition retry. An operation that already
entered its critical section must not be replayed because its error resembles
lock contention. Run Vitest suites importing Bun-only state under the pinned Bun
host (`bun x --bun vitest`); Node import failure is zero executed tests, not a pass.

`mutation-gate.mjs --inventory` must assign `final-assurance.ts` to the actual
final-assurance unit/public tests. Passing inventory does not mean mutations were
run or killed; manual mutation remains separately authorized and measured.
Fixture regressions use the maintained configured-test-context resolver and
current lifecycle/assignment factories, retaining negative assertions. Verify
source, extracted and unrelated-cwd fixture layout independently.

CI/CD owns exact SDK/native artifact and installation validation. Local agent
checks do not pack or install artifacts; no SDK archive closes native readiness. Tester evidence tests distinguish
reported pass from executed-suite proof and deny caller-supplied proof classes.
Research preparation tests must preserve issue identities on interruption and
remain uncertain once dispatch exposure is possible, rather than replaying an
unknown external effect.

Resource interruption tests retain private staging and reject partial publication;
cache write optimization preserves the flushed control lock and exact per-launch
byte checks. Database and release-journal durability are unchanged.

Native startup regressions require version/help to use the shared public CLI
formatter without loading an absent payload. Runtime cache checks remain required
before runtime use. Batched resource fault tests wait for every disjoint write
before releasing the lock, retain partial staging and refuse publication. These
focused checks do not qualify the product target or alter any caller deadline.

Directory creation checks current lstat metadata once for an existing directory;
missing creation and raced EEXIST still validate the resulting regular directory.

The discovery view retains the exact maintained bunfig.toml used by the child launcher. Local run/init fixtures retain their complete owned runtime payload.

Source-only repair/recovery fixtures exclude the exact generated dist/standalone
directory. They retain agent sources, schemas, instructions and current SDK
outputs; the repository text-read limit stays unchanged. The prepared CI/CD
workflow remains dormant; no provider pipeline/profile is activated and no
current build/install receipts exist. Delivery qualification remains an explicit GAP.

The complete `unprepared recovery` group in `tests/run-entrypoint.test.mjs`
checks original-baseline recovery after a valid current configuration revision
change, read-only inspect, exact apply/reopen/lost-ack retry and unchanged original
Work binding/run/intake. Capture a public request before changing current selected
project IDs, integration mapping or storage, then require both Host and public
apply to deny without Host/engine/YAML changes or a new moved-root Host database.
Current registry metadata is validated at recovery; no historical registry hash
comparison or configuration adoption is implied. Use selected affected cases
during development; after stabilization run this entire group and applicable
`historical` cases in `tests/runtime-config-rebind.test.mjs` once. These local
agent-state checks never compile, package or install the agent.

The same group creates actual SQLite `jsonb(?)` snapshots: unrelated valid state
permits finite recovery without changing engine bytes; matching run ID and
same-work alias are independent denials. Malformed BLOB, NULL and JSON5 text
refuse. A binary snapshot whose storage fits 8MiB but decoded JSON exceeds 8MiB
must deny before the projected payload SELECT, with Host/engine unchanged.
Keep physical/count preflight, strict native JSON validity and guarded decoding
ahead of payload fetch; text-only fixtures do not cover the actual store codec.

`tests/release-retarget-state.test.mjs` verifies the local agent state boundary:
same operation/version and three-field release changes; unchanged pending and
successful pointers, including absence; sealed SDK/receipt/log custody; active,
failed, UNKNOWN and installation-started denial; shared Node/Bun admission and
worker exclusion; planning reservation during copies; Source/path/archive drift;
exact known-phase interruption and
lost-ACK recovery; completed repair followed by legitimate worker progress.
Tiny inert archive bytes exercise state custody only. No compiler, package
command, delivery executable or installation runs in these checks. Local logs
still cannot replace trusted CI/CD delivery receipts. Development uses affected
cases; task completion runs this whole applicable suite once after stabilization.

The same agent-state suite covers portable CI requests and observations with
synthetic records: exact context/source/target/run/archive/payload/check binding,
exclusive retry and partial-write UNKNOWN, same-operation Source edits,
archive-owned selection without local dist, missing/failing observer, boundary
object mutation and Source drift during asynchronous observation. These checks
run no network, compiler, package or installation command. They prove consistency
controls, never real CI provenance or target qualification. The optional GitHub
adapter needs an approved workflow/runners and qualified ZIP reader; missing
optional support stays a GAP without installation.
Separate asynchronous fault controls change each local lane log, tests.json or
an operational input while CI observation is pending. Qualification must deny
and preserve the release journal. No real provider or delivered executable runs.

Review namespace and full exact-asset delivery proofs remain GAPs until actual
current qualification evidence exists. Local HostState, CAS, workflow and
recovery checks remain required. Do not treat deleted delivery tests as passing
evidence or lower numeric quality targets.
