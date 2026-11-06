---
type: Decision
title: 'D56 - H2 contract approval: VPInstruction/v2, VPCorpusMap/v2 and applicability'
description: 'Adopt the owner-approved H2 contract for v2 instruction and map markers, applicability, CSV intake, fidelity receipts and the v2-aware validator.'
status: stable
stale_after: '2027-11-06T00:00:00Z'
tags:
- vida-powers
- h2
- contract
- decision
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers acceptance criteria
- id: step-h
  resource: /task-plan-step-h.md
  title: Step H source-admission plan
revision: '1'
---

# D56 — H2 contract approval

Date: 2026-11-06
Status: accepted. The repository owner approved the contract on 2026-11-05.

## Context

The H2 contract and its four-round council record existed only under ignored
`.tmp` paths. Git history could not explain why `VPInstruction/v2`,
`VPCorpusMap/v2`, applicability and CSV intake exist. The owner approval of
2026-11-05 authorized implementation, but the approved contract needed a tracked
home.

## Decision

Adopt the approved H2 contract as the durable S-level contract for:

- `VPInstruction/v2` with one flat applicability JSON scalar.
- `VPCorpusMap/v2` with Markdown carriers and optional `csvSources`.
- Applicability evaluation for frameworks, runtimes, platforms, standards and
  accessibility, including unresolved and inapplicable precedence.
- The normative CSV intake contract, row/cell hashes, locators, dispositions,
  merge rules and fidelity receipts.
- The v2-aware `check-corpus.ts` validator and the test matrix.
- The nine owner decisions in contract section 11.

The contract text below is the approved normative specification. The canonical
system requirements remain in `system-specification.md` and the acceptance
criteria remain in `acceptance.md`; this record links to them and does not
duplicate their text.

## Council and owner approval

The council ran three blind variants (V3 Delphi, V2 Adversarial triad, V4 Party
chat), each on `codex/gpt-6-luna` and `acpRegistry_devin/swe-2-flash-medium`.

| Round | APPROVE | APPROVE_WITH_CHANGES | REJECT | Aggregate |
|---|---:|---:|---:|---|
| 1 | 0 | 4 | 2 | Not approved; five blocking findings |
| 2 | 0 | 3 | 3 | Not approved; precision blockers remained |
| 3 | 0 | 6 | 0 | Architecture accepted; twelve precision items |
| 4 | 1 | 5 | 0 | Conditional approval; no open Critical/Important after fixes |

Final council result: **1 APPROVE, 5 APPROVE_WITH_CHANGES, 0 REJECT**. The
repository owner reviewed the conditional approval and **approved the revised
contract and plan on 2026-11-05**. Implementation is authorized within the
contract's scope. This approval is not source admission, H2 acceptance, legal
clearance or Runtime evidence.

All six round-4 sessions verified the twelve round-3 items as resolved. The
remaining Critical/Important findings were precision gaps and were fixed in the
approved draft:

1. Markdown-carried instructions may emit `VPInstruction/v2` through the H2
   applicability pipeline; `convert.ts` alone keeps v1.2.
2. Merged-row target bindings use the same column index and identical cell hash;
   binding locators point to the owning map row; merged cell locators are not
   transferred.
3. The validator recomputes `rawSha256`, `headersDigest`, `cellHashes`,
   `cellsDigest` and `rowHash`.
4. A range-less declared framework matches by name alone; supplied version is
   ignored; a versionless supplied entry is applicable.
5. The CSV allowlist is written by the catalog/schema implementer or source owner
   after the donor gate and owner approval; `check-corpus.ts` validates read-only.
6. `compatibility.requires` edges are always required; dual-parent dependencies
   are required; optional-only dependencies are pruned.
7. CLI `get` uses repeatable `--id`, does not require `--profile`, and returns
   one row plus applicability per ID; CLI `compose` keeps the bundle.
8. `applicability-unresolved` is materialized in the H2 implementation; deferral
   would require an owner scope change.
9. Minor precision items were fixed: populated payload example, request-level
   `invalid-format` precedence, `--context-file` limits, diagnostics envelope,
   test 27 wording, `candidate-not-allowed` reuse note, supplied-value wording,
   duplicate framework name rejection, terminal-disposition wording and
   standard-id normalization.

## Bound source artifacts

| Artifact | SHA-256 |
|---|---|
| `H2-CONTRACT-DRAFT.md` | `d225913e2c7a986a5f8a0e75b85afde504c489d0d7bf73194ed35f61e709928e` |
| `consilium-h2-approval/APPROVAL-RECORD.md` | `f8447f772b5c16177de72c2f83829e9206e12248291294e79198775525702259` |
| `H2-NODE-RUNTIME-RECEIPT.json` | `36f2952fb15f7c47f61e330939f0a0f6299bf919fef883872e0ad017fe964fd1` |

These are provenance hashes for the approved draft and evidence. The heading
levels below were demoted by one to nest the contract under this decision; the
normative text is otherwise unchanged.

The contract text is reproduced from the approved draft. Section 11 records the
owner decisions as they stood at approval: the approval resolved items 1, 3, 4,
7, 8 and 9; items 2 (CSV row selection), 5 (CSV donor gate) and 6 (H2 fidelity
authority) remain open. The "proposed expansion" in section 0 is the approved
Step H implementation allowlist described by item 9. The final sentence is
updated to reflect the approval; the normative rules are unchanged.

The owner later resolved item 2 by admitting all 1,434 measured UUPM rows, item
5 by admitting the `uupm` donor at `56ea9cf1`, and item 6 by extending D18 to
H2 in [D57](D57-d18-h2-csv-admission.md). Those later decisions do not change
the contract's normative rules.

The approved contract follows.

## H2 contract — VPInstruction/v2, VPCorpusMap/v2, applicability

Date: 2026-11-05
Status: **approved by the repository owner on 2026-11-05**. Implementation may
proceed. This file remains the H2 contract; schema, validator and catalog edits
are authorized only within its stated scope.

### 0. Owner decisions, current state and scope

Owner decisions already recorded, plus one proposed expansion:

- Applicability is encoded as **one flat JSON scalar** in frontmatter, not nested
  maps. The existing frontmatter parser stays unchanged; the catalog parses the
  JSON string.
- The H2 implementation allowlist **proposed expansion** adds
  `instruction-facets.ts`, `catalog-cli.ts`, `source-updates.ts`,
  `check-source-updates.ts`, `vector.ts`, `donor-updates.ts`, `convert.ts`,
  `audit.ts`, `audit-report.ts`, `schema.ts` and the three
  `config/h2-*.json` artifacts to the Step H allowlist. This list is proposed;
  approval of this contract records the Step H amendment. It is not already
  recorded.

Current state (2026-11-05):

- All 8 H2 Markdown source families are **already admitted as H2 source
  admission only**: `release-it` 10, `technical-documentation` 13,
  `high-perf-browser` 12, `ios-hig-design` 12, `microinteractions` 10,
  `steve-jobs-design-review` 12, `top-design` 17, `web-typography` 12; 98
  instructions total.
- Corpus: 3,278 instructions. Catalog revision: 7,343. Corpus map: 5,742.
  Baseline: 9 donors / 1,258 files.
- H2 acceptance is **not** closed. This contract covers structured
  applicability, the normative CSV intake contract, the versioned schemas and
  their validator. It does not re-admit the 8 families and does not inherit any
  H1 PASS.
- D18 currently covers the H1 pilot only. H2 semantic fidelity remains under
  SR-89 human fidelity unless the owner records a separate decision extending
  D18 to H2. This contract does not make that extension.

### 1. Version dispatch and surfaces

- Instruction marker `VPInstruction/v2`, schema
  `config/vpinstruction.v2.schema.json`.
- Map marker `VPCorpusMap/v2`, schema `config/vpcorpusmap.v2.schema.json`.
- `VPInstruction/v1.2` remains the only **current runtime-accepted** instruction
  marker. `VPInstruction/v1` and `VPInstruction/v1.1` schemas remain as
  historical fixtures; they are **not** accepted by the loader or corpus
  checker. `VPInstruction/v2` is added by dispatch.
- `VPCorpusMap/v1` remains current. `VPCorpusMap/v2` is accepted only by
  v2-aware map consumers.
- Unknown markers fail validation with `invalid-schema` or
  `unsupported-version`. These are loader/validator errors, not
  `decision.evaluate` refusal codes.
- Dispatch:
  - `catalog.ts`, `instruction-facets.ts`, `catalog-cli.ts` accept `v1.2` and
    `v2` instruction markers; reject `v1`/`v1.1` with `unsupported-version`;
    reject unknown markers with `invalid-schema`.
  - `check-corpus.ts` is the H2 v2-aware validator: it accepts `v1.2`/`v2`
    instruction markers and `VPCorpusMap/v1`/`v2`, and performs the §9 checks.
  - `audit.ts` and `audit-report.ts` accept `v1.2` and `v2` instruction markers,
    but reject `VPCorpusMap/v2` and any `csvSources` until they are CSV-aware.
  - map producer `convert.ts` emits `VPCorpusMap/v2` only when a non-empty
    `csvSources` allowlist is configured; otherwise it emits `VPCorpusMap/v1`.
    It never downgrades an existing `v2` map and preserves `csvSources` on later
    Markdown conversions. There is no automatic `v1` -> `v2` map upgrade; a
    `v1` map stays `v1` until regenerated by the configured converter.
  - instruction producer: `convert.ts` keeps `VPInstruction/v1.2` for Markdown
    carriers and for instructions without applicability. The H2 applicability
    pipeline, not `convert.ts`, may add `applicability` to Markdown-carried
    instructions and emit `VPInstruction/v2` for them. The H2 CSV applicator
    emits `VPInstruction/v2` only for instructions that carry a non-neutral
    decoded `applicability`. A v2 instruction is never downgraded.
  - map consumers `source-updates.ts`, `check-source-updates.ts`, `vector.ts`,
    `donor-updates.ts`, `audit.ts`, `audit-report.ts` reject `VPCorpusMap/v2`
    and any `csvSources` field until each is v2-aware. Their shared parser must
    fail closed, with regression tests; silently ignoring `csvSources` is not
    allowed.
- `VPCatalog/v1` is unchanged; `VPCatalog/v2` is H3 scope.

### 2. VPInstruction/v2

All v1.2 fields are retained. Add one optional string field:

```yaml
applicability: "{\"frameworks\":[{\"name\":\"react\",\"versionRange\":{\"raw\":\">=18.0.0 <20.0.0\",\"comparators\":[{\"op\":\">=\",\"version\":\"18.0.0\"},{\"op\":\"<\",\"version\":\"20.0.0\"}]},\"sourceLabel\":\"React 18-19\"}],\"runtimes\":[{\"value\":\"node\",\"sourceLabel\":\"Node.js\"}],\"requiredContext\":[\"framework:react\"]}"
```

#### 2.1 Encoding

The value is **one line**, a YAML double-quoted scalar whose content is compact
JSON. The unchanged parser supports only `\"` and `\\` escapes inside a
double-quoted scalar. Therefore the serializer is:

1. build the compact JSON string with `JSON.stringify` (no whitespace);
2. reject the instruction if any string value contains a control character
   (`U+0000`-`U+001F`, `U+007F`-`U+009F`), `U+2028` or `U+2029`, because the
   parser has no `\n`, `\t` or `\uXXXX` escape;
3. escape every `\` as `\\` and every `"` as `\"`;
4. write `applicability: "<escaped JSON>"`.

Single-quoted YAML values, unquoted flow values, multi-line scalars and nested
maps are invalid. The parser is not changed.

The decoded object shape:

```json
{
  "frameworks": [
    {
      "name": "react",
      "versionRange": {
        "raw": ">=18.0.0 <20.0.0",
        "comparators": [
          { "op": ">=", "version": "18.0.0" },
          { "op": "<", "version": "20.0.0" }
        ]
      },
      "sourceLabel": "React 18-19"
    }
  ],
  "runtimes": [{ "value": "node", "sourceLabel": "Node.js" }],
  "platforms": [{ "value": "web", "sourceLabel": "Web" }],
  "standards": [
    { "id": "WCAG", "version": "2.2", "conformance": "AA", "sourceLabel": "WCAG 2.2 AA" }
  ],
  "accessibility": [{ "value": "screen-reader", "sourceLabel": "Screen reader" }],
  "requiredContext": ["framework:react"],
  "optionalContext": ["platform:ios"]
}
```

Rules:

- absent `applicability` means neutral; invalid JSON or an empty object is
  invalid (`invalid-schema`).
- `frameworks` entries require `name`; `versionRange` is optional; when present,
  `raw` must parse to exactly the stored `comparators` after normalization.
- `runtimes`, `platforms`, `accessibility` entries require `value`.
- `standards` entries require `id` and `version`; `conformance` is optional.
- `requiredContext` and `optionalContext` are optional arrays of tokens.
- unknown fields are invalid; empty arrays are invalid (omit the field instead);
  at least one of the five fact arrays or `requiredContext` must be non-empty.
- when `versionRange` is present, both `raw` and `comparators` are required;
  `op` is one of `=`, `>`, `>=`, `<`, `<=`; `version` is a full version; `raw`
  must parse to exactly the stored `comparators` after normalization.
- duplicate declared facts (same dimension, same normalized name/id/value and
  identical comparator list) and any second framework entry with the same
  normalized `name` (even a non-overlapping range) are declaration errors
  (`invalid-schema`), not evaluation results.
- `name` is lowercase, trimmed, NFC-normalized; npm scopes are preserved.
  `runtime`/`platform`/`accessibility` values are lowercase, trimmed,
  NFC-normalized tokens from `config/h2-applicability-vocab.json`.
- `standards` `id` is trimmed, NFC-normalized and uppercase; `version` is
  trimmed and exact; `conformance` is trimmed, NFC-normalized and uppercase.
  Framework names are open names, not vocabulary-bound.
- aliases resolve through `config/h2-applicability-aliases.json` in one hop;
  alias chains and alias collisions are invalid. Alias keys are lowercase;
  alias targets keep their canonical case (`react`, `WCAG`).
- `sourceLabel` is preserved verbatim after trimming surrounding ASCII
  whitespace; internal whitespace and case are not changed. A label is required
  whenever the donor supplies one; the fidelity receipt records that evidence.
- versions are never encoded as tags.
- normalization boundary: names and tokens use trim + lowercase + NFC; standard
  IDs and conformance use trim + uppercase + NFC; `sourceLabel` uses trim only;
  CSV raw cells are byte-faithful with no normalization.

#### 2.2 Token grammar and schema precision

- token = `<dimension>:<canonical-value>`.
- legal dimensions: `framework`, `runtime`, `platform`, `standard`,
  `accessibility`.
- canonical values: framework/runtime/platform/accessibility lowercase;
  standard is the uppercase canonical ID.
- a token carries no version or conformance; an empty value or an additional
  `:` inside the value is invalid.
- declared tokens are checked at load time (`invalid-schema`) for syntax, legal
  dimension and vocabulary membership for runtime/platform/accessibility;
  framework and standard values are open names.
- supplied dimension values are checked at evaluation time; an unknown prefix or
  vocabulary value is `unknown-context`.
- a supplied framework without a version is `unresolved` /
  `required-context-missing` when the declared fact carries a range.
- numeric version components are decimal integers no greater than `2^31 - 1`;
  a larger component is a declaration error.

### 3. ApplicabilityContext and evaluation

Input key `applicabilityContext`:

```json
{
  "applicabilityContext": {
    "frameworks": [{ "name": "react", "version": "18.2.0" }],
    "runtimes": ["node"],
    "platforms": ["web"],
    "standards": [{ "id": "WCAG", "version": "2.2", "conformance": "AA" }],
    "accessibility": ["screen-reader"]
  }
}
```

Value domains:

- runtimes/platforms/accessibility: lowercase tokens from
  `config/h2-applicability-vocab.json`; a token outside the vocabulary is
  `unknown-context`.
- frameworks: normalized name plus exact `MAJOR.MINOR.PATCH`; aliases resolve
  before matching.
- standards: canonical uppercase `id`, exact `version` string, optional
  uppercase `conformance`.
- supplied arrays are exhaustive for their dimension: if a dimension is present,
  it is the complete set for this evaluation. An empty supplied array is
  `invalid-format`; an absent dimension is not supplied.
- duplicate supplied names/ids/tokens are `context-conflict`.

Quantifiers:

- declared facts are conjunctive: every declared fact must be satisfied.
- declared `requiredContext` tokens are conjunctive presence requirements; a
  token requires its dimension and canonical value to be present.
- `optionalContext` is metadata only; a match never changes the result. Its
  tokens are still vocabulary-checked.
- `conformance` is optional; when a declared standard carries conformance, the
  supplied standard must carry the same conformance (uppercase, trimmed).
  A missing supplied conformance is `required-context-missing`.
- a supplied framework without a version is `unresolved` /
  `required-context-missing` when the declared fact carries a version range.

Evaluation, first match wins:

1. absent `applicability` -> `applicable` / `none`.
2. duplicate supplied context names/ids/tokens, or duplicate declared facts ->
   supplied duplicates `unresolved` / `context-conflict`; declared duplicates
   are load-time `invalid-schema`.
3. empty supplied array -> request-level `invalid-format`; an entry missing its
   required `name`/`value`/`id`/`version` is incomplete ->
   `unresolved` / `unknown-context`. A framework entry with `name` but no
   `version` is **not** incomplete; it follows the ranged-declaration rule.
4. malformed supplied version -> `unresolved` / `unparsed-version`.
5. a required dimension, a declared token, or a needed version is absent ->
   `unresolved` / `required-context-missing`.
6. a declared fact is present but definitively not satisfied ->
   `inapplicable` / `source-inapplicable`.
7. otherwise `applicable` / `none`.

Context absence:

- if `applicability` is present and the request supplies no
  `applicabilityContext`, any declared fact or `requiredContext` token yields
  `unresolved` / `required-context-missing`; it never yields `inapplicable`.
- if a dimension is absent from a supplied context, a declared fact in that
  dimension is `unresolved`; if the dimension is present but the named value is
  absent, or the version does not satisfy the range, it is `inapplicable`.
- `inapplicable` is reserved for context that is present and definitively
  non-matching.

Standard matching:

- declared and supplied standard `id` values are normalized to uppercase and
  match by exact equality; `version` matches by exact normalized string
  equality, not a range or prefix.
- when the declaration omits `conformance`, a supplied conformance is ignored;
  when the declaration carries conformance, a supplied value must match it.

A declared framework fact without `versionRange` is satisfied by a normalized
name match alone; any supplied version is ignored. A supplied framework without
a version against a range-less declaration is `applicable`.

Request-level validation (malformed `applicabilityContext`, empty supplied
array) precedes per-candidate evaluation and returns `invalid-format`; it is not
reported as a per-candidate applicability result.

Any unresolved reason wins over inapplicable.

Payload per candidate (the `decision.evaluate` diagnostic shape):

```json
{
  "instructionId": "...",
  "applicability": "inapplicable | unresolved",
  "reason": "source-inapplicable | required-context-missing | unknown-context | unparsed-version | context-conflict",
  "requiredContext": ["framework:react"],
  "suppliedContext": {
    "frameworks": [{ "name": "react", "version": "18.2.0" }],
    "runtimes": ["node"],
    "platforms": ["web"],
    "standards": [{ "id": "WCAG", "version": "2.2", "conformance": "AA" }],
    "accessibility": ["screen-reader"]
  },
  "sourceLabels": ["React 18-19"]
}
```

### 4. Surfaces

| Surface | Input | Output |
|---|---|---|
| `loadInstructions` | none | marker dispatch; unknown marker fails validation |
| `catalogSearch` / `catalogSearchWithProfile` | terms + optional context | base rows plus an `applicability` result per row; **annotates, never filters** |
| `catalogGet` (library) | one ID + optional context | base row plus the applicability result; an inapplicable/unresolved exact ID is still returned with its result, not an error |
| `catalogCompose` / CLI `compose` | IDs/terms + optional context | `instructions` + `omitted: {inapplicable, unresolved}`, or a `CatalogError` |
| `decision.evaluate` | request + optional context | `diagnostics.applicability[]`; fallback only when no applicable candidate |
| CLI `search`/`get` | `--applicability-context <json>` or `--context-file <path>` | same fields as the library surfaces |
| CLI `compose`/`evaluate`/`explain` | same flags | same applicability fields; compose counts |
| `explain` | same as search | same fields as search |

`--context-file` is UTF-8 JSON, at most 1 MiB, read only from a path that
resolves inside the repository root; it follows the same path-safety rules as
§6.2.

Output deltas:

- search row: `applicability: { state: "applicable" | "inapplicable" | "unresolved", reason?: string, requiredContext?: string[], sourceLabels?: string[] }`.
- get: the same object on the returned row.
- compose: the existing `ComposedBundle.instructions` remains the selected list;
  add `omitted: { inapplicable: string[], unresolved: string[] }`. Do not add a
  parallel `selected` field.
- `explain`: same annotation as search.
- decision: add `diagnostics: { applicability: Payload[] }`; the existing result
  fields are unchanged.

CLI `get` uses the exact-ID `catalogGet` path, not compose/`required_ids`. It
accepts one or more `--id` values; `--profile` is not required for exact-ID
retrieval; it returns one row plus its applicability result per ID, not a
composed bundle. An inapplicable or unresolved exact ID is not an error. CLI
`compose` keeps `--profile` and the composed bundle.

Compose evaluates **after** profile substitution and dependency closure; every
final selected, required and dependency instruction is checked. An edge declared
in `compatibility.requires` is always required, regardless of its root's
optionality. `required_ids` and `compatibility.requires` are never silently
dropped: an inapplicable or unresolved required selection fails compose with the
public `CatalogError` code `CATALOG_REQUIRED_SELECTION_UNAVAILABLE` (prose name:
`required-selection-unavailable`). Optional selections are filtered and counted
in `omitted`.

Applicability filtering recomputes the dependency closure. A dependency pulled
only through an optional selection inherits that selection's status and is
pruned with it. A dependency reachable from any required root is required; if it
is inapplicable or unresolved, compose fails with the same error. A dependency
reachable from both an optional and a required root is required.

`decision.evaluate` order:

1. malformed request; 2. no candidates; 3. unknown candidate; 4. disallowed
candidate; 5. unknown tag; 6. applicability partition; 7. score ranking.

Applicability diagnostics list every candidate that reaches step 6; diagnostics
explain the applicability decision, not the final ranking. A candidate rejected
at step 5 is not in the applicability diagnostics.

- `applicable` -> returned.
- `diagnostics.applicability[]` lists every `inapplicable` and `unresolved`
  candidate with its reason.
- no applicable and any unresolved -> `fallbackReason: "applicability-unresolved"`.
- no applicable and all inapplicable -> `fallbackReason: "candidate-not-allowed"`
  with `source-inapplicable` diagnostics. This reuses the existing
  `candidate-not-allowed` reason; consumers distinguish all-inapplicable from
  other causes via `diagnostics.applicability`.

`CATALOG_REQUIRED_SELECTION_UNAVAILABLE` is a `CatalogError` code, not a fifth
`decision.evaluate` refusal code.

### 5. Version parser

Grammar:

- version: optional `v`, then `MAJOR.MINOR.PATCH`; each component is `0` or a
  non-zero digit followed by digits; no leading zeros; no prerelease or build
  metadata.
- comparator: `=`, `>`, `>=`, `<`, `<=`, optional whitespace, then a version.
- range: one or more comparators separated by whitespace; AND only.
- `^` and `~` require a full version whose major is greater than zero. **All
  zero-major caret and tilde forms are unsupported**: `^0`, `~0`, `^0.x`,
  `^0.2.3`, `~0.x`, `~0.2.3`, `~0.0.3`, `^0.0.3`.
- wildcard: `MAJOR.x` or `MAJOR.MINOR.x`, numeric components without leading
  zeros; `0.x` and `0.2.x` are allowed.
- bare `1` and bare `1.2` are unsupported. `||` is unsupported.
- numeric components are decimal integers no greater than `2^31 - 1`; a larger
  component is a declaration error.
- empty or reversed ranges are invalid declarations (`invalid-schema`).
- malformed supplied versions are `unresolved` / `unparsed-version`.

| Form | Comparators |
|---|---|
| `1.2.3` | `[= 1.2.3]` |
| `>=1.2.3` | `[>= 1.2.3]` |
| `>=1.2.3 <2.0.0` | `[>= 1.2.3, < 2.0.0]` |
| `^1.2.3` | `[>= 1.2.3, < 2.0.0]` |
| `~1.2.3` | `[>= 1.2.3, < 1.3.0]` |
| `1.x` | `[>= 1.0.0, < 2.0.0]` |
| `1.2.x` | `[>= 1.2.0, < 1.3.0]` |
| `0.x` | `[>= 0.0.0, < 1.0.0]` |
| `0.2.x` | `[>= 0.2.0, < 0.3.0]` |

Canonical ordering: `=`, `>`, `>=`, `<`, `<=`; within an operator, version
ascending. Identical lists are duplicates (declaration error); different lists
with a non-empty intersection for the same dimension/name are an overlap
(declaration error). The validator checks that `raw` parses to exactly the
stored `comparators`.

### 6. VPCorpusMap/v2

#### 6.1 Donor gate

Before any CSV parsing, the CSV donor must exist in `donors.yaml` with pinned
revision, license, attribution and content path. The allowlist path must resolve
under that donor. The `uupm` name in the examples is illustrative only; it must
be added to `donors.yaml` with its pin/license/attribution before use.

v1's donor tree is retained. Add `csvSources` beside `files`:

```json
{
  "donors": {
    "uupm": {
      "source_revision": "...",
      "files": {},
      "csvSources": {
        "path/to/uupm.csv": {
          "rawSha256": "<64 hex>",
          "headersDigest": "<64 hex>",
          "columns": [
            { "index": 0, "header": "Title", "role": "normative-title", "sourceLabel": "Title" }
          ],
          "rows": [
            {
              "rowKey": "entityId=<id>&sourceKey=<key>",
              "rowHash": "<64 hex>",
              "cellHashes": ["<64 hex>", "..."],
              "locator": { "line": 42, "row": 7 },
              "locators": [{ "line": 42, "row": 7 }],
              "disposition": "admitted | rejected | merged | deferred",
              "bindings": [
                {
                  "instructionId": "...",
                  "cells": [
                    {
                      "columnIndex": 3,
                      "columnHeader": "Description",
                      "cellHash": "<64 hex>",
                      "role": "normative-description",
                      "locator": { "line": 42, "row": 7, "column": 4 },
                      "locators": [{ "line": 42, "row": 7, "column": 4 }]
                    }
                  ],
                  "fidelity": {
                    "path": "...",
                    "sha256": "<64 hex>"
                  }
                }
              ],
              "resourceIds": [
                { "id": "...", "disposition": "rejected | deferred", "reason": "<required reason>" }
              ],
              "mergedInto": null,
              "reason": ""
            }
          ]
        }
      }
    }
  }
}
```

Column roles: `identity-entity-id`, `identity-source-key`, `normative-title`,
`normative-description`, `normative-direction`, `normative-exception`,
`normative-example`, `metadata-applicability`, `metadata-severity`,
`metadata-status`, `metadata-version`, `metadata-other`. Every column has
exactly one role; at most one column may carry each identity role. Bindings
reference `normative-*` cells only, and an admitted row must contain at least
one `normative-*` cell.

#### 6.2 CSV grammar

- strict UTF-8, no BOM; LF or CRLF accepted; a lone CR anywhere, including
  inside a quoted field, is rejected.
- comma delimiter; double-quote quoting; `""` escapes a quote; quoted fields may
  contain commas, LF and CRLF; unquoted fields must not contain comma, quote, CR
  or LF. Headers may not contain newlines.
- exactly one header record; empty header fields, empty header records and
  duplicate headers are rejected; header whitespace is significant.
- every data record has exactly the header count; one optional trailing line
  terminator is allowed; any additional empty record is invalid.
- formula-like and command-like values are inert data.
- validation limits: 16 MiB per file, 100,000 data rows, 512 columns, 1 MiB per
  cell. A larger input fails validation.
- path safety: donor-root-relative only; no absolute path, `.` or `..` segment,
  backslash or NUL; every path component must resolve inside the donor root;
  symlinks in any component are rejected.
- `rawSha256` is the SHA-256 of the raw CSV file bytes.

#### 6.3 Hash preimages and identity

All preimages are UTF-8; structural preimages are compact JSON
(`JSON.stringify`, no whitespace, no BOM). Hash function: SHA-256.

- `headersDigest` = hash of `JSON.stringify(headers)`.
- `cellHashes[i]` = hash of the raw parsed cell string as UTF-8 bytes, **not**
  JSON-quoted.
- `rowHash` = hash of `JSON.stringify([rowKey, headersDigest, cellHashes])`.
- `cells` = the ordered array of parsed cell strings for the row.
- fallback `cellsDigest` = hash of `JSON.stringify(cells)`.
- identity columns: `entityId` is the raw parsed value of the single column with
  role `identity-entity-id`; `sourceKey` is the raw parsed value of the single
  column with role `identity-source-key`. At most one column may carry each role.
- `rowKey`:
  - both `entityId` and `sourceKey`:
    `entityId=<enc>&sourceKey=<enc>`;
  - only `entityId`: `entityId=<enc>`;
  - only `sourceKey`: `sourceKey=<enc>`;
  - neither:
    `path=<encPath>&headers=<headersDigest>&cells=<cellsDigest>`.
- `enc` percent-encodes every byte outside the RFC 3986 unreserved set, using
  uppercase hex; non-ASCII characters are first encoded as UTF-8 bytes.
  `encPath` encodes each path segment and preserves `/` as the separator.
- after identical parsed-cell rows (same `headersDigest` and identical
  `cellHashes`) are collapsed, `rowKey` is unique within one CSV source. Two rows
  with the same identity but different cells are invalid (`invalid-schema`).
- `locators` are one-based physical lines and one-based logical data records;
  the header is record 0. Row `locators` list every physical line of the logical
  row and every collapsed duplicate occurrence, sorted by line ascending;
  `locator` is the first sorted locator.
- cell locators add a one-based `column`. A cell that spans quoted newlines
  carries `locators` for every physical line it occupies; `locator` is the first
  sorted locator. Duplicates are removed; equal-line entries sort by column.

#### 6.4 Row invariants

- header count equals every row width; a ragged row invalidates the CSV source.
- identical duplicate rows (same `headersDigest` and identical `cellHashes`)
  collapse into one logical row; its `locators` list every occurrence. `rowKey`
  is unique within one CSV source after this collapse, and the map contains
  exactly one row per key. Two rows with the same identity but different cells
  are invalid (`invalid-schema`).
- `merged` is for a row intentionally merged into an **admitted** target in the
  same CSV source. `mergedInto` is `{rowKey, locator}` of the target; the target
  must be non-merged and the topology acyclic with no self-reference.
- `admitted` needs at least one binding, at least one `normative-*` cell, and
  the union of binding cells must cover every `normative-*` cell; an unbound
  normative cell invalidates the row. Every admitted binding requires a fidelity
  receipt with `verdict: READY`.
- `merged` and `rejected` forbid bindings; `deferred` may have none. A deferred
  binding is evidence only and does not require a fidelity receipt.
- `merged` forbids `resourceIds` and a `reason`; the target aggregates the merged
  row's locators (sorted, deduplicated) and its bindings must cover the merged
  row's `normative-*` cells by column index and cell hash. The target's binding
  cells use the same `columnIndex` and an identical `cellHash`; their locators
  point to the target's own cells. Merged-row cell locators are not transferred;
  only the merged row's row-level locators are aggregated. A merged row must
  therefore be identical to its target in every `normative-*` cell.
- `reason` is required for `rejected` and `deferred`; a merged row needs a
  target, not a reason.
- `resourceIds`: an admitted, rejected or deferred row may carry only
  `rejected` or `deferred` entries, each with a reason; `materialized` is invalid
  until H3.
- every rejected or deferred `resourceIds` entry needs a non-empty reason.

#### 6.5 Allowlist and update tracking

`config/h2-csv-allowlist.json`:

```json
[
  {
    "donor": "uupm",
    "path": "path/to/uupm.csv",
    "rawSha256": "<64 hex>",
    "headersDigest": "<64 hex>"
  }
]
```

- paths are donor-root-relative and may not be `files` entries; they exist only
  in `csvSources`.
- duplicate entries, missing donors, hash mismatch or headers mismatch fail
  validation.
- `csvSources` absent means no CSV intake; an empty object is invalid.
- CSV raw files are tracked by `csvSources.rawSha256` and the allowlist, not by
  `source-baseline.files` (which remains the Markdown carrier baseline).
  `check-source-updates` verifies allowlisted CSV hashes against the pinned
  clone and reports `stale`/`missing` with affected instruction IDs; `vector.ts`
  counts CSV sources separately.

#### 6.6 Config shapes

`config/h2-applicability-vocab.json`:

```json
{
  "runtimes": ["node", "deno", "bun"],
  "platforms": ["web", "ios", "android", "desktop"],
  "accessibility": ["screen-reader", "reduced-motion", "high-contrast"]
}
```

`config/h2-applicability-aliases.json`:

```json
{
  "frameworks": { "reactjs": "react" },
  "standards": { "wcag2": "WCAG" }
}
```

The vocab tokens are lowercase and duplicate-free. Alias keys are lowercase;
alias targets keep their canonical case (`react`, `WCAG`), and standard targets
are uppercase. Aliases are one-hop, duplicate-free, acyclic and collision-free;
the catalog and `check-corpus` load both files and fail closed on an unknown
canonical target. The config owner is the catalog/schema implementer. The CSV
allowlist (`config/h2-csv-allowlist.json`) is written by the catalog/schema
implementer or the source owner only after the pinned donor gate and owner
approval; `check-corpus.ts` validates it read-only. The implementation file
allowlist is the Step H amendment described in §0, not a file the validator
writes.

### 7. Parser and fidelity

- strict UTF-8; BOM rejected; CRLF/LF accepted; CR-only rejected; quoted
  commas/newlines accepted; empty/duplicate headers rejected; formula-like and
  command-like values inert.
- `H2FidelityReceipt/v1`:

```json
{
  "schema": "H2FidelityReceipt/v1",
  "instructionId": "...",
  "source": {
    "donor": "...",
    "path": "...",
    "rowKey": "...",
    "cells": [
      {
        "columnIndex": 3,
        "cellHash": "<64 hex>",
        "locator": { "line": 42, "row": 7, "column": 4 },
        "locators": [{ "line": 42, "row": 7, "column": 4 }]
      }
    ]
  },
  "reviewer": { "kind": "human | delegated", "actor": "...", "model": "..." },
  "verdict": "READY | CHANGES",
  "evidence": { "path": "...", "sha256": "<64 hex>" },
  "recordedAt": "2026-11-05T00:00:00Z"
}
```

- every admitted binding requires a receipt with `verdict: READY`; the
  validator re-parses the pinned CSV and checks the instruction ID, cell hashes,
  locator and locator list.
- `bindings[].fidelity` in the corpus map is a reference (`path` + `sha256`) to
  an `H2FidelityReceipt/v1` artifact; the receipt is the authoritative shape.
- H2 semantic fidelity is human under SR-89 unless the owner records a separate
  decision extending D18 to H2. Until then, `reviewer.kind` must be `human` for
  H2 admission; `delegated` is shape-valid but fails the H2 validator rule.
- `reviewer.model` is required when `kind` is `delegated`; `recordedAt` is an
  ISO 8601 UTC timestamp.
- no translation, strengthening or weakening; units, negation, applicability,
  severity and exceptions are checked against the bound cells.

### 8. Refusal codes

Current four unchanged: `no-candidates`, `unknown-candidate`,
`candidate-not-allowed`, `invalid-format`.

`applicability-unresolved` is added only with H2 implementation under SR-20/AC-11.
The compose error uses the public `CatalogError` code
`CATALOG_REQUIRED_SELECTION_UNAVAILABLE`; `required-selection-unavailable` is
its prose name, not a refusal code.

### 9. Validator contract

The H2 validator is `check-corpus.ts`; it is v2-aware for instruction and map
markers and performs the checks below.

- enumerate Markdown carriers plus the exact CSV allowlist.
- re-parse every allowlisted CSV from the pinned bytes. Identical parsed-cell
  duplicate rows collapse into one logical row. Map rows must be unique by
  `rowKey`; a duplicate map row is invalid before set equality is checked. The
  set of parsed logical row identities must equal the set of
  `csvSources[path].rows[].rowKey`; every parsed occurrence's locator must appear
  in the matching map row's `locators`; every map row has exactly one terminal
  disposition.
- every `normative-*` cell is bound, or the row is `rejected`/`deferred` with a
  reason, or the row is `merged` and its target's bindings cover the same column
  indices and cell hashes. An unbound normative cell invalidates the row.
- every binding cell locator and `locators` entry resolves to a parsed cell in
  the **owning map row**, and every binding `cellHash` equals the re-parsed cell
  hash at that locator. A binding locator may not point into a merged row.
- recompute and compare `rawSha256` and `headersDigest` from the pinned bytes,
  `cellHashes` from the raw parsed cells, `cellsDigest` from the ordered parsed
  `cells`, and `rowHash` from `[rowKey, headersDigest, cellHashes]`. A mismatch
  fails validation even when the `rowKey` set matches.
- every map row has exactly one valid terminal disposition value.
- verify every row, bound cell, fidelity receipt and resource ID.
- fail closed on unknown markers, ragged rows, duplicate/empty headers, lone CR,
  malformed declared versions, path escapes/symlinks and oversized input.
- keep v1.2 fixtures green; preserve labels; no version tags.
- `check-corpus.ts` is the v2-aware validator; `source-updates.ts`,
  `check-source-updates.ts`, `vector.ts`, `donor-updates.ts`, `audit.ts` and
  `audit-report.ts` reject `VPCorpusMap/v2` and `csvSources` until each is
  v2-aware.

### 10. Test matrix

1. v1.2 fixture parses, classifies and retrieves.
2. v2 applicability double-quoted scalar survives `parseFrontmatter` ->
   `JSON.parse` -> v2 schema; single-quoted, unquoted flow, multi-line and
   control-character values are rejected.
3. Exact marker dispatch: v1.2 and v2 instruction markers accepted; v1/v1.1 and
   unknown rejected; `VPCorpusMap/v1` and v2 map dispatch; `check-corpus`
   validates v2; audit/vector/source-updates/donor-updates fail closed on map
   v2/`csvSources`.
4. Inclusive/exclusive version boundary.
5. Malformed, reversed, empty, wildcard/caret, `^0`/`~0`, overlap/duplicate and
   numeric-bound versions.
6. `^`, `~`, wildcard, optional `v` and comparator-spacing normalization; `||`,
   `1`, `1.2` and prerelease rejected.
7. Applicability: applicable, inapplicable, unknown, conflicting, missing
   required, absent context, partial context, empty supplied array, exhaustive
   supplied dimension, optional-only.
8. Mixed unresolved + inapplicable precedence; optional-context neutrality;
   conformance present/omitted/mismatched; supplied framework without version
   against a ranged declaration.
9. Token grammar: legal dimensions, standard token, illegal prefix, empty value,
   extra colon, unknown vocabulary, malformed declared token.
10. Compose optional filtering, required blocking, dependency blocking, counts,
    `CATALOG_REQUIRED_SELECTION_UNAVAILABLE`; post-substitution check.
11. `decision.evaluate` order and diagnostics scope; unknown-tag placement.
12. CSV grammar: quoted comma/newline, lone CR, duplicate/empty headers, BOM,
    formula inert, ragged, trailing-newline and oversized.
13. Coverage bijection: missing parsed row, extra map row, duplicate map row,
    collapsed duplicate occurrence, uncovered `normative-*` cell, unbound
    binding.
14. Row reorder stable; cell edit changes `rowHash`; line-only change stable;
    fallback `rowKey` with `cells`.
15. Identical parsed-cell duplicate collapse; merged target coverage and locator
    aggregation; same identity with different cells rejected.
16. Allowlist missing/unknown/hash/headers mismatch, path traversal, `.`/`..`,
    symlink and non-ASCII path.
17. Fidelity receipt schema, human-authority invariant, explicit cell locator,
    missing/stale receipt.
18. Source labels preserved; no version tags.
19. Fifth refusal absent now, only with future flag/fixture; future
    `applicability-unresolved` materialization.
20. For a v1.2-only corpus, search/get/compose output is unchanged without
    context. For a corpus with v2 instructions, applicability is evaluated
    unconditionally; search annotates and does not filter; v2 rows without
    context annotate `unresolved`; compose filters optional and blocks required.
21. `VPCatalog/v1` unchanged; no sixth methodology group.
22. Map consumers reject v2/`csvSources` until v2-aware.
23. CSV update tracking reports stale/missing allowlisted CSV.
24. H2 `resourceIds` rejects `materialized`; admitted rows allow only
    rejected/deferred entries with reasons.
25. Instruction v2 emission only for non-neutral applicability; neutral
    instructions stay v1.2.
26. Map producer emits `VPCorpusMap/v1` without CSV intake and
    `VPCorpusMap/v2` with it; no `VPCorpusMap/v1.2`.
27. Map consumers reject v2/`csvSources` until v2-aware; `check-corpus` validates
    v2 maps.
28. A quoted-newline cell exposes every physical line in its `locators`; the
    receipt carries the same locator list.
29. At most one `identity-entity-id` and one `identity-source-key` column; a
    second role column fails validation.
30. Alias keys lowercase, one-hop resolution, collision/cycle rejection; a
    canonical target is preserved.
31. A supplied framework without a version against a ranged declaration yields
    `required-context-missing`, not `unknown-context`.
32. An empty supplied context array is a request-level `invalid-format` on every
    context-carrying surface.
33. Compose dependency chain: an optional root's omitted dependency is pruned; a
    required root's inapplicable dependency fails with
    `CATALOG_REQUIRED_SELECTION_UNAVAILABLE`.
34. Every column has exactly one role; bindings reference `normative-*` cells
    only; an admitted row with no `normative-*` cell fails.
35. Standard `id`+`version` match by exact normalized equality; a
    conformance-less declaration ignores supplied conformance.
36. Every admitted binding's `cellHash` equals the re-parsed cell hash.
37. CLI `get` uses the exact-ID path and returns an inapplicable/unresolved row
    without error; CLI `compose` blocks required selections.
38. Map row `rowKey` uniqueness is checked before set equality; a duplicate map
    row fails.
39. A Markdown-carried instruction with non-neutral applicability emits
    `VPInstruction/v2` through the H2 applicability pipeline; `convert.ts`
    alone keeps v1.2.
40. A `compatibility.requires` dependency of an optional root is required and
    fails when inapplicable; a dual-parent dependency reachable from a required
    root is required.
41. CLI `get` accepts repeatable `--id`, does not require `--profile`, returns
    one row plus applicability per ID, and does not emit a composed bundle.
42. The validator recomputes `rawSha256`, `headersDigest`, `cellHashes`,
    `cellsDigest` and `rowHash`; a corrupted identity-keyed row fails.

### 11. Open owner decisions

1. Approve this revised H2 contract and plan, not the already-admitted families.
2. Choose the CSV row selection policy: bounded reviewed subset with every row
   disposed, or all 1,434 measured UUPM rows with every row disposed.
3. Materialize `applicability-unresolved` in the H2 implementation; the four
   current codes stay unchanged. Deferring it would require an owner change to
   H2 scope and acceptance, because SR-82 and the H2 acceptance criteria place
   it in H2.
4. Approve `config/h2-csv-allowlist.json`,
   `config/h2-applicability-aliases.json` and
   `config/h2-applicability-vocab.json` after their shapes are reviewed.
5. Confirm the CSV donor gate: add the CSV donor to `donors.yaml` with
   pin/license/attribution before parsing.
6. Confirm H2 fidelity authority: keep SR-89 human fidelity, or explicitly
   extend D18 to H2.
7. Confirm the accepted marker set and the instruction-v2 emission rule:
   v1.2 current, v2 only for non-neutral applicability, v1/v1.1 historical
   fixtures only.
8. Confirm CSV update tracking: `csvSources.rawSha256` plus allowlist checks,
   not the Markdown `source-baseline.files`.
9. Confirm the proposed expanded H2 implementation allowlist in §0, including
   the audit tools, `schema.ts`, the three `config/h2-*.json` artifacts and the
   v2/CSV fail-closed rule. Approval records the Step H amendment.

The contract was approved on 2026-11-05; implementation is authorized within its
scope.
