# Project context

Repository: vida-agent
Selected projects: agent, plugin, powers
Runtime bundle: vida-agent
Machine configuration: agent-runtime.config.v1.yaml

This project-owned sidecar is the source map and development policy for this
repository. The repository root is the directory containing this file. Resolve
every path below against that root, including when the caller cwd is different.

## Sources, projects and ownership

| Project | Product root | Business / system sources | Code and checks |
| --- | --- | --- | --- |
| Agent | `packages/agent` | `packages/agent/docs/system-specification.md`; a separate business-requirements file is not supplied by this work | `packages/agent/src`, `packages/agent/bin`, `packages/agent/tests`, `packages/agent/TESTING.md` |
| Plugin | `packages/codex` | Separate business/system requirements are not supplied by this work | `packages/codex/package.json` declares its own commands |
| Powers | `packages/powers` | `packages/powers/docs/business-requirements.md`, `packages/powers/docs/system-specification.md`, `packages/powers/docs/acceptance.md`, `packages/powers/docs/decisions/index.md` | `packages/powers/AGENTS.md`, `packages/powers/tests`, `packages/powers/package.json` |

Agent current tasks and evidence boundaries belong to
`packages/agent/docs/next-actions.md`; its system specification remains the
behavior owner. Powers current scope and status belong to `packages/powers/docs/next-actions.md`;
product history belongs to `packages/powers/docs/log.md`. D4/BR-25/SR-98 and
AC-74–AC-78 own project-document adoption. The authorized implementation record
is `.agent/work/vida-powers-skills-architecture-20261102/WORK.md`; it is derived
execution evidence, not another business/system authority.

Project documentation follows `docs/agent-instructions/documentation-policy.v1.json`
where that policy applies. Powers docs retain their product-owned OKF checks.
Working artifacts: `.agent/work/`; coordination: `.agent/coordination/`.
One writer owns each shared file; Root owns this sidecar, the project profile
and integration. Preserve unrelated dirty source and retained UNKNOWN evidence.
Delivery destinations and attributable user testing need their explicit owners.

## Required VidaPowers project documents

Use Powers as repository documentation on every substantive development stage.
Read the canonical source files below directly. `SKILL.md` is their source
format; source reading is not installed harness skill discovery or activation.
No plugin installation, host skill inventory or Agent runtime integration is
needed for this project-document mode.

The source origin is this repository's `packages/powers`, owned by the Powers
product documents above. Read each current source/registry revision and record
its digest in the task output; new files are not implied to be part of HEAD.
The methodology source is `packages/powers/config/methodology-profile.json`.
Initial inventory observations and setup evidence are retained in the current
implementation work record; refresh from actual model availability, not an
installed plugin cache. Preserve the previous value and source on profile changes.

| Source | Repository-relative path |
| --- | --- |
| Bootstrap entry | `packages/powers/skills/vida-bootstrap/SKILL.md` |
| Orchestrator base | `packages/powers/skills/vida-bootstrap/references/bootstrap-orchestrator.md` |
| Agent base | `packages/powers/skills/vida-bootstrap/references/bootstrap-agent.md` |
| Research family | `packages/powers/skills/vida-bootstrap/references/bootstrap-agent-research.md` |
| Synthesis family | `packages/powers/skills/vida-bootstrap/references/bootstrap-agent-synthesis.md` |
| Prewrite family | `packages/powers/skills/vida-bootstrap/references/bootstrap-agent-prewrite.md` |
| Implementation family | `packages/powers/skills/vida-bootstrap/references/bootstrap-agent-implementation.md` |
| Validation family | `packages/powers/skills/vida-bootstrap/references/bootstrap-agent-validation.md` |
| Testing family | `packages/powers/skills/vida-bootstrap/references/bootstrap-agent-testing.md` |
| Delivery family | `packages/powers/skills/vida-bootstrap/references/bootstrap-agent-delivery.md` |
| Role registry | `packages/powers/skills/vida-bootstrap/bootstrap.registry.json` |
| Bootstrap schema | `packages/powers/skills/vida-bootstrap/schemas/bootstrap-registry.v1.schema.json` |
| Bootstrap composer | `packages/powers/skills/vida-bootstrap/scripts/bootstrap.ts` |
| Retrieval procedure | `packages/powers/skills/vp-mode/SKILL.md` |
| Profile procedure | `packages/powers/skills/vp-setup/SKILL.md` |
| Project effective profile | `vida-project-profile.json` |
| Catalog CLI | `packages/powers/skills/vp-mode/scripts/catalog-cli.ts` |
| Profile CLI | `packages/powers/skills/vp-setup/scripts/cli.ts` |
| Receipt checker | `packages/powers/scripts/check-retrieval.ts` |
| Canonical catalog | `packages/powers/catalog.json` |
| Instruction corpus | `packages/powers/instructions/` |
| Schema/config root | `packages/powers/config/` |
| Methodology policy | `packages/powers/config/methodology-profile.json` |
| Methodology schema | `packages/powers/config/vpmethodologyprofile.v1.schema.json` |
| Effective profile schema | `packages/powers/config/vpeffectiveprofile.v1.schema.json` |

Read only the branch references required by the task under
`packages/powers/skills/vp-mode/references/`, including `profile.md` for profile
selection and `bundle.md` for composition/measurement. Do not duplicate these
normative texts into project docs or load the entire corpus into the context.

## Role bootstrap, stages and recovery

Start: generic `AGENTS.md` → this sidecar → bootstrap entry → role contract →
applicable stage instructions → profile-aware bundle when needed → work/evidence.
An ordinary direct user request without a role declaration may use the advisory
orchestrator default and record that assumption. A delegated assignment must
declare its role/family and bounded scope; use the registry's existing sixteen
role mappings. An agent reads its base and exactly one family delta. A base-only
tag or `--role agent` result is inspection, not a complete assignment.

| Stage | Document use and output |
| --- | --- |
| Intake/research | Orchestrator or assigned research contract, task intents, project sources, claims/conflicts/GAP |
| Design/plan | Relevant design/contract rules; inherited invariants and acceptance before code |
| Implementation | Assigned implementation contract and relevant code/testing rules; scope/diff and actual checks |
| Review/verification | Validation/testing contract as assigned; independence, findings and actual evidence |
| Documentation | Existing canonical document owners, traceability and applicable documentation checks |
| Delivery/closeout | Delivery contract and current policy/installation owners; explicit authority and terminal evidence |

Roles are not new processes or runtime stages. The coordinator retains plan,
join and final verification ownership; delegation follows the actual host/user
rules. Child prompts carry the repository root, exact bootstrap/role/profile
paths, scope, checks and current source references. They do not assume that
Powers is installed in the child harness. On a new or resumed/compacted context,
read these pointers and the current work record again; restore source/profile
bindings rather than repeating completed side effects. Reuse a bundle only while
its intents, scope, source/profile digests and applicability remain current.

Profile model inventory is a dated availability observation, not quota,
permission or provider independence proof. Refresh it when availability changes.
The profile's `approval-policy` and `context-degradation-policy` remain unresolved
until the user actually selects them; a bundle needing such a choice stops for
resolution. A task-specific implementation grant belongs in its work record and
does not select a permanent approval policy.

## Explicit profile and local commands

Use `vida-project-profile.json` as the explicit project profile. Missing/invalid
explicit input must not be replaced by AGENTS/CLAUDE markers or `.vida` data.
Bootstrap and ordinary source inspection need no profile; profile-aware
search/get require the real current file. The setup carrier is explicitly
`host-shim`, which writes this project JSON and does not install anything.

Use existing project Bun 1.4.4 (`packages/powers/.bun-version`), verifying the
actual executable. The commands below run from the explicit repository root;
otherwise pass absolute paths resolved from that root. These are local dev
tools, not harness tools or Agent runtime commands.

```text
bun packages/powers/skills/vida-bootstrap/scripts/bootstrap.ts --role orchestrator
bun packages/powers/skills/vida-bootstrap/scripts/bootstrap.ts --role agent --role-name code-researcher
bun packages/powers/skills/vida-bootstrap/scripts/bootstrap.ts --tag bootstrap-agent-validation --json
bun packages/powers/skills/vp-setup/scripts/cli.ts --root <repository-root> --carrier host-shim --inventory <current-inventory.json> --dry-run
bun packages/powers/skills/vp-mode/scripts/catalog-cli.ts search --for "<focused terms>" --catalog packages/powers/catalog.json --profile vida-project-profile.json
bun packages/powers/skills/vp-mode/scripts/catalog-cli.ts get --id <selected IDs...> --catalog packages/powers/catalog.json --profile vida-project-profile.json
bun packages/powers/scripts/check-retrieval.ts --catalog packages/powers/catalog.json --report <owned-intent-map.json>
```

Keep catalog/profile fixed across the chain. Treat weak matches as unresolved,
use the dictionary fallback, select IDs actually returned in rows, inspect
applicability/exclusions and use one final compose-backed get. The receipt checks
the actual intent/ID map; it does not grant semantic, completion or runtime proof.
Record applied source IDs/digests, output obligations, checks and gaps in the
existing work output/handoff. Actual evidence, not file presence, establishes
script execution or receipt success.

Missing required document/family or an operation-required profile stops the
dependent action and is reported exactly. Missing host discovery alone does
not block document reading. A missing local interpreter permits direct reading
but cannot establish composer/receipt execution when that proof is required.

## Development policy and checks

Read the product's nested AGENTS before its work. Existing lifecycle/allocation
policy references for this repository are
`packages/agent/instructions/development-lifecycle.md` and
`packages/agent/instructions/agent-allocation.md`; they remain policy owners,
not Powers bootstrap content or permission issued by the caller. A governed
runtime operation still requires its actual installed owner's bindings; source
reading and this sidecar do not manufacture them. Preserve authorization,
one-writer, CAS/lease, no-follow, UNKNOWN and user-acceptance boundaries wherever
the owning operation requires them.

For Powers use its product commands in `packages/powers/AGENTS.md`: focused/full
`bun test`, `bun check --no-script --project packages/powers/tsconfig.json`,
`bun packages/powers/scripts/check-okf.ts`, and the repository Markdown checker
with an explicit file list. Preserve failures outside the assigned scope and
all retained test evidence; do not weaken gates or run mutation without authority.
Code-tooling discovery uses the configured Vex/AST route when available; absent
tools require an explicit limitation and direct current-source inspection.

Framework instructions stay with their package; project documents and records
stay project-owned. Initialization preserves this sidecar's project values.
Before any future current-v1 schema change affecting active artifacts, ship the
bundle-owned atomic artifact-repair owner required by the existing contract;
this project-document adoption does not change those active runtime schemas.
