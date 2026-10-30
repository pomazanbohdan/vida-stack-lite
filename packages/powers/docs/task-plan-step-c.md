---
type: Task Plan
title: 'Vida Powers — task-level plan for step C: catalog, operations, seed corpus'
description: 'Implementation of the instruction catalog in detail: VP schemas, the frontmatter parser, the catalog.* operations, the deterministic decision.evaluate, the seed corpus, the converter and the corpus validator — with exact files, interfaces and commands.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- task-plan
- catalog
- implementation
sources:
- id: design
  resource: /catalog-design.md
  title: Vida Powers — instruction catalog design
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers — acceptance criteria
- id: next-actions
  resource: /next-actions.md
  title: Vida Powers — next actions within packages/powers
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
revision: '1'
---

**Goal:** bring the VP instruction catalog to a working state: the schemas, the frontmatter
parser, the four `catalog.*` operations, the deterministic `decision.evaluate`,
a seed corpus of 8–12 instructions, the converter and the corpus validator.

**The specification this plan follows from:** `docs/catalog-design.md` (rev 7) +
`docs/system-specification.md` (SR-01…SR-76) + `docs/acceptance.md` (AC-01…AC-42).

**Technologies:** Bun 1.4.3, TypeScript (strict), `bun:test`, JSON Schema
(a subset), no external dependencies.

**Plan discipline:** each step — a test that fails **before** the change and passes
**after** it; each step ends with a commit; each file has one owner.

## Global Constraints

- **Runtime-agnosticism.** The code in `skills/*/scripts/` — only `node:` modules, no
  `Bun.*`, no `import.meta.dir` (paths from `import.meta.url`), no dependencies.
  Dev tools in `scripts/` may use Bun.
- **One writer.** `scripts/convert.ts` — the single writer for `instructions/`,
  `catalog.json`, `corpus-map.json`. Runtime scripts only read.
- **Machine formats — JSON.** YAML — only for human manifests.
- **Version — only in metadata** (`revision` in the frontmatter); file names contain no
  versions, dates or statuses.
- **Provenance precision.** `provenance.revision` must equal
  `donors.yaml[donor].head_sha`; `catalog.json` — the single listing of the corpus with `sha256`.
- **No line "invented" outside a source.** An instruction comes from a donor file
  (the path in `provenance.path`); synthetics without a source are not accepted.
- **Gates of the step:** `bun run --cwd packages/powers test` → 0 failures;
  `bun run --cwd packages/powers test:coverage` → 0 failures, threshold 1.0;
  `bun run --cwd packages/powers typecheck` → 0 errors;
  `bun packages/powers/scripts/check-okf.ts` → `failures: []`;
  `bun packages/powers/scripts/check-corpus.ts` → exit 0;
  `bun run --cwd packages/agent lint:knip:pinned` → `{"issues":[]}`, exit 0.

## Review Focus

1. **A repeated `vp-setup`** does not create a duplicate of the managed block (idempotence — at the level
   of the configuration, not only of the lines).
2. **An instruction with a tag that is not in the vocabulary** is not accepted — even if
   the tag looks suitable.
3. **`compose` with a conflicting group** returns an error with both identifiers, and does
   not silently discard one alternative.
4. **An instruction file changed outside `convert.ts`** breaks the manifest ↔ disk link
   (digest) — the check must notice this, not miss it.
5. **The search response contains no full text** — only metadata.

## File structure (all in `packages/powers/`)

| File | Responsibility | Dependencies |
|---|---|---|
| `config/vpcatalog.v1.schema.json` | the contract of the catalog manifest | — |
| `config/vpinstruction.v1.schema.json` | the contract of the instruction | — |
| `config/vpeffectiveprofile.v1.schema.json` | the contract of the effective profile | — |
| `skills/vp-mode/SKILL.md` | the orchestration skill (minimal, filled in at step E) | — |
| `skills/vp-mode/scripts/frontmatter.ts` | frontmatter parser (a limited YAML subset) | — |
| `skills/vp-mode/scripts/schema.ts` | a mini-validator of the JSON Schema subset | — |
| `skills/vp-mode/scripts/catalog.ts` | the catalog model + `catalog.*` + `decision.evaluate` | frontmatter, schema |
| `skills/vp-mode/scripts/catalog-cli.ts` | CLI: `tags`/`search`/`get`/`compose`/`evaluate` | catalog |
| `scripts/check-corpus.ts` | corpus validation: instructions, manifest ↔ disk, map, vocabulary | catalog, schema |
| `scripts/convert.ts` | converter: specification → `.md` + manifest + map | catalog, frontmatter |
| `instructions/*.md` | the seed corpus (8–12 instructions) | — |
| `catalog.json` | the catalog manifest (the corpus listing with `sha256`) | — |
| `corpus-map.json` | the processing map | — |
| `tests/*.test.ts` | harness tests | all modules |

---

### Task 1 — VP schemas and the mini-validator

**Files:** create `config/vpcatalog.v1.schema.json`, `config/vpinstruction.v1.schema.json`,
`config/vpeffectiveprofile.v1.schema.json`; create `skills/vp-mode/scripts/schema.ts`;
test `tests/schema.test.ts`.

**Interfaces:**
- `validateAgainstSchema(value: unknown, schema: Schema): string[]` — returns
  messages about violations; an empty array = valid.
- `Schema` — the input type of the validator.

**Schema subset (the boundary of the validator):** `type`, `required`, `properties`,
`additionalProperties` (`false` **or** a schema — for dynamic maps), `enum`,
`const`, `pattern`, `minLength`, `maxLength`, `minimum`, `maximum`, `minItems`,
`maxItems`, `items`, `$ref` → `#/definitions/*`, `allOf`, `if`/`then`, `not`.
The annotations `title`/`description` are accepted and **ignored** (schema documentation,
without validation semantics); `$schema`/`$id` — also ignored. The rest —
is not supported and must be absent from the VP schemas. A guard test: each file
`config/*.schema.json` must pass `inspectSchema` without errors.

**Steps:**
1. Test `tests/schema.test.ts`: a valid object → `[]`; a missing mandatory
   key → a message; an extra key → a message; `enum`/`const`/`pattern`/
   `minItems` → a message; `$ref` in `#/definitions` → expansion; `if`/`then` →
   verification of the conditional rule. **Step:** `bun run --cwd packages/powers test` → the test
   fails (the module does not exist yet).
2. Create `skills/vp-mode/scripts/schema.ts` with `validateAgainstSchema` and
   `SUPPORTED_KEYWORDS` (an exported list — the validator must reject a schema with an
   unsupported key).
3. Create three schemas: `vpcatalog.v1` (manifest: `schema`, `catalog_id`,
   `revision`, `source_revision`, `updated_at`, `tag_dictionary`, `tag_aliases`,
   `tag_exemptions`, `instructions[]` with `instruction_id`/`path`/`sha256`),
   `vpinstruction.v1` (all instruction fields per design §5), `vpeffectiveprofile.v1`
   (`groups` → `active` + `alternatives`).
4. `bun run --cwd packages/powers test` → all tests pass;
   `bun run --cwd packages/powers typecheck` → 0 errors.
5. Commit: `build(powers): add VP schemas and a dependency-free schema validator`.

### Task 2 — Frontmatter parser and the instruction model

**Files:** create `skills/vp-mode/scripts/frontmatter.ts`; test
`tests/frontmatter.test.ts`.

**Interfaces:**
- `parseFrontmatter(text: string): { data: Record<string, unknown>; body: string }` —
  throws `FrontmatterError` (with `line`) if the block is absent, cannot be parsed or contains
  an unsupported construct.
- The YAML subset: `key: value` (a scalar, in double quotes or without), a block list
  (`- item`), comments (`#`), empty values, numbers, `true`/`false`.
  Nested maps, multiline blocks and anchors — are **not supported** and must
  be rejected by an explicit error, not parsed silently.

**Steps:**
1. Test `tests/frontmatter.test.ts`: parsing `key: value` + a block list + a comment;
   rejection of a nested map; rejection of an absent block; preservation of the body after
   the frontmatter; values with `;` and `=` are not broken. → the test fails.
2. Create `frontmatter.ts`.
3. `bun run --cwd packages/powers test` → passes; `typecheck` → 0 errors.
4. Commit: `build(powers): add a bounded frontmatter parser`.

### Task 3 — The catalog model, the `catalog.*` operations, the manifest ↔ disk link

**Files:** create `skills/vp-mode/scripts/catalog.ts`; test `tests/catalog.test.ts`.

**Interfaces:**
- `loadCatalog(catalogPath: string): Promise<Catalog>` — reads the manifest,
  validates it against `config/vpcatalog.v1.schema.json` (the schema — next to the
  manifest), parses `provenance` and `tag_aliases`.
- `loadInstructions(catalog: Catalog): Promise<Map<string, Instruction>>` — for
  each manifest entry reads `path` relative to the catalog, computes `sha256` and
  **compares it with the manifest**; a mismatch → `CatalogError` with
  `code: 'CATALOG_DIGEST_MISMATCH'`. The frontmatter is validated against
  `config/vpinstruction.v1.schema.json` → `CATALOG_INVALID`; a tag outside the vocabulary →
  `CATALOG_TAG_UNKNOWN` (taking `tag_exemptions` into account).
- `Instruction` — the exact fields: `instruction_id`, `title`, `summary`,
  `capability_tags[]`, `pattern_tags[]`, `roles[]`, `products[]`,
  `conditions{applies_when,does_not_apply_when}` (scalars, as in the frontmatter),
  `artifact_contract{output_type,required_data[],verified_by}`,
  `compatibility{excludes[],requires[]}`,
  `provenance[{donor,license,revision,path}]` (an array — the sources after merging),
  `status`, `revision`, `content` (the body of the file).
- `catalogTags(catalog): { capability: TagEntry[]; pattern: TagEntry[] }` —
  `TagEntry = { tag, description, aliases[] }`; a stable order, without instruction
  texts (SR-09).
- `catalogSearch(catalog, instructions, query): InstructionMetadata[]` —
  filters: `capability_tags[]`, `pattern_tags[]`, `instruction_ids[]`, `roles[]`,
  `products[]`, `conditions[]`; the result **without** `content` (AC-05); the semantics —
  design §7 ("at least one" within a dimension, "and" between dimensions, aliases → canonical,
  disabled does not enter, `roles`/`products` — an empty list = any,
  `conditions` — the tokens are present in `applies_when` and absent in `does_not_apply_when`).
- `catalogGet(catalog, instructions, id): Instruction` — an unknown ID →
  `CATALOG_ID_UNKNOWN`, a disabled one → `CATALOG_INSTRUCTION_DISABLED`.
- `catalogCompose(catalog, instructions, query): ComposedBundle` — required +
  matches + transitive `compatibility.requires`; an `excludes` conflict →
  `CatalogError`.
  `ComposedBundle` contains: `catalog_id`, `catalog_revision`, `tag_dictionary`,
  `instructions[]` (each — `instruction_id`, `title`, `summary`, `content`,
  `capability_tags`, `pattern_tags`, `artifact_contract`, `provenance`,
  `selection_reason`) and the **execution context** (SR-23): `role`, `task_contract`,
  `effective_methodology`, `work_scope`, `materialization_requirements`,
  `artifact_references` — all from `query` or with an empty value.
- `CatalogError` has the field `code` (the set: `CATALOG_INVALID`, `CATALOG_TAG_UNKNOWN`,
  `CATALOG_DIGEST_MISMATCH`, `CATALOG_ID_UNKNOWN`, `CATALOG_INSTRUCTION_DISABLED`,
  `CATALOG_REQUIRED_CONFLICT`, `CATALOG_PROFILE_CONFLICT`,
  `CATALOG_DEPENDENCY_MISSING`, `CATALOG_DEPENDENCY_DISABLED`).

**Steps:**
1. Tests `tests/catalog.test.ts` on the fixtures `tests/fixtures/valid/`:
   search does not return `content`; search by role/product/condition; compose includes
   required and dependencies; compose without a profile on a conflict → an error; compose with
   a profile discards the inactive alternative; compose returns the execution context
   (role, task contract, effective methodology, scope, materialization requirements,
   references to artifacts — SR-23); `get` on an unknown/disabled id →
   an error; an instruction with a tag outside the vocabulary → an error; a changed file → a digest
   error. → the tests fail.
2. Create `catalog.ts`.
3. `bun run --cwd packages/powers test` → passes; `typecheck` → 0 errors.
4. Commit: `build(powers): add catalog model and search/get/compose operations`.

### Task 4 — `decision.evaluate` (the deterministic version) and the CLI

**Files:** extend `skills/vp-mode/scripts/catalog.ts` (the `decision.evaluate` operation —
a pure function of the catalog); create `skills/vp-mode/scripts/catalog-cli.ts`; test
`tests/catalog-cli.test.ts`.

**Interfaces:**
- `decisionEvaluate(catalog, instructions, request): DecisionResult` — input:
  `{ operation, product?, context?, tags?, candidates[] }`; output:
  `{ selected: string[], score, rationale, provider: 'catalog' | 'agent', fallback: boolean, fallbackReason: 'no-candidates' | 'unknown-candidate' | 'candidate-not-allowed' | 'invalid-format' | null }`.
  Deterministic behavior (SR-16, SR-18, SR-20): a malformed request →
  `invalid-format`; empty candidates → `no-candidates`; an unknown ID →
  `unknown-candidate`; a disabled candidate → `candidate-not-allowed`; all
  candidates admissible → a shortlist by tags (alias → canonical; "at least one" within
  a dimension, "and" between dimensions), `provider: 'catalog'`, `score` = the number of matching
  dimensions of the best candidate (the scale is **not** calibrated — this is visible from
  the rationale), `fallback: false`. No match of the candidates — **not** a refusal: an empty
  shortlist with `provider: 'catalog'`.
- CLI: `bun catalog-cli.ts <tags|search|get|compose|evaluate> [--catalog <path>]
  [--capability a,b] [--pattern c,d] [--id x] [--required a,b] [--role r]
  [--product p] [--condition text] [--profile <path>] [--operation name]
  [--context text] [--tag t]... [--candidate id]... [--json]`; JSON on stdout,
  errors — JSON `{code,message,details}` on stderr + exit 1. The catalog
  is located **relative to its own file** (`import.meta.url`), the override — `--catalog`.

**Steps:**
1. Tests `tests/catalog-cli.test.ts`: JSON on stdout; an error → JSON on stderr and
   a non-zero exit; `evaluate` without candidates → `fallback: true`; searching the catalog
   relative to the file (without cwd). → the tests fail.
2. Create `catalog-cli.ts` and add `decisionEvaluate` to `catalog.ts`.
3. `bun run --cwd packages/powers test` → passes; `typecheck` → 0 errors.
4. Commit: `build(powers): add deterministic decision evaluation and the catalog CLI`.

### Task 5 — Seed corpus, manifest, map and the corpus validator

**Files:** create `instructions/*.md` (8–12), `catalog.json`, `corpus-map.json`,
`scripts/check-corpus.ts`; test `tests/check-corpus.test.ts`.

**Steps:**
1. Test `tests/check-corpus.test.ts`: the seed corpus passes the check; a fixture with
   a missing `provenance`, an unknown tag, an unknown `requires`, a duplicate id,
   a mismatching digest, a `rejected` without a reason → an error. → the test fails.
2. Create 8–12 seed instructions from research/SR (e.g. `test-first-development`,
   `test-after-development`, `define-acceptance-criteria`, `evidence-based-research`,
   `scope-first-execution`, `independent-review`, `risk-based-testing`,
   `verify-acceptance`), each — with frontmatter per design §5 and provenance to
   donors from `donors.yaml`; `provenance.revision` = the donor's `head_sha`.
3. Create `catalog.json` (the corpus listing with `sha256`) and `corpus-map.json`
   (the entries `rejected`/`merged`/`converted`).
4. Create `scripts/check-corpus.ts`: instructions against the schema, the vocabulary, the alias direction,
   manifest ↔ disk ↔ digest, map ↔ corpus, provenance ↔ `donors.yaml`.
   The mandatory semantic rules that the schema does **not express** (cross-file links,
   `donors.yaml`, uniqueness, the link to the vocabulary) and that exactly this
   validator checks:
   - `artifact_contract_output_type` ≠ `none` → `artifact_contract_verified_by`
     non-empty (SR-08); for guidance `output_type` = `none` and `required_data` empty;
   - `capability_tags`/`pattern_tags` ≥ 1 — except instructions with `tag_exemptions`
     in `catalog.json` (an exception requires a `reason`);
   - `provenance`: a list of at least one source; each source —
     `donor` ∈ `donors.yaml`, `license` matches the manifest, `revision` equals
     `donors.yaml[donor].head_sha`, `path` exists in the clone; the same source twice — is not
     accepted;
   - `compatibility_requires`/`_excludes` — known `instruction_id`s; `requires` does not
     contain itself;
   - `instruction_id` in the frontmatter equals the file name; uniqueness of ids in the corpus;
   - `tag_aliases`: the direction "**alias → canonical**"; the canonical tag must be in
     `tag_dictionary`; an alias is not a canonical tag;
   - the processing map (`corpus-map.json`): `status: split` → at least two
     `instruction_ids` (§5a: "the file was split into several atomic instructions");
     `status: converted` → exactly one `instruction_id`; `status: rejected` →
     `reason` mandatory, `instruction_ids` absent (the map schema); `merged` →
     `instruction_ids` and `contributed_sources` present.
5. `bun run --cwd packages/powers test` → passes; `bun packages/powers/scripts/check-corpus.ts` → exit 0;
   `typecheck` → 0 errors.
6. Commit: `build(powers): add seed corpus, manifests and the corpus validator`.

### Task 6 — The converter (the single writer)

> **Execution order:** this task is performed **before** Task 5 — the corpus and the manifest
> are materialized only by the converter (CAT-D3, SR-76: the manifest is written only by
> `convert.ts`).

**Files:** create `scripts/convert.ts`; test `tests/convert.test.ts`.

**Interfaces:**
- `parseInstructionSpec(value, source): InstructionSpec` — validation of the specification;
  an unknown/missing field, a non-kebab `instruction_id`, empty `title`/`summary`/
  conditions, a tag that is non-kebab or has <2 components, `output_type: none` with non-empty
  `required_data`, empty `provenance`, a duplicated source, control characters in
  single-line fields → `CatalogError('CATALOG_INVALID')` with the field name.
- `renderInstruction(spec): string` — the canonical `.md` (key order as in §5,
  block lists with an indent of 2, empty lists as `key: []`, `provenance` as lines
  `donor=…; license=…; revision=…; path=…`, the body verbatim); the result must
  pass `parseFrontmatter` and `vpinstruction.v1` without errors.
- `convert(specPath, options): Promise<ConversionResult>` — writes
  `instructions/<id>.md`, updates `catalog.json` (the entry with `sha256`; the other fields
  are preserved) and `corpus-map.json`; **idempotently**: a repeated conversion of the same
  specification changes no file (`written/manifestUpdated/mapUpdated =
  false`), the manifest revision grows only on a real change of the listing.
- `convertMany(specPaths, options): Promise<ConversionResult[]>` — an error on one
  specification stops the run.
- Options: `{ root, catalogPath?, mapPath?, instructionsDir?, sourceRevision?, now? }`.
- Additional converter rules: the tags are compared with the manifest vocabulary (or with
  `tag_exemptions`); a dimension without any tag — only by exception; `verified_by`
  empty — only for `output_type: none`; a duplicated `instruction_id` in the
  set — an error; the processing map **adds** ids (one donor file may yield
  several instructions → `status: split`), a change of the donor revision resets the entries
  of that donor; all schemas are taken from the root of the package.

**Steps:**
1. Test `tests/convert.test.ts`: conversion of a specification → `.md` with frontmatter and
   `sha256` in the manifest; a repeated conversion of a changed specification → an updated
   digest; conversion without `provenance` → an error (synthetics without a source
   are forbidden); the entry in the map is updated; twenty or more cases — below.
2. Create `scripts/convert.ts`.
3. `bun run --cwd packages/powers test` → passes; `typecheck` → 0 errors.
4. Commit: `build(powers): add the corpus converter as the single writer`.

## Execution progress

| Task | Status | Evidence |
|---|---|---|
| 1. VP schemas + mini-validator | **closed** | `config/vpcatalog.v1.schema.json`, `config/vpinstruction.v1.schema.json`, `config/vpeffectiveprofile.v1.schema.json`, `skills/vp-mode/scripts/schema.ts`, `tests/schema.test.ts` — 32 tests, coverage 100 %, typecheck 0, knip `{"issues":[]}`; 4 independent review rounds, final verdict ACCEPT |
| 2. Frontmatter parser | **closed** | `skills/vp-mode/scripts/frontmatter.ts`, `tests/frontmatter.test.ts` — 47 tests, coverage 100 %, typecheck 0, knip `{"issues":[]}`; 3 review rounds, final verdict ACCEPT |
| 3. Catalog model + `catalog.*` | **closed** | `skills/vp-mode/scripts/catalog.ts`, `tests/catalog.test.ts`, `tests/fixtures/catalog/` — 96 tests, coverage 100 %, typecheck 0, knip `{"issues":[]}`; 3 review rounds, final verdict ACCEPT |
| 4. `decision.evaluate` + CLI | **closed** | `skills/vp-mode/scripts/catalog.ts` (+`decisionEvaluate`), `skills/vp-mode/scripts/catalog-cli.ts`, `tests/catalog-cli.test.ts` — 126 tests, coverage 100 %, typecheck 0, knip `{"issues":[]}`; 2 review rounds, final verdict ACCEPT |
| 5. Seed corpus + manifests + validator | **closed** | `instructions/` (12 instructions), `catalog.json` (12 entries + the approved vocabulary), `corpus-map.json` (12 entries), `scripts/check-corpus.ts`, `tests/check-corpus.test.ts` — 206 tests, coverage 100 %, check-corpus → 0 issues / exit 0; 2 review rounds, final verdict ACCEPT |
| 6. `convert.ts` (the single writer) | **closed** | `scripts/convert.ts`, `tests/convert.test.ts` — the converter as the single writer of the manifest (CAT-D3), idempotent, with `split` for one donor file; 3 review rounds, all findings closed |

---

## Outside this plan

- The `vp-mode` skill in its full form, `vp-setup`, per-host manifests, the marketplace —
  step **E**.
- Conversion of real donors (beyond the seed) — step **D**.
- The runtime request D3+D8 — step **G**.
- Registration of the product in the shared root files — step **0** (deferred per D9).

## Definition of done for step C

1. `bun run --cwd packages/powers test` — 0 failures, `test:coverage` — threshold 1.0.
2. `bun run --cwd packages/powers typecheck` — 0 errors.
3. `bun packages/powers/scripts/check-okf.ts` — `failures: []`.
4. `bun packages/powers/scripts/check-corpus.ts` — exit 0.
5. `bun run --cwd packages/agent lint:knip:pinned` — `{"issues":[]}`, exit 0.
6. `bun tooling/agent/check-documentation.ts <explicit list of .md>` — `failures: []`.
7. Each Task — a separate commit; no file is edited by two lanes.

### Dated addendum — 2026-10-22

Step C is closed. Its v1 decision.evaluate refusal set remains the four current reasons and codes: no candidates (no-candidates), unknown candidate ID (unknown-candidate), candidate outside the admissible set (candidate-not-allowed), and malformed format (invalid-format). The proposed fifth reason, applicability-unresolved, belongs only to the future D14 applicability phase in Step H and is not evidence of Step C implementation. AC-10 records the current/future boundary; SR-82 owns the future behavior.
