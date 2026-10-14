# Consumer source retirement

Owner: repository maintainer for Source custody and this handoff. The consumer
coordinator owns actual consumer integration and cleanup. Class: repository-only
supporting evidence; not a runtime prerequisite or deletion authorization.
This is the existing creatio-sample cleanup contour, not a new engine task.

## Current coordinator facts, 2026-10-14

The coordinator reports C:/_temp/creatio-sample with PATH vida-agent0.1.3 and a
local Source checkout at b549951. Local Core stopped under the human Source handoff.
Cloud did not inspect that Windows filesystem or invoke its installed executable.

The latest readonly inventory reports vida-agent/node_modules with13 ordinary
files,67 directories and0 reparse points. All files are Babel
@babel/compat-data/data JSON in six nested dependency trees: native-modules.json,
overlapping-plugins.json, plugin-bugfixes.json and plugins.json. No project config,
agent instruction, work/DB or custom runtime JS/TS was found in that subtree.
These are third-party dependency data, not consumer-authored runtime Source.

Other consumer runtime paths already have foreign tracked deletions. Preserve
their Git attribution; this handoff neither performs nor restores those deletions.
package.json still points at absent local bin/{run,init,documentation-clear,bun,
install}.mjs. Sidecar still names a local bundle owner. The root configuration,
AGENTS, Sidecar, product code/docs and new .agent/work evidence remain protected.
.agent/coordination/ownership.v1.json is absent; absence does not prove quiescence.

## Source custody

The corrected Source packet is published as
2caf6ea736f824e4eb29c619fc295ea687902b55 in pomazanbohdan/vida-stack-lite.
The original b549951 tree remains in Git. Runtime code, schemas, instructions,
tests and tooling belong in packages/agent; current handwritten entrypoints are
TypeScript. Current equivalents of the old bin names are run.ts, init.ts,
documentation-clear.ts, bun.ts and install.ts. Their migration is not a claim
that every previously deleted consumer byte equals current Source.
All five corresponding original MJS paths were directly confirmed in the
b549951 Source Git tree. No original consumer byte was restored or executed.

Exact custom-code retention requires its path/content lineage, not a category
count. The reported remaining Babel data contains no custom runtime Source.
Its retirement does not require importing that dependency tree into Source.
Preserve the reported existing code deletions and historical migration receipts.

## Current runtime resolution

[The repository delivery decision](../../AGENT.sidecar.md#native-only-public-delivery-decision)
selects one native executable with embedded Bun. npm artifacts serve SDK imports.
Consumer runtime commands use the selected installed executable, not copied
local MJS entrypoints or a newly installed SDK.

Current Source declares version/help and instructions --path NAME. The executing
bundle owns instructions, schemas and templates. Explicit --project-root anchors
consumer configuration, products and work data. Read the ACTUAL installed help
before choosing options; current Source metadata does not prove0.1.3 parity.

The reported version proves neither native bytes/target nor instruction discovery,
config/receipt binding, repair readiness or Runtime acceptance. No new install,
old state recovery or global-suite run follows from this coordination request.
[Installation](../../packages/agent/docs/installation.md) and the package lifecycle
own guarded relocation/rebind. Do not initialize over an existing receipt or
replace loader pointers merely because copied files are missing.
The current installation guide still marks package relocation repair as an
implementation GAP. No invented rebind command or Source-only substitute closes it.

## Cleanup classification

| Path/selection                                                                           | Disposition                                                                            | Condition                                                                                                                                                          |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| vida-agent/node_modules                                                                  | Exact candidate cleanup ROOT, third-party data only according to coordinator inventory | Bind the current13-file/67-directory/0-reparse inventory, ownership and quiescence before an effect. Stop on new entries, linked paths or changed bindings.        |
| vida-agent/                                                                              | Retained integration root                                                              | Its deletion would affect the configured refactoring root. Resolve integration/config pointers first. The candidate above does not authorize removing this parent. |
| package.json old local-bin aliases                                                       | Existing integration defect; preserve the file                                         | Change only the approved aliases after inspecting installed command support and exact preimage. Do not restore copied runtime Source.                              |
| AGENTS.md, AGENT.sidecar.md, agent-runtime.config.v1.yaml                                | Protected from deletion                                                                | Guarded integration edits need their own owner-authorized exact change.                                                                                            |
| Product Source, docs, configured values, unrelated dirty/staged files                    | Protected                                                                              | Preserve existing owners and bytes.                                                                                                                                |
| .agent/, .codex/, new developer artifacts, original receipts/results and uncertain state | Protected from broad cleanup                                                           | Retain exact evidence and UNKNOWN custody. Never fabricate absent ownership records.                                                                               |
| .tmp/repair-source/clean-npm-consumer-migration.mjs and its .1/.2 plans                  | Historical provenance, not executable cleanup                                          | Never replay these helpers/plans as a current operation.                                                                                                           |

Counts and the four basename categories are not the13 exact relative paths or
their hashes. The coordinator owns that full effect-time manifest. Source can
classify the candidate root now; no fabricated per-file list or consumer effect
is supplied by this handoff.

## Minimal coordinator sequence

1. Preserve dirty/staged attribution and bind the exact current candidate manifest.
   Establish current consumer ownership and supported quiescence. Old operations,
   leases, DB rows and UNKNOWN outcomes are never replay inputs.
2. Observe the selected installed executable's version, bytes/target, help and
   instructions --path development-lifecycle. Keep these distinct from readiness.
3. Inspect actual configuration, initialization receipt, selectors and refactoring
   root. Use only the installed bundle's supported repair/rebind route. Missing
   relocation support, stale bindings or unresolved issued effects remain GAP.
4. Apply only the separately approved minimal integration changes under exact
   preimage/CAS guards. Protect config/instructions from deletion. Then retire
   the candidate node_modules root if its manifest and quiescence still agree.
5. Verify installed instruction resolution, explicit project-root binding, old
   alias removal and readonly scope/readiness with the same selected executable.
   Preserve original receipts and report actual effects and remaining gaps.

Cloud remains the Source writer. The coordinator remains the consumer writer.
The coordinator reads this handoff in the Source chat; no external message was sent.

## Historical provenance

The pre-cleanup consumer-retirement narrative and previous transfer receipts are
retained at bbd6e73ed5bb1f98dd79a64980425cf85dae9a4e:docs/migration/consumer-source-retirement.md.
Its0.1.0 npm/Windows observations are historical, not current0.1.3 readiness.
This contour does not reinstate old consumer unblock as a CLEAR prerequisite.
