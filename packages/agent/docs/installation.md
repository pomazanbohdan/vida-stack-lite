# Agent installation

Owner: agent maintainers. Class: derived installation guide.
Sources: [system specification](system-specification.md), [package declarations](../package.json), [Bun pin](../.bun-version), [public command](../bin/vida-agent.mjs), [initializer](../bin/init.mjs).

The target primary public installation is one qualified native `vida-agent` executable
per supported OS/CPU with embedded Bun 1.4.2. Direct installation and first run
require no external Node, npm or Bun and no runtime download. Native target
claims require actual full VIDA/native/WASM/state checks; a minimal probe or
cross-compiled asset is insufficient. npm `vida-agent` and existing public SDK
exports remain separately maintained compatibility channels.

The exact native installation delivery manifest must declare asset, destination,
PATH changes, prior-install preservation, rollback effects and post-install
checks. Do not substitute npm global installation for this evidence. Immutable
package-owned resources may materialize into a private version/payload-bound
cache; unsafe, partial or tampered state is rejected. Consumer YAML and DB/WAL/SHM
stay external. Use only qualified delivery instructions: implementation and
readiness are read from the actual release operation, not inferred from this
guide. No new native installation command or ABI is invented here.

The native default user-bin is `%LOCALAPPDATA%/Programs/vida-agent/bin` on
Windows. On Unix it is `XDG_DATA_HOME/vida-agent/bin` when `XDG_DATA_HOME` is set,
otherwise `~/.local/share/vida-agent/bin`. Version- and operation-bound release
trees are siblings of `bin`. Preserve existing npm shims and explicitly declare
PATH changes in the delivery manifest. First publication uses exclusive creation;
an upgrade binds CAS to the exact observed prior entry. An unknown installation
outcome requires observation and reconciliation before another effect, not blind
replay. The manifest declares prior-install preservation and supported rollback;
consumer configuration and DB/WAL/SHM remain external.

Applicable current checks, exactly three fresh independent blind reviews,
reverse validation and public documentation CLEAR bind the final source and
assets before installation. Actual observations pass through the release
assurance adapter; caller JSON proves local consistency, not review origin or
user Runtime acceptance. Local asset preparation does not publish to a registry
or GitHub.

For this Source repository, the standing instruction in
[`AGENT.sidecar.md#source-package-git-policy`](../../../AGENT.sidecar.md#source-package-git-policy)
authorizes the orchestrating session to commit and push after EACH successful
package formation. Finish Source changes and candidate preparation/checks,
form the final exact assets once, commit the qualified Source payload and perform an ordinary
non-force push, then seal the same operation's archive. Obtain three fresh blind
reviews, reverse validation and CLEAR against those sealed bytes, record
assurance, and install the exact qualified target assets. Qualification binds
current declared source-file bytes and the archive; Git HEAD/commit metadata are
excluded. An ordinary commit with unchanged included bytes needs no additional
requalification. Changed included source inputs or archive bytes invalidate
their affected proof; use public operation identities without manual integrity-
value replay.
Failed packing retains its pending operation and is not this Git trigger.
Exact retries preserve the same archive/operation and avoid duplicate effects.
This Source-only instruction does not authorize consumer Git operations or
replace Runtime acceptance. The package CLI itself still performs no commit/push.

The first candidate is `0.1.0`. Each successful local publication advances the
next candidate patch to `0.1.1`, `0.1.2`, and so on. Preparation settles the version
before assurance. Failed checks, failed packing and retries retain the pending
candidate. Durable pending and successful publication receipts live under
`.agent/work/agent-local-release`; archives and stage logs live under
`.tmp/releases/OPERATION`. Removing scratch output does not reset successful
version history. Preserve the durable receipts as project operational state.

Release tests, coverage and CRAP run locally only; CI/CD build/package automation
contains no test or mutation steps. Mutation requires an explicit manual launch.
Local checks, fresh reviews, reverse validation and CLEAR remain required; missing
numeric evidence remains a GAP. Formatter/TypeScript 7 and pre-push coverage/CRAP
hooks require discussion before any installation or activation.

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

## npm and SDK compatibility channel

The current Source snapshot implements npm/SDK packaging. Ordinary `npm pack`
runs the SDK payload verifier; it does not require or claim a native executable.
Native build helpers and entrypoints are not present in this snapshot, so native
asset formation remains explicitly unavailable until implemented and qualified.
The native installation contract above is a target requirement, not a readiness
claim or an executable installation procedure for this Source snapshot.

The following sequence describes the maintained npm compatibility coordinator;
it does not implement or qualify primary native installation. An explicit human
request authorizes manual npm compatibility formation and system update while
standalone-primary/CI work continues. Preserve the same pending operation and
candidate version; run applicable checks/prepack and exact npm/SDK archive/CLI
qualification, then fresh three blind reviews, reverse validation and current
CLEAR. Apply the Source standing formation-success commit/push order and install
the exact qualified archive. No publication or gate-bypass flag is implied. Keep
native/CI gaps visible and unblock waiting developers only through the verified
installed runtime and normal admission.

The session uses the returned operation ID throughout this sequence; no manual
archive selection or integrity-value calculation is needed:

```sh
npm run release:local -- --prepare
# Run applicable current checks and join actual test evidence for the operation.
npm run release:local -- --pack-npm OPERATION
npm run release:local -- --status OPERATION
# Source only: after successful pack, the session commits/pushes its qualified payload.
# Seal this exact archive, then join fresh real reviews, reverse validation and CLEAR.
npm run release:local -- --operation OPERATION
npm run release:local -- --status OPERATION
```

Packing and installation run asynchronously with one operation ID and worker
PID. Status reports actual stages and elapsed execution time; early control
return does not imply completion. npm prepack is the sole packaging build, and
qualified installation reuses that archive without rebuilding. Installation
uses npm's independently resolved global prefix and checks PATH selection,
installed version, package-owned instruction discovery and pinned prerequisites
from an unrelated cwd. A retry first compares the installed package with the
exact pending artifact; an uncertain or different prior install blocks another
installation until reconciled. The command performs no registry publication,
commit, Git tag, push or consumer initialization. npm owns production dependency
installation; source dependency setup and the installed read-only prerequisite
check remain separate operations.

```sh
vida-agent version
vida-agent instructions --path development-lifecycle
vida-agent init --project-root /absolute/consumer --repository example-repository --project agent=products/agent --project plugin=products/plugin
```

Use native absolute paths on Windows. npm creates the PATH shims in its configured global prefix. A shell opened before a PATH update may need its process environment refreshed. Checked-in configuration and generated instructions contain no machine-specific install directory.

The installed package root comes from the running module; the explicit consumer root anchors YAML, product paths and operational state. Schemas, templates, instructions and agent code stay in the package. Initialization accepts unique, normalized, non-overlapping product mappings. A lone project ID is shorthand for the monoproject root. Repeated initialization preserves existing files; adopting an existing configuration uses `--reconcile-existing` without copying templates over owner values.

For npm/SDK compatibility only, Node and npm versions come from package engines. Bun comes only from the exact package pin and matching declarations. The pinned launcher first checks an absolute realpath PATH executable for the exact version and otherwise may fetch Bun through npm's cache and namespaces the transpiler cache outside the installed package. Explicit custom and disabled-cache settings remain supported. These operations are not an offline guarantee. The package installer checks npm-managed dependencies without running Bun installation in the global tree; embedded lock evidence is read without modifying that tree.

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

A failed prerequisite or dependency installation never delegates initialization. Installation is not a transaction: downloads or node_modules changes can remain after failure, and a later initialization failure does not undo installed dependencies. Filesystem checks reject linked bundle ancestors and input files, but do not provide atomic containment against a concurrently hostile filesystem. Run only a trusted bundle in a workspace controlled by its owner, using a trusted Node/npm installation. The bundle does not attest system-toolchain integrity; Node-adjacent npm installation links are resolved by the existing bootstrap.

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
