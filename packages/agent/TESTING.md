# Portable runtime verification

Owner: runtime maintainers. This file names required checks; it does not claim that they pass. Record command, cwd, exact tool/dependency versions, exit code, sanitized result, scope, and tested fingerprint. Missing, skipped, timed-out, or partial required evidence is a GAP. Keep Decision, Code, Static, Runtime, and GAP evidence separate; user acceptance must bind the delivered current version.

For test-speed changes, follow the single normative rule in
[`development-lifecycle.md#self-development-protocol`](instructions/development-lifecycle.md#self-development-protocol).
Record comparable whole-command timings alongside the required verification
results; case timings alone do not establish aggregate savings.

## Local execution policy

Tests, coverage and CRAP execute locally only. CI/CD may automate builds and
package/release preparation, but contains no test, coverage, CRAP or mutation
steps. Mutation runs only on an explicit manual launch and is absent from
aggregate automation. Preserve required local assurance and numeric quality
criteria; missing or deferred evidence stays a GAP, never a pass. Tests and
comments describe the current architecture and supported behavior, without
narratives about absent legacy implementations. Formatter/TypeScript 7 hooks and
pre-push coverage/CRAP remain proposals for discussion; do not install or activate
hooks from this policy.

## Primary standalone qualification

Trace the accepted SA-CLI, SA-RESOURCES, SA-STATE, SA-OPT, SA-RELEASE, SA-NOTES,
SA-CI and SA-ASSURANCE criteria in the existing system specification to actual
current evidence. Qualify each advertised native OS/CPU target on that target's
runner, including Windows x64 and only actually supported Linux targets. A
minimal executable probe or cross-compilation alone cannot qualify VIDA.

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
npm bin/SDK export and qualify compatibility artifacts separately. Build/package CI and English
version/product release notes include actual changes, targets, prerequisites,
evidence and GAPs; preparing publish scripts does not execute publication.

Final source and exact native assets require current mandatory checks, three
fresh blind reviews, reverse validation and CLEAR. Verify explicit installation
manifest target/PATH/prior-install/rollback effects and actual installed behavior;
npm global checks do not qualify primary native installation. When explicitly
requested by the human, manual npm compatibility delivery may proceed while
native-primary/CI are unfinished, using the same pending candidate/operation.
Require applicable checks/prepack, exact npm/SDK archive and public CLI proof,
three fresh blind reviews, reverse validation and current CLEAR before exact
archive installation. Preserve native/CI gaps; no bypass flag or publication is
allowed. Installed compatibility proof remains separate from native readiness.
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

Run the current-v1 candidate checks below with declared Bun 1.4.2 and the frozen lockfile. A different global Bun must not silently change the selected version. Build-generated output counts only when source and package fingerprints match. Any retained `ci:candidate` script is a local command name, not authorization to run tests in CI/CD. Local aggregate checks exclude mutation; launch it explicitly when requested. First-cutover approval uses the retained-behavior matrix and exact outcomes below. Aggregate 100% coverage/mutation and `CRAP < 5` remain measured, owned post-cutover GAPs, as authorized by the user.

```text
bun install --frozen-lockfile
bun run ci:candidate
bun run test:toolchain
bun run preflight
bun run typecheck
bun run test:config
bun run test
bun run test:pack
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
| Config, project identity, root integration and installed package   | `runtime-config-yaml`, `project-context-boundary`, `initialization`, `install`, `package-boundary`, `portable-instructions`; public init and installed portable smoke bind the final payload.                                                                                                                                             |
| Ingress, workflow routing, configured roles and failure no-write   | `configured-workflow`, `run-entrypoint`, `run-cli-main`, `edictum-workflow-completeness`, `runtime-kernel-boundary`, `cedar-validation`.                                                                                                                                                                                                  |
| Authentication, reservation, replay, restart and uncertain effects | `host-state`, `runtime-kernel-boundary`, `persistent-session-handoff`, `scoped-source-snapshot`, `observed-research-result`.                                                                                                                                                                                                              |
| Lifecycle reviews, reverse validation, status and delivery         | `lifecycle-state`, `observed-validation`, plus exactly three fresh blind final reviews and reverse receipts on one sealed fingerprint.                                                                                                                                                                                                    |
| Documentation CLEAR                                                | Public `vida-agent-documentation-clear` baseline/closeout/verify in `documentation-clear.test.mjs`, typed deletion lineage and map denial, and real checkpoint revalidation at DELIVERY/COMPLETE in `bun/lifecycle-state.test.mjs`. The configured project policy is preserved as project data; old operational receipts remain inactive. |

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
only when its realpath matches the pinned executable. `tooling/portable-smoke.mjs`
checks the packed current bundle, frozen install and public initialization/run
from an unrelated consumer directory. These focused checks provide Code/Static
evidence and do not establish installed user acceptance or Runtime readiness.

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

Run `bun run verify` or `bun run ci` from the bundle root. Both install the frozen declared dependencies, copy the bundle into an unrelated temporary project, initialize its root integration files, prepare a no-provider public-run action, and run shipped generic tests and tooling. Their final-payload result remains to be measured. This portable check does not establish the ultimate numeric coverage, CRAP or mutation targets; their required local evidence remains separate. `GAP-VIDA-PORTABLE-RELEASE-001` remains open after the first cutover and blocks any claim that portable verification proves the ultimate numeric targets. A passing portable check does not close that GAP or replace installed-runtime user acceptance.

## Required integration evidence

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
