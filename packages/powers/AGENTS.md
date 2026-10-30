# AGENTS.md — Vida Powers

Product-local instructions for agents developing **Vida Powers** in this
repository. These are the product instructions; the repository root `AGENTS.md`
is a generated discovery entry, and its rules apply in full.

**Product:** Vida Powers — a portable agent plugin with a canonical instruction
corpus, a single orchestration skill `vp-mode`, an auxiliary `vp-setup` and
materialization of results in two modes (Standalone / Runtime).

---

## 1. Bootstrap: what to read and in what order

| # | File | Why |
|---|---|---|
| 1 | `docs/next-actions.md` | Current scope, order and gates of work |
| 2 | `docs/research/vida-powers-product-research.md` | B-level: product concept (source of truth) |
| 3 | `docs/decisions/index.md` | Accepted decisions D1–D16 (and D4b) with grounds |
| 4 | `docs/system-specification.md` (after step B) | S-level: observable behavior |
| 5 | repository `AGENT.sidecar.md` | Placement, owners, policy, verification gates |

Repository rules (ownership, delegation, documentation policy, Git) are in
`../../AGENT.sidecar.md`; they take priority over this file in shared matters.

## 2. Hard boundaries of work

- **We work only in `packages/powers/`.** The shared root files of the repository
  (`AGENT.sidecar.md`, `agent-runtime.config.v1.yaml`, the documentation policy,
  `docs/products.map.md`, `README.md`, the knip configuration, the root `package.json`) and
  `packages/agent` **are not changed** without a separately agreed request (D9).
- **Runtime requests are issued as documents** in `docs/requests/`, not as edits in
  `packages/agent`. One shared request covers D3 (the extended instruction
  registry of the agent package) and D8 (reading the methodology profile).
- **Every change in the product** has an owner (D2): `Vida Powers owner`. The agent
  implements the work but does not make product decisions instead of the owner.
- **No change without prior agreement with the owner.** The plan, `docs/next-actions.md`
  and the recorded decisions define the direction, not permission to execute. Every step
  is agreed separately — before files are created or changed. The agent chooses
  only the implementation of an already agreed decision; unagreed work does not remain in
  the tree and is not committed.
- **One writer per file.** Shared files — Root only.
- Git: commits are done by Root; publication (push) — only on a separate instruction.

## 3. Tool chain

- **Bun 1.4.4 — the product runtime.** `node`/`npm`/`npx` are not used.
  On this machine Bun is **not on PATH**; full path:
  `C:\Users\pomaz\AppData\Local\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe`
- **No own infrastructure in the plugin.** There is no own runtime,
  bundler, package manager, CLI framework or test runner: everything is
  borrowed from the project.
- **The plugin code is runtime-agnostic.** VP modules must work in any
  environment (Bun or Node) without external dependencies: only the standard
  `node:` modules (`fs`, `path`, `process`, `child_process`). Bun-specific APIs
  (`Bun.YAML`, `Bun.file`, `Bun.spawn`, `import.meta.dir`) are allowed **only in
  dev tools** (they run under the project runtime); in the code
  shipped in the skills they are absent.
- **Machine formats are JSON.** The canonical data that the code reads (the corpus, profiles,
  the instruction registry) are stored in JSON: `JSON.parse` is available in any
  environment. YAML — only for human manifests (`donors.yaml`), where parsing
  is performed by a project tool.
- **Scripts shipped in the skills** (setup, instruction search) —
  plain TS **without a build**: they run under Bun or Node. Constraints:
  only `node:` modules, `import type` for types, no `enum`/`namespace`/
  parameter properties (so that type-stripping works), paths are derived from
  `import.meta.url` through `node:url` (not from `import.meta.dir`), YAML is not
  parsed.
- **Tests — under the project runtime** (`bun test`); this is the repository test runner,
  not the plugin's own infrastructure.
- **Bun version pin** — `packages/powers/.bun-version` (the value `1.4.4`).
  The Agent package retains its independently selected pin. Historical receipts
  retain their recorded runtime; active frozen producers keep their exact executable.
- **Package conventions** mirror `packages/agent`: `tsconfig.json` with
  `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, `types: ["node", "bun"]`; `bunfig.toml` with
  `[test] root = "./tests"`, `coverageThreshold = { lines: 1.0, functions: 1.0,
  statements: 1.0 }`, `randomize`, a fixed seed.

## 4. Commands

Verified at the current moment (execute from the repository root):

```sh
# Bundle compatibility with Open Knowledge Format v0.2
bun packages/powers/scripts/check-okf.ts

# Local check of links and headings with the repository tool
bun tooling/agent/check-documentation.ts <explicit list of bundle .md files>

# Product tests
bun run --cwd packages/powers test

# Product type checking (bun check; tsconfig with erasableSyntaxOnly)
bun run --cwd packages/powers typecheck

# Read-only formatting check for development metadata (Bun 1.4.4 built-in)
bun run --cwd packages/powers format:check

# Repository lint gate that also covers the VP code
bun run --cwd packages/agent lint:knip:pinned

# Donor manifest (scratch tool in .tmp, ignored by Git)
bun packages/powers/scripts/validate-donors.ts

# Corpus audit (read-only reports over the corpus)
bun packages/powers/scripts/audit.ts <map|pairs|pair-agreement|pair-table|fidelity|specs> [--limit <n>] [--offset <n>] [--filter <text>] [--summary] [--all] [--json] [--out <file>]

# Read-only mechanical review of an existing proposal packet
bun packages/powers/scripts/packet.ts PACKET PRODUCT_ROOT [PRIOR|-] [PACKET_SHA|-] [PRIOR_SHA|-] [REPORT|-] [REPORT_SHA|-] [OFFSET] [LIMIT] [R1_BASIS|-]

# Read-only exact migration plan mechanics; status is not authorization
bun packages/powers/scripts/review-migration-plan.ts ROOT STAGE PLAN PLAN_SHA prepared|applied OFFSET PREFIX ASSIGNMENTS ASSIGNMENTS_SHA RECEIPT RECEIPT_SHA [--detail] [--plan-review REVIEW REVIEW_SHA]
```

The migration-plan checker accepts only the canonical product root or an unattested fixture below the product `.tmp` directory. All paths and hashes are explicit. It checks every current cohort file and up to 25 instruction targets, catalog and map; it does not re-audit prior applications' preimages. `MECHANICAL_MATCH` is not semantic approval, independent review or authorization. Missing evidence is `UNKNOWN`. Optional review binding checks an artifact against the exact plan SHA but does not establish its independence. Reads are non-atomic; concurrent replacement or transient drift can escape detection. Runtime reads/bytes/hashes, data reads/bytes, total hashes, lstat calls and cohort count are operation counters, not time or tokens. Output identifies executed and skipped checks; inspect it. It does not verify rights, classification meaning, nonce, UNKNOWN recovery or timestamp policy. Record comparable same-scope counters and output bytes after every third applied batch; the checker neither tracks nor applies batches. Token savings and timing require separate measurement.

Packet and product-root paths must be absolute; assignments and rows packets use
`packages/powers/instructions/<id>.md`, proposal packets use `instructions/<id>.md`,
and positions must be contiguous.
Offset is zero-based and defaults to the remaining rows; a slice cannot be combined
with a prior. Exit 1 reports a mismatch or error. Packet-wide declaration checks and
selected-row parser and raw-drift observations have separate scopes. Each declared
counter has a checked or unchecked status and basis; historical comparisons lacking
their exact basis remain unchecked. For proposal packets `R1_BASIS` is optional and
must match the packet's r1 SHA pin; it checks full-packet r1-to-current-capture drift,
including IDs, body and conditions. Saved r2-to-current-capture drift and selected
current-file drift are separate; the report's raw-drift claim is not checked.
The JSON result marks skipped report, delta and
declared-scope checks. Parser checks use synthetic proposal
frontmatter and a fixed packet serialization order; they do not verify applied metadata
or semantic review. Declared ranges and corpus totals remain unchecked, and readback
is non-atomic. The tool reads catalog bytes once for hashing and positional ID checks;
it does not run the full catalog schema validator. It grants no review or write authority.

> Invocation form: `bun run --cwd <dir> <script>`. The variant `bun --cwd <dir> run <script>`
> prints usage and does not execute the script.

`typecheck` uses `bun check --no-script` so the built-in checker cannot be
shadowed by a package `check` script. `format:check` uses the built-in formatter
on `package.json` and `bunfig.toml` only. Do not run automatic formatting on
`instructions/`, `catalog.json`, `corpus-map.json`, pinned donors, or retained
evidence: their exact bytes and digests belong to the corpus and receipt owners.
The 1.4.4 coverage fixes can change counters relative to 1.4.3. Keep the configured
1.0 thresholds and report actual new counters; do not relabel historical receipts.

**Installing dependencies.** VP has its own install directory (`packages/powers/bun.lock`,
`packages/powers/node_modules`) — like `packages/agent`; in VP there are only dev types
(`@types/bun`, `@types/node`). Command: `bun install --cwd packages/powers`.
For the repository: `bun install --frozen-lockfile --cwd packages/agent` (the tracked file
`packages/agent/bun.lock` is not changed).

After step **C** — catalog operations: `catalog.tags`, `catalog.search`,
`catalog.get`, `catalog.compose`; after step **D** — `convert` and
`check-corpus`.

## 5. Catalog structure

| Path | Responsibility | Step |
|---|---|---|
| `docs/` | The product OKF bundle: research, canonical documents, decision records, next-actions, Work Items, runtime requests | B, F, G |
| `docs/decisions/` | Accepted decisions (one decision — one concept) | D1–D16 (and D4b) |
| `docs/work/` | VP Work Items: stable ID, AC, evidence, relations | F |
| `docs/requests/` | Runtime requests to the agent maintainer | G |
| `config/` | VP schemas: `VPCatalog/v1` (catalog manifest), `VPInstruction/v1` (instruction frontmatter), `VPEffectiveProfile/v1` (the resolved profile for `compose`; the source one is `VPMethodologyProfile/v1`, D8), `VPCorpusMap/v1` (processing map), `VPPluginManifestInputs/v1` (`vppluginmanifest.v1.schema.json`, E5); plus the source profile instance `config/methodology-profile.json` (`VPMethodologyProfile/v1`, D8/D10) | C, E |
| `instructions/` | canonical instructions: `.md` + metadata, flat | D |
| `corpus-map.json` | corpus processing map: donor + file → converted/split/merged/rejected | D |
| `skills/vp-mode/`, `skills/vp-setup/` | Skills (orchestration, setup) together with their `scripts/` — catalog and setup tooling; shipped in the plugin | C, D, E |
| `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`, `.agents/plugins/` | E5a selected host manifests generated from explicit package inputs; production inputs/outputs are absent | E |
| `scripts/` | Product support scripts: `check-okf.ts`, `check-corpus.ts`, `check-retrieval.ts` (read-only receipt validator for an intent-to-ID retrieval map), `convert.ts`, `validate-donors.ts`, `audit.ts`, `audit-report.ts` (the report engine the audit CLI drives), `packet.ts` (read-only proposal mechanics), `review-migration-plan.ts` (read-only migration-plan mechanics), `definitions.ts` (the duplicate BR/SR/AC/NFR definition checker), `build-manifests.ts` (selected per-host manifest generation and read-only check, E5) | C, D, E |
| `skills/*/scripts/` | Tooling shipped in the skills (catalog, setup) | C, D, E |
| `tests/` | Tests of the VP harness | A–F |
| `donors.yaml` | Donor manifest: exact revisions, licenses, counters | existing |
| `package.json` | VP package manifest: knip sees `packages/powers` as a workspace only with a `package.json` | A |
| `.tmp/` | Scratch: donor clones, one-off scripts. **Ignored by Git** | D |

Approved E5b targets: Muse root `marketplace.json` with `plugins/vida-powers/`, plus a
separate Antigravity plugin root. The `.54` fixture formed the Muse package manifest and
plugin payload and the Antigravity root `plugin.json` and payload. Muse's root marketplace
output was withheld because first-party catalog digest proof is absent. Production inputs
and outputs remain absent. The `.65` review is present at
`.tmp/panel/final-gate-repair-validate-m31-20261022-65/REVIEW.md` (21,927 bytes,
SHA-256 `0797f85116ba9a7a37daeff6d80611add144691f8899e634bd300af23b7cc658`). It marks
`.62` repair CODE+EVIDENCE READY with no code blocker. It is not a package PASS or E5b
approval. The `.67` numeric receipt remains `overall: NOT_CLOSED` and `packagePass: false`.
The independent `.70` review marks its numeric evidence baseline READY (0 Critical, 0 Important,
2 Minor receipt-wording findings); this is not package, product, release, or Runtime acceptance.
The `.67` fixture count is 2,617 package files plus one fixture-only input, not 2,618 package
files. No separate 100% statement-coverage claim is made because Bun emitted no statement
counter; branches 0/0 are uninstrumented. Host installation and acceptance, public metadata and
publication, legal clearance, and Runtime acceptance remain open. These are approved targets
or formed fixtures, not production outputs or host acceptance.
H0 documentation acceptance and final native fixture parity on the eight `.69` Markdown paths
remain open.

The effective profile schema `config/vpeffectiveprofile.v1.schema.json` is package-owned.
The `vp-mode` CLI accepts it through `--profile`; for Standalone, extract the fenced JSON
between the exact managed markers into a temporary `.json` file, unchanged. Refresh a
legacy profile with `vp-setup` before interpreting it as a user-choice request. Unresolved
policy returns canonical alternatives and no bundle; the selected profile is mandatory
for a resolved session bundle.

## 6. Invariants — do not violate

1. **One activation engine.** VP has no second resolver, scheduler, ledger
   or state store. In Runtime execution belongs to VIDA Core/Mastra (D3).
2. **One canonical owner per contract.** Existing runtime contracts are reused;
   VP does not create parallel versions.
3. **A tag ≠ agent/skill/step/permission.** Every tag is kebab-case and has ≥2 meaningful
   components; `TDD` — an alias of `test-first-development`.
4. **Mandatory instructions and dependencies do not disappear because of low relevance.**
   A high score is not proof of correctness, permission or completion.
5. **Agent Fallback is mandatory**: provider unavailability, timeout, API error,
   incorrect format, unknown candidate ID, insufficient confidence → transition to
   the main agent with materialization of the reason (D5).
6. **Evidence precedes claims.** `passed` is impossible without actual execution;
   static analysis or the presence of code does not close the criterion.
7. **Materialization by Contract.** `artifact_contract` defines the output type, the data,
   the place and the method of verification; the presence/format/digest check is separate from
   the semantic one.
8. **Scope-first.** A finding outside the issued scope is a blocker with a request for permission, not
   a silent expansion; a third-party bug is a separate Finding.
9. **The source of every instruction is traceable:** donor, license, revision from
   `donors.yaml`.
10. **As much state as needed.** A changed input invalidates only the
    evidence bound to it.
11. **Changes only through agreement.** No product file is created or
    changed without prior agreement with the owner. Planned steps are
    a proposal, not permission to execute; execution of a step begins only after
    an explicit "yes".
12. **No own infrastructure.** The plugin does not introduce a runtime, bundler,
    package manager, CLI framework or test runner: everything is taken from the project.
    The plugin code must be runtime-agnostic and work without external dependencies.
13. **Version — only in metadata.** A file name contains no version, dates, statuses
    (`draft`, `done`, `final-v2`); the content version lives in `revision` in the frontmatter,
    and the change history — in the bundle log `docs/log.md`. The exception is the names of **schemas**
    (`*.v1.schema.json`): there the format version is in the name itself, by the repository
    convention (`packages/agent/schemas/…`).

## 7. Accepted decisions (briefly; details — in `docs/decisions/`)

| ID | Decision |
|---|---|
| D1 | VP lives in `packages/powers` as the third product; `packages/plugin` — the Codex layer |
| D2 | Monorepo of products: each plugin has an owner, documentation, tasks, a work space; VP Work Items — in the product |
| D3 | VP is standalone: its own `VPCatalog/v1` and its own scripts; in the agent package — an extended instruction registry (runtime request) |
| D4 | Three delivery channels; skills: `vp-mode` (orchestration) + `vp-setup` (setup) |
| D4b | `packages/powers` is itself the marketplace owner; Codex — the verified host, the rest — declared support |
| D5 | Provider-neutral `decision.evaluate`; routing = LLM selection + agent formation + flow level |
| D6 | Change log — the bundle log `docs/log.md` (OKF §9) |
| D7 | `vp-setup` — environment-driven initialization: instruction file / runtime config / project config |
| D8 | `VPMethodologyProfile/v1` — a VP schema; the carrier depends on the environment |
| D9 | Current scope — only `packages/powers`; root registration is deferred |
| D10 | Policy choices, executor ladder, managed block: opposing approval policies are alternatives of one group the user chooses at setup; the verification ladder is other provider family → other model of the same provider → blind agent on the same model (setup records available models); the managed block carries a JSON payload so no YAML parser is needed; setup hooks are deferred with a condition |
| D11 | Product language: documentation in English, instructions from the donor originals |
| D12 | Opposing instructions are declared, not narrowed away |
| D13 | One canonical severity scale: Critical / Important / Minor |
| D14 | One bounded engineering/UX, product and business instruction pack; individual source gates remain mandatory |
| D15 | Selected typed resources use exact-ID retrieval through the same catalog in a later phase |
| D16 | Stable canonical IDs/files with independent form/domain metadata, generated browse and a separately verified rollout |

## 8. Known risks and GAPs

- **A0 gate (before the first TS file):** the agent knip scans the repository as a whole and has no
  workspace for `packages/powers` → possible "unlisted files" and a failure of
  `lint:knip` (`--max-issues 0`). Check: `bun run --cwd packages/agent
  lint:knip:pinned`. **Status: closed** — dependencies are installed
  (`bun install --frozen-lockfile --cwd packages/agent`), the gate returns
  `{"issues":[]}` and exit 0. The `packages/powers` workspace was added to
  `packages/agent/knip.config.ts` (owner exception, D9 rev 2) with
  `ignoreBinaries: ['check']` (the Bun subcommand `check` is not an npm binary);
  the scratch directory `.tmp` is already excluded by `.gitignore` itself, a separate `ignore` is not needed.
  At step **C**, `skills/*/scripts/*.ts` was added to the entry patterns — together with
  the appearance of the first skill script (`skills/vp-mode/scripts/schema.ts`); without it
  knip does not see `skills/` and gives a config hint. This is the same owner exception D9 rev 2.
- `packages/powers/docs` is **not included** in `canonical_roots` of the repository documentation
  policy: product documents are maintained under their own OKF discipline
  (`check-okf.ts` + the log).
- The Runtime mode of VP is **not proven** in the current scope (there is no registration and no
  runtime request); the Standalone part is proven.
- The `.vida/*` cutover is an external runtime track.
- Marketplace publication requires a public Git repository — an owner decision.

## 9. Definition of done for a change in the product

1. A test or check that fails **before** the change and passes **after** it.
2. `bun run --cwd packages/powers test` → exit 0.
3. `bun packages/powers/scripts/check-okf.ts` → exit 0, if the bundle was changed.
4. `bun tooling/agent/check-documentation.ts <explicit list of .md files>` → `failures: []`
   and `selectedDocuments > 0`; passing a directory instead of a file list selects
   one document and effectively makes the check empty.
5. A record in `docs/log.md` (OKF §9): the date, the kind of change, what exactly changed.
6. For product decisions — a separate concept in `docs/decisions/` with grounds.

## 10. Forbidden

- Changing `packages/agent`, `packages/plugin` and the shared root files.
- Creating a second scheduler, DAG compiler, ledger or state store.
- Adding a dependency without agreement; using `node`/`npm`/`npx`.
- Transferring donor execution engines, tracker integrations or state journals.
- Claiming `passed` without actually running the check.
- Creating a parallel canonical document where an owner has already been assigned.
