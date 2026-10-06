# Agent installation

Owner: agent maintainers. Class: derived installation guide.
Sources: [system specification](system-specification.md), [package declarations](../package.json), [Bun pin](../.bun-version), [public command](../bin/vida-agent.mjs), [initializer](../bin/init.mjs).

Public agent delivery is one native executable with embedded pinned Bun.
No external Node/npm/Bun or first-run download is needed. SDK/npm packages
remain library interfaces and are not an alternative CLI installation.

The [development lifecycle](../instructions/development-lifecycle.md#formation-and-installation-policy)
is the single owner of formation and installation policy. This guide supplies
commands and destinations. There are no test suites, repeated development
reviews or per-install documentation gates in this contour.

For changed Source, publish the exact reviewed inputs before CI formation.
Use the resulting build provenance, target and byte-integrity metadata for
the selected artifact. An unchanged artifact needs no new build or Git effect
solely for installation. Preserve original operation and failed/UNKNOWN history.

Windows uses one maintained PowerShell adapter and the fixed current-user
Programs/vida-agent/bin command. It retains a previous binary only during the
recovery window, then removes exact owned previous files after success. It
preserves project configuration, DB/WAL/SHM and npm shims. Version/byte/PATH
observations record installation; user Runtime acceptance is separate.

## Source development controller

Source-only development may use the package-owned prepare/inspect/verify and
controlled-execution seam after actual qualification of an immutable current-
candidate package root outside editable Source. Logical bundle configuration
remains `packages/agent`; target YAML/state/identity and source-write scope remain
unchanged. This is not native installation, a global PATH change, a production
selector switch or user acceptance. Preparation rejects targets with an active
selector; general consumer controller use is unsupported. A copied package alone
is insufficient, and installed older releases are not a fallback. Use the actual
implemented public interface and qualification evidence rather than inventing
command arguments from this guide. Drift or wrong package/pin/dependencies rejects
execution; no controller readiness is established by this documentation.

## SDK library and Source tooling

SDK exports and declarations remain maintained for in-process integrations.
Source build and package tools may use Node, npm and pinned Bun, but public
agent installation uses only the qualified standalone executable. Do not install
the SDK/npm archive as a substitute for that executable.

The Source builder and verifier form and check the executable from current
inputs. Package qualification is successful formation provenance, declared Source and
version, target platform and exact artifact integrity. The lifecycle instruction
owns this policy. Formation and installation do not run test suites or repeat
development reviews. The Windows workflow publishes the six formation files and
an archive/result metadata artifact with the native-build profile. A historical
seven-check profile keeps its original declared requirements.

Use the maintained PowerShell adapter for physical Windows delivery. It accepts
the selected EXE/ZIP or direct HTTPS URL, checks manifest bytes when present and
replaces the fixed command with a transient previous copy. Observe installed
version/bytes and effective PATH. Preserve uncertainty before retry. Qualification
and installation do not grant user Runtime acceptance or consumer initialization.

The final native delivery manifest must bind the exact qualified asset, target,
destination, PATH ordering, prior-install preservation, rollback and postchecks.
Installation records the selected installed bytes, version and effective PATH. No test suite or prerequisite probe runs.

The installed package root comes from the running module; the explicit consumer root anchors YAML, product paths and operational state. Schemas, templates, instructions and agent code stay in the package. Initialization accepts unique, normalized, non-overlapping product mappings. A lone project ID is shorthand for the monoproject root. Repeated initialization preserves existing files; adopting an existing configuration uses `--reconcile-existing` without copying templates over owner values.

For Source and SDK library tooling only, Node and npm versions come from package engines. Bun comes only from the exact package pin and matching declarations. The Source pinned launcher may resolve or fetch its build-time runtime and namespaces the transpiler cache outside the package. These development operations are not an offline guarantee or a public installation route. The delivered executable supplies its own pinned Bun and qualified resources.

Neutral configuration uses local integration metadata for the explicit product set. Real provider, tenant, namespace, credentials and paths remain project-owned data. They do not select identity or grant authority.

`vida-agent scope --project-root /absolute/consumer --repository example-repository --project plugin --path products/plugin/docs/system-specification.md` derives a typed current source snapshot. Pass returned typed bindings through supported work operations; never calculate or invent integrity values. A snapshot is not a source-write grant or accepted scope.

Existing copied-bundle consumers stay on their current binding until the package-owned installation-binding repair updates configuration, initialization, selector and generated-pointer dependencies atomically with recovery. That relocation route remains an implementation GAP; the executor-model repair below does not relocate a package or migrate old work.

Research-record repair uses validators, Ajv/YAML dependencies and schemas from
the executing package root. The explicit consumer root owns artifacts; a copied
consumer `vida-agent` directory or alias fallback is unnecessary. Installation
and testing state is read through the actual release operation and public checks,
not inferred from the guide's existence.

The initialization receipt includes a deterministic `workspace_id` derived from
the configured repository identity and the physical canonical project root. It
is a checkout boundary: alternate spellings of the same canonical root reuse it,
while another clone has a different value. Runtime state uses this bound
workspace identity, not a caller-provided workspace value.

For Source dependency tooling only, a failed prerequisite or dependency check never delegates initialization. Downloads or node_modules changes can remain after failure; a later initialization failure does not undo development dependencies. The Source bootstrap requires trusted Node/npm and does not attest that toolchain. These development prerequisites are not requirements for the standalone agent. Filesystem checks reject linked bundle ancestors and input files but do not provide atomic containment against a concurrently hostile filesystem. Run the owned payload in its owner-controlled workspace.

Dependency installation alone does not switch the active runtime selector, launch a lifecycle, transfer unfinished tasks, grant write authority, replace project policy, or establish user Runtime acceptance. When a selector is present, the public run entrypoint verifies that it selects this installed bundle and has a complete cutover journal and cutoff witness before admitting new work. The orchestrating agent session invokes built-in collaboration tools and observes their results; the CLI does not invoke those tools or authenticate a caller-supplied report.

## Scoped files and lease continuity

Use repeated `--path` for files covered by selected products and repeated
`--repository-path` only for exact shared files outside all configured products.
For example, append `--repository-path docs.changelog.jsonl` to a project scope
command when that file is repository-shared. The snapshot is read-only and grants
no source-writing rights.

Run `vida-agent run --inspect true` with the existing exact identity and selection
arguments before a lease operation. Pass its returned current state version and
fence through the same public launcher. Add `--renew-lease true` only while the
same owner's lease is live. For expired accepted readonly work whose next wave
is unissued, use `--recover-expired-lease true --rebind-current-bundle true` under
the original verified authority. Keep the exact work and attempt; use the newly
returned ticket/current version for subsequent issue. Do not repeat historical
native actions or manufacture a no-effect report. Unknown outcomes, writer
assignments, binding drift and overlapping FIFO owners require their supported
reconciliation and deny these operations. Installed versions lacking these
modes cannot perform them.

The [system specification](system-specification.md#scoped-source-and-lease-continuity)
and [lifecycle](../instructions/development-lifecycle.md#execution-and-evidence)
own the contract. Local consistency evidence does not authenticate a native
call, grant physical isolation, or establish user Runtime acceptance.

## Session-driven workflow handoff

Project-owned settings use the bounded `runtime-config` reconciliation route.
Author proposed YAML from current project values, changing only the approved
executor model to `gpt-6.1-sol` and reasoning to `medium`. Call
`bin/reconcile-artifacts.mjs --kind runtime-config --mode inspect` with a
canonical `--project-root`, one `--repair-id`, attributed `--actor`, ISO
`--timestamp`, `--instruction-ref` and repository-relative `--target-config`.
Repeat those planning arguments with `--mode plan`. Inspect reads state and
grants no approval; plan freezes the exact operation without editing YAML or
the initialization receipt.

Call `--mode apply` with only kind, mode, root and repair ID. Its initial
`author_config_required` result means maintenance is held. Only then does the
owner author the exact target root YAML. Call `--mode resume` for that same
operation to rebind the initialization receipt. All other settings, identity,
integrations and initialization template provenance remain exact. Prior work
keeps its old configuration binding and remains stale. No manual integrity
inputs, YAML template copying or state migration are part of this route.

Without a YAML/receipt effect, `--mode restore` releases only this operation's
own fence and reports `abandoned_no_effect`, `rollback_performed:false`.
Edited YAML or applied receipts require forward resume; no snapshot rollback
is performed. Queued ownership and issued/unknown effects block preparation;
suspended old graphs with only unissued requests do not imply such effects.
These local consistency checks do not establish physical filesystem exclusion
or user testing acceptance. The canonical owner is the
[lifecycle contract](../instructions/development-lifecycle.md).

The public run CLI coordinates a local advisory handoff. Call it first with the bound project, workflow, work, attempt, and scope arguments to prepare a new handoff or resume the same persisted one. The result includes the current `state_version` (`revision` and `digest`) and, while work is ready, the handoff and its next actions. A resumed request must keep the same selection and scope.

Before invoking any built-in collaboration tool for a ready wave, call the CLI with `--issue-wave true`, `--expected-revision REVISION`, and `--expected-digest DIGEST` from the latest result. This compare-and-swap persists the whole wave's issuance first and returns each action with its `issue_id`. The orchestrating session then calls the appropriate built-in spawn/send/wait/cancel tools and observes their actual results. The CLI does not perform those calls.

For each observed result, submit a bounded JSON file (1–32,768 bytes) at an absolute regular-file path using `--report /absolute/path/report.json` and the latest `--expected-revision` and `--expected-digest`. Each accepted report advances the state revision, so use the returned `state_version` for the next report. Include the matching action and issuance `issue_id`, handoff digest, work, attempt, scope, wave, action order, stage, role, result status, summary (up to 4,096 characters), `agent_id`, unique tool-call reference, summary digest, and evidence references required by the current report contract. When the wave is complete, the result exposes the next wave; repeat the issue, observe, and report sequence. Stop on a blocked or terminal result. If a process restarts with an issued action whose tool outcome is uncertain, resume for inspection and do not reissue that action automatically.

The report is advisory consistency input: local validation and CAS bind it to the persisted handoff, but caller JSON cannot authenticate a tool call or grant approval, review, delivery, or Runtime acceptance. Only session-observed results and separately required evidence can support lifecycle gates, and Runtime acceptance remains attributable to the user. If built-in session tools are unavailable, stop before side effects and record an execution GAP. This CLI has no external provider, Desktop/API, App Server, MCP, plugin, or host-service call path; configuration declarations for workflow, Cedar, or Edictum integrations do not mean this CLI enforces them.

An issued synthesis action supplies `synthesis_source_catalog`: its ordered
`result_refs` bind exact predecessor result IDs and digests, and citations use
the compact key `rN:<local source ID>` from that catalog. Local source IDs may
repeat across independent research results. The public `--report` path checks
the complete synthesis against those predecessors before its journal CAS; an
invalid citation is rejected without recording the report. The keys do not
relax external locator or independence-group checks.

For active synthesis records that predate this citation contract, use the
bundle-owned `bin/reconcile-artifacts.mjs --kind synthesis-qualification` with
`--mode inspect`, then `plan`, then `apply` or `resume` and one exact
`--repair-id`. Planning requires the actor and timestamp; apply and resume
read the frozen plan. The command archives original record bytes and updates
only an exact, unambiguous active artifact set under maintenance and CAS. A
reported synthesis observation that could not normalize remains reported; use
`--kind synthesis-observation-correction` with its exact work, attempt,
action, issue, owner-thread and attributable correction pointer to plan a new
issue. That correction preserves the original observation and does not prove
no native effect. Inspect the frozen plan and current owner/selector state
before applying either repair. These commands do not grant Runtime acceptance.

The current source-write route uses cooperative exact-path ownership and scoped
source authorization, with source rereads at issue/report and validation/delivery
boundaries. External edits invalidate affected proof; a lease does not physically
prevent another local process from editing files. Local declarations establish
consistency, not human or tool-origin authentication. Installation and advisory
handoff do not close Runtime acceptance; the specification owns the precise
source/policy/evidence contract.

Public `vida-agent reconcile-artifacts --kind work-state --mode inspect
--project-root /absolute/consumer` reads existing canonical state without creating
a missing database, mutating pragmas or advancing lifecycle. The bounded
work-state repair supports `plan`, `apply`, `resume` and `restore` with
`--repair-id ID`; only plan requires `--actor STRING`. It normalizes its declared
optional transition field and freezes dependency bindings. It is not general
copied-bundle relocation or consumer migration proof. Qualified repair precedes
live current-v1 artifact changes or upgraded readers.

Consumer migration Source primitives retain canonical DB/WAL/SHM paths, save
historical row beforeimages under maintenance, and use synchronous filesystem
callbacks within the state transaction. The first admitted NEW work attempt
closes rollback even if preparation fails; initialization alone does not.
The Source-only async SDK helper `runConsumerMigrationState` in `trusted-host`
binds the repository root, operation ID, actor and baseline/restore mode; its
filesystem callback must be synchronous and idempotent. It receives configured
canonical/workflow database paths and initial consistent backup bytes (null on
retry). Unknown state blocks callback effects; interrupted restore retains its
fence and resumes the same operation. Use actual current helper and repository-only deployment-adapter qualification
before consumer effects; this guide supplies no migration CLI command. Candidate
and installed version/readiness come from public local-release state and current
operation evidence. Preserve
existing consumers and unrelated files until that route and the installed package
are qualified. SQL/filesystem atomicity and old-task migration are not promised.

## Same-operation native retarget

Use the packaged `vida-agent reconcile-artifacts --kind release-retarget
--mode inspect --project-root /absolute/source --operation ORIGINAL_OP` to inspect
the existing operation without effects. The Source caller first stages an already
formed candidate with `release-local --stage-native-retarget ORIGINAL_OP
--candidate RELATIVE_JSON`; the candidate contract binds schema
`VidaNativeRetargetCandidate/v1`, operation_id, version, source_binding, archive
and pack_metadata. It does not build or install.

`--mode plan --actor STRING` freezes attribution, candidate, original pointers
and custody. `--mode apply` or `--mode resume` uses that frozen plan with no new
actor argument. Preserve the original awaiting_assurance operation/version and
pending/successful pointer bytes or absence. An active worker, installation start,
changed or incomplete staging and unknown effects deny. Inspect the exact blocker;
do not allocate another operation, replace an orphan directory or repeat a build.
A clean planning reservation may continue its frozen plan before the first
custody directory exists. Exact preimages remain required. An existing partial
custody directory is preserved and denied; missing staged bytes are not recreated.

Retarget retains old SDK bytes and referenced failed/UNKNOWN evidence. Completion
does not qualify or install the candidate. A real trusted CI/CD receipt path,
current seal/reviews/reverse/CLEAR and attributable acceptance remain required;
the repository has a portable Source consumer but no activated CI profile/pipeline
or actual delivery receipt. An attributable trusted controller supplies the exact
request and actual observation; saved JSON cannot authenticate its origin. The
imported candidate comes from its sealed archive-owned asset, without a local
build verifier. GitHub is an optional repository adapter, not an authentication
prerequisite. Its ZIP reader and immutable workflow/job/check policy require
separate qualification; missing support does not authorize installation.
The specification owns the exact phase and recovery contract.

## Source native construction

In CI, `ci:pinned` runs the existing `build:pinned` then `prepack:pinned` once.
The direct standalone command is `node bin/bun.mjs run build:standalone:pinned`
after that SDK build. It reuses only a still-current verified output
and refuses stale or conflicting output. It uses the existing frozen production
dependencies, physical copies, embedded resources and pinned Bun bytecode with
retained names. Source construction needs the declared development toolchain;
consumer execution uses the executable itself.

Local runtime resource checks use `node bin/bun.mjs run test:resources:pinned`.
Build and installation checks belong to CI/CD. Missing current CI/CD receipts
remain delivery GAPs; local resource proof does not establish installed acceptance.

## Quick Windows build and system-command reference

Build owner: `.github/workflows/agent-native-delivery.yml` and
`tooling/agent/native-ci-delivery.mjs`. The workflow publishes the six build
files. CI/CD forms and publishes the exact package and metadata. No tests run at formation or installation.

The build job restores the Bun package cache before installing dependencies.
Its key binds the runner OS/architecture, Bun version, package manifest and
lockfile. A compatible cache may supply already downloaded packages; installation
still uses `--frozen-lockfile --ignore-scripts --backend=copyfile`. Each run gets
fresh `node_modules`. Source, compiled outputs, receipts and credentials are not
cached. A cache miss downloads the locked dependencies normally. Cache hits do
not qualify a build. See the [Bun cache contract](https://bun.sh/docs/pm/global-cache)
and [GitHub cache action](https://github.com/actions/cache).

Save downloaded packages after dependency installation succeeds and before
compilation. A later compilation failure therefore retains the reusable cache.
Restore and save use the same key and directory. A cache-save failure remains
visible and does not become a runtime qualification or admission prerequisite.

After a required build, inspect the cache action's restore/save result and the
repository cache entry. Record its exact key, ID, nonzero size and creation/access
time against that run. A successful workflow alone does not prove a populated
cache. An exact hit reuses the existing entry; it need not save another entry.
Confirm `cache-hit` on a later required warm build. Keep missing or empty cache
evidence explicit. Do not start a separate build solely to measure caching.

Current installed build: run 37526512345, artifact 11442093926, version 0.1.2,
embedded Bun 1.4.2. The system native file is 133313536 bytes. Exact
bytes, current instructions and effective PATH are verified. Previous consumer
native and transient previous files are removed. User Runtime acceptance is separate.
The installer imports its own in-box Utility module through $PSHOME, so a Node/Bun
caller does not depend on an inherited PSModulePath.

Keep the installer result separate from later observations. If installation
returns success and the selected bytes are installed, a failed observer needs
only a corrected observation. Do not reinstall because that observer failed.
Change file namespaces separately from public command names and `--kind`
arguments. Keep those command identities as exact supported values.

Run the maintained `packages/agent/tooling/install-windows.ps1`:

```powershell
.\install-windows.ps1 -Action install -Source 'C:\Downloads\vida-agent.zip'
.\install-windows.ps1 -Action update -Source 'C:\Downloads\vida-agent.zip'
.\install-windows.ps1 -Action update -Source 'https://example.org/vida-agent.exe'
.\install-windows.ps1 -Action uninstall
```

Use an actual selected package address in place of the examples. URL downloads
require direct HTTPS without embedded login credentials, ambient authorization
or redirects. Explicitly selected signed query URLs are allowed. For a local EXE, an
adjacent manifest is used if present. ZIP input must contain the exact
`vida-agent-bun-windows-x64.exe` member. Use a standard single-disk release ZIP
with at most six flat files, names up to 128 bytes and no archive comments or ZIP64.
The installer uses only standard
PowerShell/.NET. It targets the current user and requires no elevation.

Installation adds the user PATH entry if absent. Update preserves an existing
entry. New terminals inherit User PATH; an existing terminal may need refresh.
Uninstall requires a matching installer receipt. It preserves project data,
configuration, lifecycle history and npm shims. No permanent previous binary is
created. Incomplete pending/previous files block retry until inspected. A known
legacy installed payload requires exact-owner cleanup after verified delivery.

For actual installed postproof, use the exact command from another directory:

```powershell
$nativeCommand = Join-Path $env:LOCALAPPDATA 'Programs\vida-agent\bin\vida-agent.exe'
& $nativeCommand version
& $nativeCommand instructions --path development-lifecycle
Get-Command vida-agent
```

Require actual native PATH precedence, version and the selected binary bytes.
These observations record installation; user Runtime acceptance remains separate. The Windows adapter does not rewrite release journals
or consumer configuration. Formation and installation follow the single development-lifecycle policy. The future automatic Release-only consumer contract is unchanged.
