# Vida Powers

**A portable agent plugin with a canonical instruction corpus, a single
orchestration skill and materialization of results.**

It lives in `packages/powers/` alongside the repository's two registered product
roots: `packages/agent` (Vida Agent, runtime) and `packages/plugin` (Vida Codex,
the layer between the Codex host and the agent).

D14 and D15 accept a bounded engineering/UX pack and selected typed reference data
for phased work. No new content is admitted or implemented by those scope decisions;
donor rights review and Runtime acceptance remain separate gates.

| Document | What it is about |
|---|---|
| [Research — product concept](docs/research/vida-powers-product-research.md) | B-level: why the product exists, which boundaries it has, which behavior rules it follows |
| [Step H plan](docs/task-plan-step-h.md) | H0–H3 gates for the accepted D14/D15 scope; implementation has not started |
| [Next actions](docs/next-actions.md) | Single owner of delivery status, order and gates: A0 → A → B → C → D → E → F → G → H, plus the E5 target status and the remaining forward stages |
| [Decisions D1–D16 (and D4b)](docs/decisions/index.md) | Accepted decisions with grounds and consequences |
| [AGENTS.md](AGENTS.md) | Instructions for the agents developing VP |
| [Donor manifest](donors.yaml) | Eight processed donors plus Wondelai registered-not-processed; rights review remains open |

---

## 1. Which problem it solves

An agent in a compatible AI host must know **how exactly** to work: which methodology
to follow, which acceptance criteria to apply, what to consider evidence, which
artifact to leave after the work. Without this, every agent invents its own process and
the result becomes incomparable and unverifiable.

VP provides:

- **a canonical corpus of atomic instructions** — techniques converted from verified
  sources, each with application conditions, a semantic contract, tags,
  provenance and compatibility rules;
- **a single entry** — the skill `vp-mode` (orchestration): the user describes the desired
  outcome in ordinary language, then VP itself selects the needed instructions, forms
  a bundle and launches execution or delegation;
- **product methodology policy** — choice groups (testing, review,
  architecture, delivery), explicit inheritance between products, temporary exceptions;
- **materialization** — a readable and verifiable result instead of a report in
  chat, with separate Work Items, acceptance criteria and evidence;
- **order and boundaries** — scope-first, explicit blockers instead of silent expansions, honest
  GAP records.

## 2. Architecture

```text
        sources (superpowers, BMAD, matt-skills, addy-skills, pstack, GSD, ponytail, OKF)
                              │
                     conversion (scripts/convert.ts)
                              ▼
   canonical corpus  packages/powers/instructions/   VPCatalog/v1 (instruction .md + frontmatter)
   (instructions + capability_tags / pattern_tags + conditions + compatibility + provenance)
                              │
              search and selection  skills/vp-mode/scripts/catalog.ts   catalog.tags / search / get / compose
                              │                        decision.evaluate (+ Agent Fallback)
                              ▼
   instruction bundle  (role, task contract, effective methodology, scope, AC, artifacts)
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
   `vp-mode` — orchestration        materialization
   (LLM selection → agents → flow    (Work Item, AC, evidence, findings)
    level Full/Medium/Light)
              │                                │
              ▼                                ▼
   execution / delegation           Work Items in packages/powers/docs/work/
```

**Boundary with VIDA Runtime.** VP has no own workflow engine, scheduler, ledger
or state store. In Runtime execution belongs to VIDA Core/Mastra, and VP supplies
instructions and methodology. In Standalone VP works independently: its own catalog,
its own scripts, its own skills, no dependency on the agent runtime.

## 3. Instruction and catalog

**Instruction model** (`VPCatalog/v1`): `instruction_id`, `capability_tags[]`
(what needs to be done), `pattern_tags[]` (by which methodology), `conditions`
(when to apply), `artifact_contract` (what must be the output), `compatibility`
(groups, exclusions, dependencies), `provenance` (donor, license, revision),
`revision`, `status`, `content`.

**Tag rules:** kebab-case; every tag has at least two meaningful components
(`test-first-development`, not `tdd`); a tag is not an agent, a skill, a step or
a permission. Compatibility is defined by a separate registry: `test-first-development` and
`test-after-development` are mutually exclusive alternatives in the `testing-sequence` group,
`risk-based-testing` is a compatible supplement.

**Catalog operations:**

| Operation | Result |
|---|---|
| `catalog.tags` | Available capability/pattern tags with descriptions |
| `catalog.search` | IDs, names and short descriptions selected by tags, role, product and conditions — without full texts |
| `catalog.get` | The text of the exactly specified instruction |
| `catalog.compose` | The selected texts, mandatory instructions and dependencies after compatibility checking |

Mandatory instructions and dependencies enter the bundle regardless of the
relevance score; the restriction of the research contour registry does not extend to VP.

**Provenance.** Every instruction has a donor + license + revision; the revisions
are fixed in `donors.yaml`, donor copies — in `.tmp/donors` (ignored by Git).
Donor licenses: MIT × 7, Apache-2.0 (Open Knowledge Format) — see
`donors.yaml`.

## 4. Selection and routing

**Instruction Selection** selects a set of instructions. **Workflow Routing** selects
the LLM for execution, forms agents from it according to a fixed reference (the catalog)
and sets the flow level — `Full`, `Medium`, `Light` or another defined
by the profile.

**Decision Provider** — a provider-neutral `decision.evaluate` interface:
implementations — the master LLM agent (by default) or an external provider, if it
is set by the host config. VP is not tied to a vendor and does not name the provider
in advance. **Agent Fallback is mandatory:** unavailability, timeout, API error,
incorrect format, unknown candidate ID or insufficient confidence → the choice
passes to the main agent, and the source of the decision, the selected IDs and the reason for the fallback
are materialized. The current lexical/tag-count score is uncalibrated supplementary
evidence; it does not establish semantic confidence. Any future relevance threshold
requires operation-specific calibration; a research example is not a universal constant.

## 5. Methodology policy

Methodology is **product policy**, not the situational choice of an agent. The profile
(`VPMethodologyProfile/v1`) contains choice groups, rules of explicit selective
inheritance between products, local overrides and a task-scoped override
(a temporary exception for a specific task that does not change the permanent profile,
permissions or security gates). An inheritance conflict is a question for the owner, not
"last loaded wins".

**One schema, different carriers:** Runtime — a section in `.vida/project.yaml`; Standalone —
the same section in a managed block (JSON payload) of the project instruction file; the host layer —
in the project config file. The setup hooks are deferred (D10).

**Profile and compose contract (SR-58, AC-15, AC-26):** the package-owned
`config/vpeffectiveprofile.v1.schema.json` validates the effective profile. A missing
user-choice state or stale canonical alternatives returns `CATALOG_PROFILE_CONFLICT`
with `profile_refresh_required: true`; refresh the profile with `vp-setup` before
asking the user. A valid unresolved group returns its canonical alternatives with
`resolution_required: true` and no bundle. A direct compose without `--profile` is
diagnostic-only, not a resolved session bundle.

From `packages/powers/`, the current CLI is
`bun skills/vp-mode/scripts/catalog-cli.ts compose --required <instruction-id> --profile <effective-profile.json>`.
For Standalone, extract the fenced JSON payload between the managed profile markers
in `AGENTS.md` or `CLAUDE.md` unchanged into an owned temporary `.json` file and pass
that path to `--profile`. Refresh a legacy profile first with `vp-setup`. The CLI
loads the package-owned profile schema and uses an explicit `node:buffer` import for
UTF-8 byte accounting of the bundle limit.

The final bundle contains at most 20 instructions and 64,000 UTF-8 bytes summed over
selected `content` only, after profile filtering, active-alternative replacement and
full transitive dependency closure. `1 KB` is 1,000 bytes; dictionaries, envelopes,
metadata and execution context are excluded. Overflow rejects the whole bundle with
`CATALOG_BUNDLE_LIMIT_EXCEEDED`; it never trims or returns a partial bundle.

## 6. Skills and initialization

| Skill | Role |
|---|---|
| `vp-mode` | **The main orchestration skill.** The single working entry point: request → instruction selection → bundle → execution or delegation |
| `vp-setup` | **Auxiliary setup skill.** Detects projects, idempotently writes the configuration (managed block holds a JSON payload), verifies activation; setup hooks are deferred (D10) |

`vp-setup` initializes by environment:

| Environment | Where it writes the configuration |
|---|---|
| Standalone (without the agent runtime) | A managed block (JSON payload) in the project `AGENTS.md` (or `CLAUDE.md`, if `AGENTS.md` is absent) |
| Agent delivery without host systems | The config file of the agent runtime |
| Host layer (e.g. Codex) | The project config file assembled from the layer templates |

## 7. Delivery channels

1. **A separate VP plugin.** E5a defines selected per-host manifests (`.codex-plugin/`,
   `.claude-plugin/`, `.cursor-plugin/`, `.agents/plugins/`), skills, a hook, and
   its own scripts. E5b targets a Muse root `marketplace.json` with the package under
   `plugins/vida-powers/`, plus a separate Antigravity plugin root. The `.54` fixture
   formed the Muse package manifest and payload and the Antigravity root `plugin.json`
   and payload; it withheld the Muse marketplace output. Production inputs and outputs
   remain absent. The host marketplace owns plugin installation once a
   qualified artifact is available (D4b). After installation, `vp-setup` writes
   local project profile files only (SR-57). It does not install the plugin or
   modify files in the installed agent package. The current source tree provides
   a CLI and local setup instructions. No public marketplace artifact or
   production marketplace-install receipt appears in the current evidence.
2. **A build into the agent delivery package** — VP instructions travel into the native delivery
   together with the extended instruction registry; the canonical copy remains in VP, and
   in the package — a generated artifact with a Source link.
3. **Marketplace** — `packages/powers` is itself the marketplace owner. D4b names
   Codex as the first verified host and records declared support for other hosts. Current
   generator evidence maps Claude and Cursor formats. Muse targets a root `marketplace.json`
   with `plugins/vida-powers/`; Antigravity targets a separate plugin root. The `.54`
   fixture formed the Muse package manifest and payload and the Antigravity root
   `plugin.json` and payload. It withheld the Muse marketplace output because first-party
   catalog digest proof is missing. The fixture run had 5,233 scratch outputs; the Muse
   and Antigravity payload maps each had 2,615 files and matched by source path, byte
   length, and SHA-256. Its CLI build/check exited 0 with no writes or removals. Muse
   catalog formation remains blocked by missing first-party digest proof
   (`MANIFEST_MUSE_CATALOG_NOT_READY`). Production inputs and outputs remain absent;
   no host installation, publication, or Runtime acceptance is claimed. Devin/Kimi
   native outputs remain deferred.

### Build and check manifest outputs

`bun run --cwd packages/powers build:manifests` writes the selected host manifests.
`bun run --cwd packages/powers check:manifests` checks outputs without writing.
The builder reads `config/vppluginmanifest.v1.schema.json` and
`config/plugin-manifest-inputs.json`. If schema validation succeeds but the input
file is absent, it returns `MANIFEST_INPUT_MISSING`. Run fixture checks against an
isolated package root with `bun scripts/build-manifests.ts --check --root <package-root>`
from the package directory. The production input file and host outputs are currently
absent. Local metadata requirements depend on the selected host format. Public-release
metadata remains unresolved.

## 8. Materialization, Work Items, findings

Materialization reuses the existing runtime contracts (`WorkItem/v1`,
`WorkState/v1`, `ResearchResult/v1`, `DecisionRecord/v1`,
`AcceptanceManifest/v1`, `ImplementationScope/v1`, `LifecycleArtifactReference/v1`)
and adds only the missing parts. `artifact_contract` in every instruction defines the output
type, the data, the place of materialization and the method of verification; the check of
presence/format/digest is separate from the semantic one.

**VP Work Items** live in `packages/powers/docs/work/` as OKF concepts with a
stable ID, AC, evidence and typed relations (`derived-from`, `informs`,
`implements`, `tests`, `blocks`, `supersedes`, `changes`, `found-during`).

**Findings** — a product-scoped defect registry: Standalone — append-only
JSONL; Runtime — product isolation in the existing SQLite/HostState. Writing is
centralized (a single writer), deduplication is hybrid: identity →
fingerprint → semantic candidates → equivalence check. Creating a
finding **is not** authorization to fix it.

## 9. Repository structure

```text
packages/powers/
  AGENTS.md                     instructions for the developing agents
  README.md                     this file
  donors.yaml                   donor manifest (revisions, licenses, counters)
  docs/                         OKF bundle (index.md, log.md, research/, decisions/, work/, requests/)
  config/                       VP schemas (VPCatalog/v1, VPInstruction/v1, VPMethodologyProfile/v1, VPEffectiveProfile/v1, VPCorpusMap/v1, VPPluginManifestInputs/v1); source profile: `config/methodology-profile.json`
  instructions/                 canonical instructions: .md + metadata, flat
  skills/                       vp-mode, vp-setup (+ their scripts/)
  (.codex-plugin/ .claude-plugin/ .cursor-plugin/ .agents/plugins/)     selected E5a host outputs; none generated from production inputs
  E5b target roots (planned production outputs): Muse root `marketplace.json` with `plugins/vida-powers/`; separate Antigravity plugin root. The Muse package manifest/payload and Antigravity root `plugin.json`/payload fixtures are formed; the Muse marketplace output is withheld and production inputs/outputs remain absent
  scripts/                      product support, including build-manifests.ts, check-okf.ts, check-corpus.ts, convert.ts, validate-donors.ts, audit.ts, audit-report.ts, definitions.ts
  catalog.json                  catalog identity, tag vocabulary, aliases, corpus listing with sha256
  corpus-map.json               processing map: donor + file → converted/split/merged/rejected
  tests/                        harness tests
  .tmp/                         scratch: donor clones (ignored by Git)
```

## 10. How to work with VP

**Find and retrieve instructions** — Bind the task evidence to outcome, target,
permitted actions, exclusions, and required proof; state every intent and keep
distinct intents represented. Extract literal terms, map them with
`catalog-cli.ts tags --query`, and add `--domain` or `--form` only when
evidence justifies that axis. `search` returns candidate IDs and descriptions;
without `--profile` it is discovery only. Select unique IDs for all intents,
then make one `get --id <id...> --profile <effective-profile.json>` call.
The CLI delegates to `catalog.compose`, requires every requested ID, includes
dependencies, and rejects conflicts atomically. Read the source bodies and
nonempty applicability/artifact obligations in compose order; verify them
against the requested target and proof. Do not infer confidence, exclusivity,
hidden synonyms, or authority from tag counts or shared themes.
A matching instruction or pull request does not establish real authorization;
resolve it from the named owner and current authoritative source.
Pass the same exact `--catalog <path>` to `tags`, `search`, and `get`.
Never union explicit root `.tmp` snapshots with the package corpus. Catalog,
instruction and effective-profile schemas must exist in the selected snapshot.
Profile-aware search and composition use the package's canonical
`config/methodology-profile.json` and `config/vpmethodologyprofile.v1.schema.json`
as policy authority, including snapshot queries; snapshot policy cannot override
them. Bind both snapshot files and canonical policy for reproducible work.

**Add an instruction** — a new atomic norm in the corpus with tags, conditions,
`artifact_contract`, provenance (donor + license + revision) and `revision`; then
update the coverage report.

**Add a donor** — fix the revision in `donors.yaml`, clone the snapshot into
`.tmp/donors`, run inventory → instructions → tags → dedup → conflicts →
provenance; record a decision on every dedup match.

**Compose a structured bundle** — `catalog.compose` remains the structured
composition API for callers supplying selectors, role and effective
methodology. Mandatory instructions and dependencies enter the bundle
regardless of relevance. The single-record `catalog.get` library operation
remains an inspection API, not a bundle assembler.

**Create a Work Item** — a concept in `docs/work/`: stable ID, goal, scope, AC,
relations to other Work Items; evidence — as separate records.

**Verify the product** — `bun packages/powers/scripts/check-okf.ts`,
`bun tooling/agent/check-documentation.ts <explicit list of .md files>` (a directory instead of
a list selects one document and makes the check empty), `bun run --cwd
packages/powers test`, `bun run --cwd packages/powers test:coverage`.

**Audit the corpus** — `bun packages/powers/scripts/audit.ts <map|pairs|pair-agreement|pair-table|fidelity|specs>`.
`map` compares the processing map with the instruction provenance, `pairs` the
declared opposing pairs, `pair-agreement` the D12 decision record with the corpus,
`pair-table` the rows of the D12 table regenerated from the corpus, `fidelity` the
instruction bodies with the donor text, `specs` a repair specification with the
corpus it will be written into.
The command is read-only and prints the counters of the report and the first rows
of every section; `--limit <n>`, `--offset <n>` and `--filter <text>` choose the
rows, `--summary` prints the counters only, `--all` prints every row, and
`--out <file>` writes the whole report to a file and leaves the terminal with the
counters. `--json` emits the report as JSON.

## 11. Roadmap and status

Delivery status, order and gates have one owner: [docs/next-actions.md](docs/next-actions.md). It
holds the A0–H table, the E5a/E5b host target status, the remaining forward stages, the deferred
product questions, the quality gates and the risks. This README does not restate that state.

## 12. Status and deferred items

**Done:** product concept (research), canonical BR/SR/AC with a traceability matrix, seventeen
decision records (D1–D9, D4b and D10–D16), an OKF bundle with a validator, and a donor manifest
with eight processed snapshots (seven methodological donors and Open Knowledge Format) plus
Wondelai registered-not-processed. `research_status: finalized`; steps A0, A, B, C and D are
closed; E1–E4 are implemented and E5b production qualification remains open.

**Deferred outside the current scope:** registration in the shared root files of the repository;
D3+D8 Runtime implementation and acceptance; the `.vida/*` cutover; marketplace publication; the
Runtime mode of VP in general; and Runtime Stage 7b behind the storage GAP.

**Open gates that no document may shortcut:** E5b production qualification and host installation,
Step F AC-22 equivalence and a real finding/artifact store, Step G handoff, Step H0–H3, the v1.2
re-binding of the frozen 40-ID trial, legal clearance, and Runtime acceptance. Package gate state,
including the currently red repository Knip gate, is recorded in
[docs/next-actions.md](docs/next-actions.md).

## 13. Source licenses

The VP corpus originates from seven donor projects (Superpowers, BMAD Method, Matt
Pocock Skills, Addy Osmani Agent Skills, Cursor pstack, GSD Core, Ponytail) and
Open Knowledge Format v0.2. Licenses: MIT × 7, Apache-2.0 (OKF). Exact revisions
and license attributes — in `donors.yaml`; the package `NOTICE` lists each donor ID,
license, license file and pinned revision, including the Open Knowledge Format
attribution. Legal review of all donor-license obligations remains open.
