# Portable runtime verification

Owner: runtime maintainers. This file names required checks; it does not claim that they pass. Record command, cwd, exact tool/dependency versions, exit code, sanitized result, scope, and tested fingerprint. Missing, skipped, timed-out, or partial required evidence is a GAP. Keep Decision, Code, Static, Runtime, and GAP evidence separate; user acceptance must bind the delivered current version.

For test-speed changes, follow the single normative rule in
[`development-lifecycle.md#self-development-protocol`](instructions/development-lifecycle.md#self-development-protocol).
Record comparable whole-command timings alongside the required verification
results; case timings alone do not establish aggregate savings.

## Candidate repository verification

Run the current-v1 candidate checks below with declared Bun 1.4.2 and the frozen lockfile. A different global Bun must not silently change the selected version. Build-generated output counts only when source and package fingerprints match. `ci:candidate` includes numeric quality diagnostics; historical differential/parity tooling is archived outside the active package. First-cutover approval uses the retained-behavior matrix and exact outcomes below. Aggregate 100% coverage/mutation and `CRAP < 5` remain measured, owned post-cutover GAPs, as authorized by the user.

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
bun run test:mutation
bun run format:check
```

Use focused checks while editing and record each final-fingerprint result. Re-run affected checks after relevant changes. The ultimate quality gate is aggregate 100% coverage/mutation and `CRAP < 5` for every maintained function, with real output; report first-cutover shortfalls as owned post-cutover GAPs rather than passes. V8 covers packaged TypeScript other than the five Bun-native sources, plus public packaged `bin` entrypoints; the Bun-native lane binds LCOV and Istanbul counters to exact bytes. Report dependencies, generated output, tests, maintained production source, and tooling separately in size comparisons. The old differential corpus has 17 skipped of 18 cases and the parity manifest has pending candidate execution; neither proves old/new parity. Old-state task/ticket transfer and retired facade compatibility are excluded by the authorized clean start. Retained behavior is verified through the current-v1 routes below, without relabeling those historical corpora.

| Retained behavior                                                  | Current-v1 executable evidence                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config, project identity, root integration and installed package   | `runtime-config-yaml`, `project-context-boundary`, `initialization`, `install`, `package-boundary`, `portable-instructions`; public init and installed portable smoke bind the final payload.                                                                                                                                             |
| Ingress, workflow routing, configured roles and failure no-write   | `configured-workflow`, `run-entrypoint`, `run-cli-main`, `edictum-workflow-completeness`, `runtime-kernel-boundary`, `cedar-validation`.                                                                                                                                                                                                  |
| Authentication, reservation, replay, restart and uncertain effects | `host-state`, `runtime-kernel-boundary`, `persistent-session-handoff`, `scoped-source-snapshot`, `observed-research-result`.                                                                                                                                                                                                              |
| Lifecycle reviews, reverse validation, status and delivery         | `lifecycle-state`, `observed-validation`, plus exactly three fresh blind final reviews and reverse receipts on one sealed fingerprint.                                                                                                                                                                                                    |
| Documentation CLEAR                                                | Public `vida-agent-documentation-clear` baseline/closeout/verify in `documentation-clear.test.mjs`, typed deletion lineage and map denial, and real checkpoint revalidation at DELIVERY/COMPLETE in `bun/lifecycle-state.test.mjs`. The configured project policy is preserved as project data; old operational receipts remain inactive. |

These entries name maintained files. The fixture-based tests prove first-to-second progression for all five configured workflows and bounded task-path receipt behavior; complete native terminal execution for all five remains a Runtime GAP. Eight native no-follow cases are skipped on this Windows host (six runtime-kernel and two Edictum); these remain platform GAPs, not PASS or equivalent native Linux evidence. Host-neutral implementation and Linux simulation do not close the missing native or first-delivery Runtime proof.

Generic dynamic decomposition has no current consumer or accepted requirement. The historical parity corpus remains a GAP, not current-v1 acceptance evidence. CLEAR tests must run against an isolated built bundle named by `VIDA_CLEAR_BUNDLE`; the active project policy, its source path and schema are checked before the public operation writes evidence.

## Audit-state and successor qualification

The frozen focused Source lane uses Bun 1.4.2: 20 tests, 269 assertions,
0 failures in 15.24 seconds. It is bounded evidence, not the complete release
matrix. A prior 219-test/1579-assertion, 182-second sweep observed Source changes
mid-run and is diagnostic only. Identity-specific CLEAR test 10 measured
59.55 seconds serially; speed optimization is unproven. Measure control return
separately from test duration: the under-two-second target remains open where
the Windows command tool's observed minimum is 10.9 seconds.

Require the following checks on frozen current inputs before qualifying the
coordinated release; record actual results rather than inferring them from this
list:

- Recovery rebind updates all runtime identity fields; the next public admitted
  action succeeds, old controller fails, and retained observations stay intact.
- Declared produced-contract/artifact checks accept task-packet-only synthesis;
  failed research is durably reported without a success artifact.
- Exact lost-ACK report and intake retries return current state before/after
  progress; changed payload conflicts. No external side-effect deduplication is
  implied. Persisted Mastra success, failure, cancellation and unknown outcomes
  project correctly; a null step alone cannot complete.
- Same live owner writer heartbeat preserves its fence and unrevoked scope;
  expired and foreign takeover stay denied. Original configured assignment
  indexes and graph-declared terminal outputs survive filtering/permutation.
- Successor intake is prevalidated before one immediate multi-work/shared-ledger
  transaction. Same-pointer parallel contours survive; different-pointer safe
  predecessors in the exact session/repository/project set are superseded and
  release only their own rights/queued intents. Preserve phase, evidence and raw
  journals; reject old resume, ambiguity, reserved/unknown effects, stale CAS,
  partial transaction failure and foreign-project absorption.
- Public `reconcile-artifacts --kind work-state` inspect cannot create a database
  or mutate pragmas/state. Qualify plan/apply/resume/restore with dependency
  drift, atomic recovery, bounded owned-field restore, increasing versions and
  unknown-effect guards before live artifact mutation or upgraded readers.
- Consumer full-snapshot rollback binds its read-only baseline, exact admission
  cutoff and maintenance/CAS through restore. Permit it before first new admitted
  work, regardless of initialization; deny it afterward even if preparation
  fails. Source admission-attempt and migration primitives have focused
  evidence; consumer deployment wrapper integration and broader negative
  qualification remain pending. Preserve canonical DB/WAL/SHM path and consistent
  backup while partitioning work children; restore semantic beforeimages, not
  physical database-byte equality.

F05 retained-selector cutoff now uses canonical SQLite immediate exclusion
rather than a persistent wx marker. The current primitive/public advanceCutoff
focused test passed: one test, four assertions for concurrent-owner denial,
observed SIGKILL termination, subsequent success and no orphan. This is Source
Static process-interruption evidence, not installed/native acceptance or
power-loss proof. Historical orphan-marker repair remains guarded; neither PID
nor age authorizes deletion. Require final helper/negative qualification before consumer readiness claims. No SQL/filesystem atomicity is
claimed. F11 issue-before-activation is
currently static sequence evidence requiring a bounded public counterexample.
Current-v1 optional research selectors remain unreachable through the strict
scope schema; this does not establish a fresh-run failure or authorize schema
migration. One native invocation producing multiple action slots is outside the
current caller contract; never fabricate distinct tool references.

Current finite independent Source QA: automatic absorption ten tests/53
assertions; focused host/run nine tests/82 assertions. Later actual SDK helper
14-test/75-assertion pass in 18.02 seconds is writer-only pending independent
Luna qualification. Require unknown/inflight-before-callback denial, sync callback,
initial backup/null retry, baseline retry, interrupted restore/held fence,
exact restored-state retry, original DB/WAL/SHM inspection stability and retained
monotonic maintenance metadata. These are not full candidate or deployed PASS.

Current D01/D03/D08/D13/D15/D16 fixes need final public ordering, writer-failure,
package-inventory, exact execution-resource, producer/cardinality and queued-owner
release regressions. SAME-attempt bounded correction has no approved budget yet;
linked successor does not close that GAP. Temp cleanup and conditional
answer/save surfaces remain open; D09 partial-init and D11 Unicode Source fixes
have independent focused evidence, with full installed qualification pending. Prove actual
clean-ledger headroom before first admission; after clean migration require
closure-safe historical rollover/read lookup before sustained use. Do not invent
a jobs cap or compact active current-v1 history unsafely. Repeat-build optimization
is follow-up debt; directory fsync is an accepted nonblocking limitation, not a
power-loss guarantee. The current D/R table is owned by the existing audit research.

Independent pinned Bun 1.4.2 D09/D11 Source QA passed package-context/partial-init
14 tests/110 assertions in 47.24 seconds and initialization 16 tests/132
assertions in 89.20 seconds (30/242, zero failures). It covers preserved project
values, partial intent/refusals, idempotency and Unicode. No build, public run,
migration-helper execution, installation, Git or real consumer effect was run.

Completed-writer release is accepted SR with initial atomic seam evidence,
not complete implementation qualification. Test the boundaries separately: NEW
terminal reports require current observed source validation before `source_scope`;
ALREADY durable success cleanup requires exact journal/Host completed result,
issue/reservation/generation and journal/work/ledger CAS, but own-file release
survives prior lease expiry or permitted later source drift. Prove those positive
cases plus sequential writers, FIFO, restart, exact retry and stale-version races.
Keep live/unobserved/started/uncertain/unknown/foreign/mismatched effects fenced.
Own file rights/queued intents release, execution-only coordination remains,
and work/phase/results/history stay incomplete and Runtime unaccepted. Drift
invalidates byte-bound proof; fresh correction reacquires scope/FIFO. Execution-
only lease never grants Source-write authority. No expiry/done/old Code shortcut,
nested ordinary CAS, new caller keys or schema fields is accepted. Expired/drift
and historical reconciliation verification remain pending.

Exactly three fresh blind reviews, reverse validation, CLEAR closeout, installed
`0.1.2` observations and attributable user Runtime acceptance remain unperformed
for this candidate. Installed `0.1.1` is immutable. Numeric and native-platform
GAPs above remain separate from the focused pass.

## Portable bundle verification

Run `bun run verify` or `bun run ci` from the bundle root. Both install the frozen declared dependencies, copy the bundle into an unrelated temporary project, initialize its root integration files, prepare a no-provider public-run action, and run shipped generic tests and tooling. Their final-payload result remains to be measured. This check deliberately omits differential and parity, which require repository-only corpora, and the coverage, CRAP, and mutation gates, which do not yet have isolated installed-bundle evidence. `GAP-VIDA-PORTABLE-RELEASE-001` remains open after the first cutover and blocks any claim that portable verification proves the ultimate numeric targets. A passing portable check does not close that GAP or replace installed-runtime user acceptance.

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

| Area                      | Required observation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Portable install          | Copy only the complete bundle into an unrelated repository/path/identity. With this checkout inaccessible, install declared tools, initialize root files, load its own project YAML, and prepare/resume a new no-provider Mastra public run. Repeated initialization must preserve existing project values. A final-payload result remains to be measured.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Configuration             | Every retained role, model, workflow, operation, policy, command and path field has a consumer. Missing/invalid root YAML blocks; safe YAML parsing rejects duplicate keys, aliases/merges/custom tags, unknown fields and unsafe paths. Digest drift in new work requires explicit rebind; no template fallback or silent hot reload.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Session bridge            | The active session uses built-in spawn/follow-up/send/wait and interruption request tools; issue is CAS-persisted before a native call and reports bind action, issue and observed result. Prove restart, stale/duplicate/foreign report rejection, unknown effect reconciliation and real native observations. An interruption request alone is not termination or quiescence proof.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Workflows and roles       | Show configured order, branches, joins, failure handling and restart for all five workflows through the Mastra graph. Only an admitted implementation role with an exact-path lease and scoped source authorization may write source. Current focused tests prove first-to-second progression for all five and a research-free task path through test receipt; complete native workflow and research-artifact evidence remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Policy and evidence       | For every runtime-authorized source mutation, bind Cedar/Edictum policy, current approval, exact work/attempt/session lease and HostState attempt receipt. The public route now uses this path for one admitted source-writing assignment. Confirm pre-effect revocation, crash/unknown reconciliation, scoped source reads before issue/report/validation/delivery preparation, and affected evidence invalidation on drift. External edits remain allowed; no physical exclusion or actor attribution within a shared write interval is promised. Three final independent reviews, reverse validation and CLEAR bind one sealed fingerprint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Current-state persistence | Prove LibSQL Mastra restart/resume, current HostState lease/attempt CAS, exact-path containment and stale writer rejection, interruption versus observed terminal result, uncertain-effect reconciliation and cross-project isolation. External edits on declared paths must invalidate affected proof at fresh-read boundaries. Platform-specific skips need an applicable equivalent or explicit disposition, not a Windows-only release gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Root integration          | Inventory and test root `AGENTS.md`, `AGENT.sidecar.md`, YAML config, old JSON config and schema, root `package.json`, `.gsd-capabilities.json`, the three `script/Install-AgentDevelopmentRuntime.ps1`, `script/Invoke-AgentDevelopmentRuntime.ps1`, and `script/Invoke-AgentRuntimeBacklog.ps1` entrypoints, `.gsd` resolver/runtime-gate/hooks, and maintained templates/generator. Search `.codex` for callers; edit only verified active pointers. Verify retained calls resolve to the new bundle, retired commands fail clearly, project settings survive in YAML, unrelated product scripts and unrelated GSD registry entries remain, no replacement GSD entry is invented, and no generator restores an old path. Verify the staged registry removes the old `agent-development-runtime` key and every `agent-runtime/capability` source; require registry bytes in the prepared manifest and selector entrypoint evidence.                                                                                                                                                                                                                                                                                                                                                                                          |
| Archive and cutover       | Under quiescence, hash and journal same-volume renames of `agent-runtime/`, `tests/agent-runtime/`, eligible `.agent/work/` children, `.agent/coordination/`, `agent-runtime.config.v1.json`, and `agent-runtime.config.v1.schema.json` to inactive provenance; verify unchanged bytes and isolation from active lookup. Inventory JSON consumers, retire active paths at selector commit and prove YAML is sole effective config. Journal staged bundle, root integration and clean state with idempotent expected identities/hashes; switch one selector after validation. Interrupt the process at each step and before/after commit; on restart prove one active authority or fail closed on conflict. Test collision, hash drift, old route rejection and no old receipt entering new state. Verify `agent-runtime/` and `tests/agent-runtime/` are absent from active paths and active work rows and coordination start clean while canonical DB/WAL/SHM remain at their configured paths with a consistent backup; no archived task or ticket is imported, rebound, resumed, or accepted by the new runtime. Retain the old snapshot through install/smoke; rollback closes when the cutoff witness records the first admitted new-work attempt before state writes, even if later preparation fails. Scope durability claims to process interruption and supported filesystems; do not claim universal power-loss recovery. |
| Bundle boundary           | Inspect package exports and complete final directory. Reject concrete source-repository, project, tenant, developer-home, Desktop and old-runtime dependencies, production `./legacy`, historical converter/fixture, missing files, and active readers of root `agent-runtime.config.v1.json` or its old schema. Prove the old `.gsd` resolver/runtime-gate is retired and the root GSD registry cannot resolve `agent-runtime/capability`; no active hook targets old code. Repository-only archive, migration evidence and product docs are excluded from the deployable bundle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## Assurance and delivery

The final layout is reviewed before installation. Run exactly three fresh history-isolated blind reviews, reverse validation, and documentation CLEAR against the same sealed bytes after quality checks. A relevant mutation, including detected external drift in the scoped source, invalidates affected checks and the bound review set. Before `execute`, validate the approved `VidaCutoverActivationDecision/v1` at `.agent/cutover/<cutover-id>/activation-decision.v1.json`: the plan, payload manifest, projected selector intent, and six separate parity/security/assurance/rollback/DEV/UAT evidence files must match their current hashes. Exercise missing, rejected, stale and changed-decision or evidence cases, including `--resume`; no direct selector publication path may bypass the decision. These byte checks establish integrity, not authenticated DEV/UAT observation, current-attempt Cedar/Edictum enforcement, or general external-edit detection. The delivery manifest identifies created and modified files, exact installation destination and order, archived/repository-only items, and post-install checks. Static tests, file copying and hashes do not close Runtime acceptance; obtain attributable user testing of the installed version. Apply the project's attributable Git authorization and Sidecar exception. This Source repository's standing pack-success commit/push order is owned by `AGENT.sidecar.md#source-package-git-policy`; qualify from the committed payload before sealing when HEAD changes a binding. No consumer Git authority or Runtime acceptance is inferred.

Focused preparation, archive, stage, and entrypoint tests provide Code/Static evidence for the staged registry and exact old-test archive only; the live registry and `tests/agent-runtime/` remain unchanged before cutover. Source and tests provide Code/Static evidence only. Require separate observation of built-in session tool calls, installed bundle behavior, selector-bound cutover and user Runtime acceptance. Do not report a Desktop attestation, migrated ticket, or Windows-specific proof as a substitute.
