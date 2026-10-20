# Vida Powers

**A portable agent plugin with a canonical instruction corpus, a single
orchestration skill and materialization of results.**

It lives in `packages/powers/` — the third product of this repository next to
`packages/agent` (Vida Agent, runtime) and `packages/plugin` (Vida Codex,
the layer between the Codex host and the agent).

| Document | What it is about |
|---|---|
| [Research — product concept](docs/research/vida-powers-product-research.md) | B-level: why the product exists, which boundaries it has, which behavior rules it follows |
| [Implementation plan](docs/implementation-plan.md) | Roadmap of stages 0–9, gates, risks |
| [Next actions](docs/next-actions.md) | Current scope within the catalog: A0 → A → B → C → D → E → F → G |
| [Decisions D1–D9](docs/decisions/index.md) | Accepted decisions with grounds and consequences |
| [AGENTS.md](AGENTS.md) | Instructions for the agents developing VP |
| [Donor manifest](donors.yaml) | Exact revisions of 8 donor repositories, licenses, file counters |

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
are materialized. The relevance threshold is calibrated **per operation**; the example
value from the research is not a universal constant.

## 5. Methodology policy

Methodology is **product policy**, not the situational choice of an agent. The profile
(`VPMethodologyProfile/v1`) contains choice groups, rules of explicit selective
inheritance between products, local overrides and a task-scoped override
(a temporary exception for a specific task that does not change the permanent profile,
permissions or security gates). An inheritance conflict is a question for the owner, not
"last loaded wins".

**One schema, different carriers:** Runtime — a section in `.vida/project.yaml`; Standalone —
the same section in a managed YAML block of the project instruction file; the host layer —
in the project config file.

## 6. Skills and initialization

| Skill | Role |
|---|---|
| `vp-mode` | **The main orchestration skill.** The single working entry point: request → instruction selection → bundle → execution or delegation |
| `vp-setup` | **Auxiliary setup skill.** Detects projects, idempotently writes the configuration, configures the available hooks, verifies activation |

`vp-setup` initializes by environment:

| Environment | Where it writes the configuration |
|---|---|
| Standalone (without the agent runtime) | A managed YAML block in the project `AGENTS.md` (or `CLAUDE.md`, if `AGENTS.md` is absent) |
| Agent delivery without host systems | The config file of the agent runtime |
| Host layer (e.g. Codex) | The project config file assembled from the layer templates |

## 7. Delivery channels

1. **A separate VP plugin** — per-host manifests (`.codex-plugin/`,
   `.claude-plugin/`, `.cursor-plugin/`, `.muse-plugin/`, …), skills, a hook, own
   scripts; installation through `vp-setup`.
2. **A build into the agent delivery package** — VP instructions travel into the native delivery
   together with the extended instruction registry; the canonical copy remains in VP, and
   in the package — a generated artifact with a Source link.
3. **Marketplace** — `packages/powers` is itself the marketplace owner; Codex —
   the verified first host, the rest — declared support with a marked limitation.

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
  config/                       VP schemas (VPCatalog/v1, VPInstruction/v1, VPEffectiveProfile/v1, VPCorpusMap/v1)
  instructions/                 canonical instructions: .md + metadata, flat
  skills/                       vp-mode, vp-setup (+ their scripts/)
  .codex-plugin/ .claude-plugin/ .cursor-plugin/ .agents/plugins/   per-host manifests
  scripts/                      product support: check-okf.ts, check-corpus.ts, convert.ts, validate-donors.ts
  catalog.json                  catalog identity, tag vocabulary, aliases, corpus listing with sha256
  corpus-map.json               processing map: donor + file → converted/split/merged/rejected
  tests/                        harness tests
  .tmp/                         scratch: donor clones (ignored by Git)
```

## 10. How to work with VP

**Find an instruction** — `catalog.search` by capability/pattern tags; the full
text — only through `catalog.get`.

**Add an instruction** — a new atomic norm in the corpus with tags, conditions,
`artifact_contract`, provenance (donor + license + revision) and `revision`; then
update the coverage report.

**Add a donor** — fix the revision in `donors.yaml`, clone the snapshot into
`.tmp/donors`, run inventory → instructions → tags → dedup → conflicts →
provenance; record a decision on every dedup match.

**Compose a bundle** — `catalog.compose` by tags, role and effective
methodology: mandatory instructions and dependencies enter the bundle
regardless of relevance.

**Create a Work Item** — a concept in `docs/work/`: stable ID, goal, scope, AC,
relations to other Work Items; evidence — as separate records.

**Verify the product** — `bun packages/powers/scripts/check-okf.ts`,
`bun tooling/agent/check-documentation.ts <explicit list of .md files>` (a directory instead of
a list selects one document and makes the check empty), `bun run --cwd
packages/powers test`, `bun run --cwd packages/powers test:coverage`.

## 11. Roadmap

| Step | Content | Status |
|---|---|---|
| A0 | Risk check for the agent lint gate | **closed** — the gate returns `{"issues":[]}`, exit 0 |
| A | Product skeleton and harness (Bun package, tests) | **closed** — 13/13 tests, typecheck exit 0 |
| B | Canonical product documents (BR/SR/AC + matrix) | **closed** |
| C | `VPCatalog/v1`, `VPMethodologyProfile/v1`, `catalog.*` operations, `decision.evaluate` | plan |
| D | Vertical slice of the corpus: superpowers → ponytail → the rest | plan |
| E | `vp-mode`/`vp-setup` skills, per-host manifests, marketplace | plan |
| F | Work Items, findings (Standalone), `artifact_contract` | plan |
| G | Runtime request (D3 + D8) as a document | plan |

In detail — in [docs/next-actions.md](docs/next-actions.md).

## 12. Status and deferred items

**Done:** product concept (research), roadmap, catalog design, ten decision
records (D1–D9 and D4b), an OKF bundle with a validator, a donor manifest with 8
fixed snapshots (7 methodological donors and Open Knowledge Format).

**Deferred outside the current scope:** registration in the shared root files of the
repository; the D3+D8 runtime request; the `.vida/*` cutover; marketplace publication;
the Runtime mode of VP in general.

**Status:** `research_status: finalized`; implementation: steps A0, A and B are closed —
the next step is C (catalog and scripts).

## 13. Source licenses

The VP corpus originates from seven donor projects (Superpowers, BMAD Method, Matt
Pocock Skills, Addy Osmani Agent Skills, Cursor pstack, GSD Core, Ponytail) and
Open Knowledge Format v0.2. Licenses: MIT × 7, Apache-2.0 (OKF). Exact revisions
and license attributes — in `donors.yaml`; the NOTICE text for Apache-2.0 must be
added during conversion (step D).
