---
type: Design Document
title: Vida Powers — instruction catalog design
description: 'How the Vida Powers instruction catalog is structured: package structure, instruction format, catalog operations, interaction with the methodology profile, validation, tests and packaging.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- catalog
- design
- instruction-corpus
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — system specification
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers — business requirements
- id: decisions
  resource: /decisions/index.md
  title: Accepted decisions D1–D11
- id: next-actions
  resource: /next-actions.md
  title: Vida Powers — next actions within packages/powers
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
revision: '7'
---

# 1. Why and for whom

The catalog is the **single place where the working rules live** for VP agents: one
instruction = one atomic norm (what and how to do in one aspect: testing,
acceptance, research, review…). The catalog serves three roles:

- **The `vp-mode` skill** (LLM) — reads the catalog through operations, forms a bundle for
  the task and selects among the candidates itself.
- **The agent** — receives the already selected instruction texts and works by them.
- **The product owner** — edits instructions, maintains the tag vocabulary and aliases, defines
  compatibility and provenance.

The goal: **one canonical owner per rule**. Two agents act by the same rules
from the catalog; a change of a rule in one place changes it for everyone.

# 2. Goals, non-goals, anti-goals

**Goals (v1)**

- One instruction = one `.md` file with metadata; a flat directory, no directories per
  donor.
- Search and selection are deterministic: tags + the effective methodological profile.
- The operations `catalog.tags / search / get / compose` are available from any runtime
  without dependencies and without a build.
- Provenance, license and revision — in the instruction metadata.
- Metadata are read in the same way as donor `SKILL.md` (frontmatter),
  but extended with VP dimensions.

**Non-goals (v1)**

- Semantic (LLM) search: `catalog.ts` returns a deterministic shortlist, the choice is
  made by the skill. Semantic evaluation — later, as the `decision.evaluate` protocol (D5).
- Project overlays: the catalog is **strictly canonical**; a project only selects a profile and
  mandatory IDs. The project layer is a deferred decision (CAT-D1).
- A derived search index: the script scans `instructions/` and keeps the map in
  memory. An index will appear only on the basis of measurement.
- Multilingualism: v1 — the product language.
- Building the corpus from donors (step D) is separate work; this design defines only
  the **format** that the converter must write.

**Anti-goals (what would make the product unsuitable)**

- A catalog without provenance: an instruction without `provenance_*` is not accepted.
- A catalog with its own runtime, dependencies or a build.
- A catalog that resolves group conflicts itself: the choice of an alternative is made by the profile, not
  by search (otherwise a search for "testing" would always fail).
- A second catalog: duplicates are forbidden (SR-65).

# 3. Constraints

| Constraint | Source | Consequence |
|---|---|---|
| The project runtime is Bun; there is no own infrastructure in the plugin | NFR-01, D9 | One `package.json`/`bunfig`/`tsconfig` in the package |
| Shipped code — without a build for Bun/Node/Deno | NFR-02, SR-63 | Only `node:` modules; `import type`; no `enum`/`namespace`/parameter properties; paths from `import.meta.url` |
| Machine formats — JSON | NFR-03, SR-62 | The data read by **shipped** code — JSON. The exception is the instruction format itself: `.md` with frontmatter of a limited YAML subset (the product's own format, §5). Dev tools may read product YAML manifests (`donors.yaml`) — SR-64 |
| The catalog has no LLM client | D5, NFR-01 | The script returns a shortlist; the choice is made by the skill |
| An instruction has two forms: document (source) + registry entry (derived) | SR-34, SR-35 | In v1 — only the document; the registry entry appears at stage E |
| The boundaries of the system registry are not the VP model | SR-36 | Extending the registry is a runtime request, not part of this design |
| Group conflicts are resolved by the profile | SR-25…SR-28 | `compose` accepts the effective profile; without it a conflict is an error |
| Canonicality of the catalog | BR-23, D9 | Project instructions are not supported in v1 |
| The plugin has no own LLM user | NFR-01 | An external provider is a host capability, not a VP obligation |

# 4. Package structure

```text
packages/powers/
  skills/
    vp-mode/
      SKILL.md                    ← the main orchestration skill (host convention)
      scripts/
        schema.ts                 ← validator of a limited JSON Schema subset
        frontmatter.ts            ← parser of a limited YAML subset
        catalog.ts                ← operations tags/search/get/compose (+ CLI)
    vp-setup/
      SKILL.md                    ← auxiliary setup skill
      scripts/
        setup.ts
  instructions/                   ← canonical instructions: flat, .md + metadata
    test-first-development.md
    define-acceptance-criteria.md
    …
  scripts/                        ← product support tools (as with the donors)
    check-okf.ts                  ← already exists (moved from tooling/)
    check-corpus.ts               ← corpus validation
    validate-donors.ts            ← moved from .tmp
    convert.ts                    ← donor converter (step D)
  config/
    vpcatalog.v1.schema.json      ← schema of catalog.json
    vpcorpusmap.v1.schema.json     ← schema of the processing map (SR-66)
    vpinstruction.v1.schema.json   ← schema of the instruction frontmatter (§5)
    vpeffectiveprofile.v1.schema.json ← schema of the effective profile for compose
  docs/                           ← OKF bundle (this design is part of the bundle)
  tests/
    catalog.test.ts  frontmatter.test.ts  check-corpus.test.ts  catalog-cli.test.ts
    fixtures/{valid,invalid-tag,missing-provenance,conflicting}/
  catalog.json                    ← catalog identity + tag vocabulary + aliases
  corpus-map.json                 ← processing map: donor + file → converted/split/merged/rejected
  package.json  bunfig.toml  tsconfig.json  .bun-version
```

**Rules**

- An instruction: `instructions/<instruction_id>.md`; `instruction_id` — kebab-case,
  stable, not reused; the `instruction_id` in the frontmatter equals
  the file name (the validator checks this). The file name has no dates, statuses or `final-v2`.
- **The content version — only in metadata:** `revision` in the frontmatter; the change history — in the
  bundle log `docs/log.md`. The file name has no versions, dates or statuses.
  The exception is schema names (`config/*.v1.schema.json`): there the format version is in the
  name itself, by the repository convention.
- Skill scripts — in `skills/<skill>/scripts/`; product support tooling — in
  `scripts/` at the root of the package (like `scripts/` in superpowers).
- Per-host manifests (`.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`) —
  stage E; **the plugin root = the package root**, i.e. the payload = `skills/` +
  `instructions/` + `catalog.json` (+ `config/` for dev tools). The operations
  find the catalog without a separate installation.
- The `include` of `tsconfig.json` must cover `scripts/**/*.ts`, `skills/**/*.ts`,
  `tests/**/*.ts` — otherwise typecheck silently stops checking
  new code.
- In the knip config (`packages/agent/knip.config.ts`, owner exception D9 rev 2)
  the entry patterns of the `packages/powers` workspace: `scripts/*.ts` and `skills/*/scripts/*.ts`.
  The second pattern was added at step C — together with the appearance of the first skill script
  (without it knip does not see `skills/` and gives a config hint).
# 5. Instruction format

A `.md` file with frontmatter. Values are **flat scalars** and **YAML blocks** for
lists; there are no nested maps (a parser without dependencies). The field names are canonical from
the S-document; every composite field of the S-document has a flat prefix.

**The YAML subset in the frontmatter.** Boundaries:

- `key: value` — a scalar, double quotes or an empty value (`key:` → `''`);
- a block list — lines `- item` with a two-space indent;
- **an empty list — only `key: []`** (the single allowed flow literal); any other
  flow (`[a, b]`, `{...}`) is an error;
- values containing `:` are taken **in double quotes** (an unescaped `:` in a
  value is an error);
- `=`, `;`, `#` in a value are literals (a comment is only a line whose first
  non-space character is `#`);
- not supported (an error rather than a silent interpretation): nested maps, multiline
  blocks (`|`, `>`), anchors/aliases, YAML tags, a list within a list, a duplicate key.

```markdown
---
instruction_id: test-first-development
title: Test-first development
summary: Write a test before the implementation so that the behavior can be verified before it appears.
capability_tags:
  - write-tests-first
  - design-test-cases
pattern_tags:
  - test-first-development
conditions_applies_when: the change adds new or changes existing behavior.
conditions_does_not_apply_when: the change touches only documentation or comments.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - test cases
  - expected results
artifact_contract_verified_by: bun test
compatibility_excludes:
  - test-after-development
compatibility_requires:
  - define-acceptance-criteria
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=workflows/.../test-driven.md
status: active
revision: 1
---

# Test-first development

<normative text: 20–80 lines, imperative, self-contained>
```

**Correspondence of S-document fields**

| S-document field | Frontmatter key |
|---|---|
| `instruction_id` | `instruction_id` |
| `title`, `summary` | `title`, `summary` |
| `capability_tags`, `pattern_tags` | `capability_tags`, `pattern_tags` |
| `conditions.applies_when` / `.does_not_apply_when` | `conditions_applies_when` / `conditions_does_not_apply_when` |
| `artifact_contract.output_type` / `.required_data` / `.verified_by` | `artifact_contract_output_type` / `_required_data` / `_verified_by` |
| `compatibility.excludes` / `.requires` | `compatibility_excludes` / `compatibility_requires` |
| `provenance` (source: donor, license, source_revision, source_path) | `provenance[]` — a list of lines `donor=…; license=…; revision=…; path=…` |
| `roles` / `products` (optional; search filters, SR-10/SR-70) | `roles` / `products` |
| `status`, `revision` | `status`, `revision` |

**Validation rules**

| Rule | Violation |
|---|---|
| `instruction_id` = file name, kebab-case, unique | `CATALOG_INVALID` |
| `title`, `summary` — non-empty strings | `CATALOG_INVALID` |
| `capability_tags` ≥ 1; every tag is kebab-case with ≥2 meaningful components; present in the vocabulary | `CATALOG_INVALID` / `CATALOG_TAG_UNKNOWN` |
| `pattern_tags` ≥ 1; the same rules | `CATALOG_INVALID` / `CATALOG_TAG_UNKNOWN` |
| `conditions_*` — non-empty strings | `CATALOG_INVALID` |
| `artifact_contract_*` — for instructions that produce a result, `output_type` and `verified_by` are non-empty; for guidance — `output_type` = `none`, `required_data` empty | `CATALOG_INVALID` |
| `compatibility_excludes`/`_requires` — known `instruction_id`s; `requires` does not contain itself | `CATALOG_DEPENDENCY_MISSING` / `CATALOG_INVALID` |
| `provenance` — a list of at least one source; each — a line `donor=…; license=…; revision=…; path=…`: `donor` ∈ `donors.yaml`, `license` matches the manifest, `revision` **equals** `donors.yaml[donor].head_sha`; the same source twice is not accepted | `CATALOG_INVALID` |
| `status` ∈ `active` \| `disabled`; `revision` — an integer ≥1 | `CATALOG_INVALID` |
| `roles`, `products` — optional; each — kebab-case; absence or an empty list = "applicable to any role/product" | `CATALOG_INVALID` |
| An exception to the tag rule — only through `catalog.json` → `tag_exemptions[]` (`instruction_id`, `dimension`, `reason`) | `CATALOG_INVALID` |

The body of an instruction is normative text; without duplicating research (research is the concept,
the instruction is the norm). It is the **donor's original text** for that norm — not a translation
and not a paraphrase (D11); only cutting, merging duplicated sentences, neutralising donor names
and paths, moving the trigger into `conditions_*`, and adding a completion criterion the donor
itself states are allowed.

## 5a. Formation of instructions (step D)

**Principle: the script never writes normative text.** Semantics (selection,
segmentation, tagging, merging) — the agent's work; mechanics (inventory,
render, provenance, validation) — the script's work. The converter is an agent procedure with a
script backbone, not a "magic script".

| Phase | Who | What it does | Artifact |
|---|---|---|---|
| 1. Inventory | script | traverses the donor clone, lists carrier files: path, size, frontmatter, headings | `inventory/<donor>.json` |
| 2. Candidate selection | agent | filters out what is not methodology (changelog, docs, infrastructure) | `corpus-map.json` (`rejected` entries with reasons) |
| 3. Segmentation | agent | one donor skill contains several norms — splits it into atomic instructions | instruction specifications (JSON) |
| 4. Render + provenance | `convert.ts` script | generates `.md` from the specification and **sets the sources** (donor, license, SHA, path) | `instructions/<id>.md` |
| 5. Merging duplicates | agent | one norm = one instruction with all sources | instruction + `provenance[]` |
| 6. Validation and review | script + owner | `check-corpus.ts` → sample for review → approval of the vocabulary and groups | coverage report |

**Merging duplicates (phase 5).** Semantically identical norms from different donors do not
remain as separate instructions:

- One norm is present in the corpus **exactly once**; its sources are in `provenance[]`.
- The wording is merged: the **better terminology** is taken from the set of sources, and
  the terms are reduced to the controlled vocabulary (tags, profile groups, our field
  names). Donor wordings are preserved only where they carry meaning and
  not mere vocabulary.
- A change of the text or the addition of a source raises the instruction's `revision`; the event
  is recorded in the bundle log.
- A source of one donor can substantiate several instructions (segmentation) — this is
  normal; only duplication of the norm itself is forbidden.

**Opposing norms are declared, not narrowed (D12).** The rule above is about the **same**
norm stated twice. Two norms that state **opposite** rules about the same thing are not
merged and not narrowed: the pair is **declared** — each instruction names the other in
`compatibility_excludes`, the pair carries **one shared pattern tag** (the theme they
disagree on), and the catalogue reports the pair by name when both would enter one bundle
(SR-14, §7 rule 5). Where the user makes the choice, the two sides are the alternatives of
one profile group (D10). The texts of the pair stay as their donors stated them (D11 §2).

**Processing map (artifact of phases 2–5).** `packages/powers/corpus-map.json`
(`VPCorpusMap/v1`) — a bridge between the donors and the corpus: for every donor (with a
pinned revision) and every carrier file — the processing result.

| Status | Meaning |
|---|---|
| `converted` | the file produced exactly one instruction |
| `split` | the file was split into several atomic instructions |
| `merged` | the norm was merged into another instruction (in `contributed_sources` — the contributing sources) |
| `rejected` | the file was filtered out as non-methodology, with a `reason` |

Map properties: the key is donor + revision + path, so a repeated run on the same
revision changes nothing (conversion is idempotent), and a change of the donor revision
is visible in the map; rejections are recorded **in the map**, not in a separate report;
every instruction of the corpus has an entry in the map, and every map entry points to an existing
instruction — otherwise a validation error. The inventory (phase 1) stays in `.tmp`:
it is deterministic from the pinned clone and reproducible.

**Volume of candidates (measured in the clones from `donors.yaml`)**

| Donor | `.md` | SKILL.md | Comment |
|---|---|---|---|
| superpowers | 65 | 15 | + 45 additional `.md` in the skills |
| ponytail | 60 | 12 | MVP pair |
| BMAD | 327 | — | workflows/agents |
| matt-skills | 132 | — | |
| addy-skills | 113 | — | |
| pstack (in cursor/plugins) | 430 | — | our donor is only the `pstack/` subdirectory (169 tracked files — this is `content_file_count` in `donors.yaml`; 430 — the whole monorepo) |
| GSD | 1815 | — | mostly docs, not methodology |

MVP = superpowers + ponytail: ≈ 125 candidate files → roughly 25–40
instructions; the final number is set by the exit criteria of step D.

**What is not transferred** (research §4.1): execution engines, tracker integrations,
donor state journals. Filtering happens at phase 2, and every rejection is recorded with a
reason in the selection report.
# 6. Format of `catalog.json`

```json
{
  "schema": "VPCatalog/v1",
  "catalog_id": "vida-powers",
  "revision": 1,
  "source_revision": "<git commit of the corpus>",
  "updated_at": "2026-10-19T00:00:00Z",
  "tag_dictionary": {
    "capability": { "write-tests-first": "…" },
    "pattern": { "test-first-development": "…" }
  },
  "tag_aliases": { "tdd": "test-first-development" },
  "tag_exemptions": [
    { "instruction_id": "…", "dimension": "capability", "reason": "…" }
  ],
  "instructions": [
    { "instruction_id": "test-first-development", "path": "instructions/test-first-development.md", "sha256": "…" }
  ]
}
```

- `catalog.json` is the single machine file of the catalog: identity + tag vocabulary +
  aliases + exceptions + the list of instructions with `sha256`.
- **Who writes `catalog.json`:** the list of instructions (and `sha256`) — **only**
  `scripts/convert.ts` (CAT-D3, SR-76); runtime scripts only read. Initialization of the
  file is **owner content**: the agent creates `catalog.json` with the identity and the
  approved vocabulary (an empty vocabulary is not accepted by the converter), and then
  the converter maintains only the list of instructions and does not change the vocabulary, aliases or exceptions.
- A tag description is mandatory: a tag without a description → an error (SR-05).
- `tag_aliases` — the direction **"alias → canonical"** (`{ "tdd": "test-first-development" }`); search reduces an alias to the canonical tag, `catalog.tags` shows the canonical tags and their aliases.
- `tag_exemptions` — the single mechanism for recording exemptions.

**How the tag vocabulary is fixed.** `catalog.json` is
the single place of the vocabulary: `tag_dictionary` (tag → description), `tag_aliases`
(in `tag_aliases` the direction is **"alias → canonical"**), `tag_exemptions`. The process is batched, without re-asking for
every tag:

1. During formation the agent collects the needed tags but does **not** add them to the vocabulary.
2. At the end of processing a donor (or the whole phase) the agent issues a **package proposal**:
   a new tag + one sentence of description + where it is used.
3. The owner approves the package **in a single pass**; the tags enter `catalog.json`.
4. Then the instructions that use them are converted; the validator requires that
   every used tag has a description.

**Tags are added as processing proceeds** (owner decision, 2026-10-20): the vocabulary
is not approved all at once for the whole corpus — batch approval happens at
the completion of processing each donor or phase. The seed corpus (superpowers + ponytail):
12 capability tags, 11 pattern tags, 1 alias — approved in a single pass
on 2026-10-20. Subsequent donors produce their own packages.

**Before the package proposal — the mapping pass** (owner decision, 2026-10-20):
every proposed tag is first compared with the vocabulary that already exists.
A proposal that an existing tag already covers is **folded into that tag** and
does not enter the package: the same word must not name two things, and the
catalog search must not have to know which of two synonyms was meant. Only the
proposals that the existing vocabulary does not cover are put to the owner.
In the donor `addy-skills` this reduced 134 proposals to 71 (24 capability +
47 pattern); 63 found an existing counterpart.

The vocabulary is also the **terminology authority for merging**: the terms of a merged
instruction are taken from the vocabulary; a new term enters the batch proposal rather than
being introduced "as it comes out". Groups and the active alternative are not in the vocabulary but in the methodological
profile (the profile owns the groups; the vocabulary owns the tag values).

# 7. Operations

Pure functions over the catalog + a CLI wrapper. Output — **JSON on stdout**; an error —
JSON on stderr (`{code, message, details}`) and a non-zero exit code. The script knows nothing about
the LLM, hosts and the repository; it finds the catalog **from its own file** (`import.meta.url`),
with an override `--catalog <path>` (tests, alternative layouts).

| Operation | Input | Output | Errors |
|---|---|---|---|
| `catalog.tags` | — | `{capability:[{tag,description,aliases[]}], pattern:[…]}` | `CATALOG_INVALID` |
| `catalog.search` | `capability[]`, `pattern[]`, `instruction_ids[]`, `roles[]`, `products[]`, `conditions[]` | `{results:[{instruction_id,title,summary,capability_tags,pattern_tags,revision}]}` — **without `content`** | `CATALOG_INVALID` |
| `catalog.get` | `instruction_id` | `{instruction:{…all fields…}}` | `CATALOG_ID_UNKNOWN`, `CATALOG_INSTRUCTION_DISABLED` |
| `catalog.compose` | `capability[]`, `pattern[]`, `instruction_ids[]`, `roles[]`, `products[]`, `conditions[]`, `required_ids[]`, `profile` | `{instructions:[{instruction_id,title,summary,content,artifact_contract,selection_reason}]}` + execution context (SR-23) | `CATALOG_INVALID`, `CATALOG_ID_UNKNOWN`, `CATALOG_INSTRUCTION_DISABLED`, `CATALOG_REQUIRED_CONFLICT`, `CATALOG_PROFILE_CONFLICT`, `CATALOG_DEPENDENCY_MISSING`, `CATALOG_DEPENDENCY_DISABLED` |

**Search semantics** (SR-10, SR-70)

- Within one dimension — "at least one" match; between dimensions — "and".
- If only one dimension is set, the other is not applied.
- Aliases are reduced to canonical tags **before** matching.
- `status: disabled` does not enter the result.
- `tag_exemptions` do not affect search (they are validation exceptions).
- `instruction_ids` — a conjunction: the result is limited to these IDs.
- `roles` / `products` — an instruction matches if its list is empty (or the key
  is absent — then the instruction is applicable to any role/product) or contains at least
  one match with the request.
- `conditions` — a conjunction of tokens: every request token must be present in
  `conditions_applies_when` and **absent** from `conditions_does_not_apply_when`
  (case-insensitive match, Unicode word boundaries; a token matches literally,
  including trailing punctuation). An empty token is a request validation error.
- A dimension is considered **set** only if its array is present and non-empty;
  an empty array = the dimension is not applied. A request without any dimension returns
  the whole active corpus (`catalog.search` is a browsing operation); `catalog.compose`
  without dimensions does not pull the corpus (see the `compose` rules).
- Output — **only metadata** (AC-05): `instruction_id`, `title`, `summary`,
  `capability_tags`, `pattern_tags`, `revision`; without `content`. The order is stable
  (by `instruction_id`).

**Effective profile** — JSON that the host passes:

```json
{
  "schema": "VPEffectiveProfile/v1",
  "groups": {
    "testing-sequence": { "active": "test-first-development", "alternatives": ["test-first-development", "test-after-development"] }
  }
}
```

The active alternative is a **pattern tag** (a methodology), not an `instruction_id`; this way
groups remain about methodologies (SR-26), and an instruction is bound to them by its own
`pattern_tags`. **Every alternative has its own pattern tag**: the shared tag of the group
(e.g. `approval-policy`) is a marker for search, not an alternative; otherwise two
alternatives of one group would not differ from each other. Groups with product policy
have an **explicitly declared** active alternative in the source profile
(`default`); for groups where the user makes the choice, `default` is forbidden (D10). Inheritance resolution
and override are outside `compose` (Stage 4);
`compose` accepts an already resolved effective profile and remains a pure function.

**`compose` rules**

1. `required_ids` are included **always**, even if they do not match the tags (SR-13).
2. Tag matches → `selection_reason: "matched"`. The matching phase is performed **only**
   when the request contains at least one non-empty selection dimension (`capability_tags`,
   `pattern_tags`, `instruction_ids`, `roles`, `products`, `conditions`); a request without
   dimensions does not pull the whole corpus (compose with only `required_ids` returns
   the required instructions and their dependencies).
3. Transitive `compatibility_requires` → `"dependency"`; an unknown or disabled
   dependency → an error. A dependency **never disappears silently**: if the profile
   rejects a dependency — an error (clause 4d).
4. **Groups are resolved by the profile:** if a group has an active alternative, instructions with
   other `pattern_tags` of this group do not enter the bundle. An error only when:
   (a) the profile itself is contradictory (the active alternative is not among the list of
   alternatives of the group);
   (b) `required_ids` contradicts the active alternative;
   (c) two instructions from different groups have a direct `compatibility_excludes` against
   each other;
   (d) a **dependency** on an inactive alternative of a group is closed by the **active**
   alternative of that group (the group is one choice); the dependency is not discarded
   silently and does not return the inactive alternative to the bundle.
   Order of application: required → matches → profile filter (only for matches) →
   dependency closure → `excludes` check.
5. Without a profile: any pair with `compatibility_excludes` → an error (SR-14).
   A pair declared as **opposing** (D12) — the two instructions name each other and
   share one theme pattern tag — is reported with both names; where the pair is the
   alternatives of one profile group, the active alternative enters the bundle and the
   other does not (§4d).
6. The output order is stable (by `instruction_id`).

**Semantics of `decision.evaluate` (D5).** In v1 the operation is implemented **deterministically**:
`decision.evaluate` accepts already allowed candidates and returns a shortlist or a refusal
reason (no candidates, unknown candidate ID, candidate outside the allowed ones,
incorrect format). Semantic evaluation is done by the `vp-mode` skill; an external
provider is a host capability, not a VP obligation. The D5/SR-16…SR-21 contract preserves
all fields (the source of the decision, the selected IDs, the reason for the fallback).

Deterministic rules of v1:

| Condition | Result |
|---|---|
| an invalid request (operation, candidates, tags, product, context) | `fallback: true`, `invalid-format`, `provider: 'agent'` |
| an empty candidate list | `fallback: true`, `no-candidates` |
| a candidate absent from the catalog | `fallback: true`, `unknown-candidate` |
| a candidate disabled (not in the allowed set) | `fallback: true`, `candidate-not-allowed` |
| all candidates allowed | shortlist by tags, `provider: 'catalog'`, `fallback: false` |

- `tags` — a flat list; a tag matches a candidate in **any** dimension
  (alias → canonical); a candidate passes when at least one requested tag matched.
- `score` — the number of requested tags matched against the best candidate; the scale
  is **not calibrated** (the relevance threshold is not applied — SR-21), and this is
  recorded in `rationale`.
- No candidate matched — this is **not** a refusal: `selected: []`, `provider:
  'catalog'`, `fallback: false`, `score: 0`.
# 8. Usage flow

```text
Standalone:
  user → vp-mode skill (LLM)
      → skills/vp-mode/scripts/catalog.ts search/compose → shortlist + texts
      → the skill selects/refines → bundle → execution → materialization

Bundled (stage E):
  agent → extended instruction registry of the agent package (derived projection)
      → the same instructions from instructions/
```

The same set of instructions serves both modes; the difference is in the way
the instructions are delivered to the executor.

# 9. Validation and integrity

- `check-corpus.ts` (a dev tool in `scripts/`): checks all rules of §5, the vocabulary
  and aliases, ID uniqueness, `requires`/`excludes` against unknown IDs, the consistency of
  `provenance_license` with `donors.yaml` (YAML is read by a dev tool — SR-64;
  there is no JSON duplicate, one owner). Output — lines "file: rule" or JSON, a non-zero
  exit.
- The processing map and the corpus are consistent: an instruction without an entry in `corpus-map.json` →
  an error; a map entry pointing to a non-existent instruction → an error; `rejected` without a reason →
  an error.
- The `source_revision` of the catalog vs the actual state of the instructions is **not** a blocker in v1:
- **Corpus integrity** is already checked in v1: `catalog.json` is the single corpus listing
  with the `sha256` of every instruction (CAT-D3, SR-76, AC-42); a file outside the manifest, an entry without a
  file and a mismatched digest are errors. The digest of the **package** in the agent package (stage E) is a separate question.
- Validation is performed before committing changes to `instructions/` (a manual command or
  a hook — at the owner's discretion).

# 10. Tests and gates

Commands: `bun run --cwd packages/powers test` (fast cycle), `test:coverage`
(`bun test --coverage`, coverage threshold 1.0 from `bunfig.toml`), `typecheck`.

| Test | What it checks |
|---|---|
| `frontmatter.test.ts` | the parser: scalars, YAML blocks, comments, empty values, non-ASCII, format errors |
| `catalog.test.ts` | the rules of §5; search does not return `content`; alias → canonical tag; `get` on an unknown/disabled ID; compose: required + dependencies + a conflict without a profile + rejection of an inactive alternative by the profile + a direct `excludes` + output order; `disabled` is not in search |
| `check-corpus.test.ts` | `check-corpus` on fixtures: unknown tag, missing provenance, unknown `requires`, duplicate ID, incompatible license, an instruction without a map entry, a map entry pointing to a missing instruction |
| `catalog-cli.test.ts` | CLI: JSON on stdout, a code on stderr, a non-zero exit, catalog lookup relative to the file |
| `catalog-manifest.test.ts` | the `catalog.json` manifest ↔ disk: a file outside the manifest, an entry without a file, a mismatched `sha256` (AC-42) |

Fixtures — minimal catalogs: `valid/`, `invalid-tag/`, `missing-provenance/`,
`conflicting/`.

# 11. Commands

```sh
bun run --cwd packages/powers test                              # fast cycle
bun run --cwd packages/powers test:coverage                     # coverage (threshold 1.0)
bun run --cwd packages/powers typecheck                         # type checking
bun packages/powers/scripts/check-corpus.ts                     # corpus validation
bun packages/powers/scripts/check-okf.ts                        # OKF compatibility of the bundle
bun packages/powers/skills/vp-mode/scripts/catalog.ts tags     # manual check of the operations
bun run --cwd packages/agent lint:knip:pinned                   # repository lint gate
```

# 12. Accepted decisions (and by whom)

**Writer discipline.** `convert.ts` is the **single** writer for `instructions/`, `catalog.json` and
`corpus-map.json`; runtime scripts only read. `catalog.json` holds the corpus listing
with the `sha256` of every instruction (CAT-D3); the validator checks the map, the disk and
the digest.

| Decision | Who | Alternatives rejected |
|---|---|---|
| An instruction = `.md` + metadata, a flat directory | **owner** | JSON files; directories per donor |
| The sources of an instruction — a list; merging duplicates with better terminology | **owner** | "canonical + discarded" |
| Encoding of the source list — scalars `donor=…; license=…; revision=…; path=…` | **owner (a)** | a list of maps; a compact string |
| The formation pipeline (phases 1–6) — in the design | **owner** | only in the step D plan |
| The processing map `corpus-map.json` (donor+revision+file → converted/split/merged/rejected) | **owner** | a report in README without a state file |
| `catalog.json` — the single corpus listing with `sha256` (CAT-D3) | **owner** | digest only at stage E |
| The tag vocabulary — batch approval by the owner | **owner** | per-item confirmation; no confirmation needed |
| The proposed tags are mapped onto the existing vocabulary before the package proposal (§6) | **owner** | adding every proposal as a new tag |
| Opposing norms are declared as a pair — cross-reference, one theme tag, reported by name (D12) | **owner** | narrowing one side away; dropping one side; a separate conflict registry |
| One severity scale for the whole corpus — Critical / Important / Minor (D13) | **owner** | the domain scales side by side |
| Tooling inside the skill; product support — in `scripts/` | **owner** | everything in `tooling/` |
| The VP catalog **replaces** the D3 model: the source — `.md` instructions, `catalog.json` — identity + vocabulary + aliases + exceptions | **owner** | a JSON catalog with instructions inside |
| The plugin payload = the package root (`skills/` + `instructions/` + `catalog.json`) | **owner** | a separate installation of the corpus |
| The project layer of instructions | **owner (c)** — deferred, v1 canonical | overlay |
| Canonical field names — from the S-document; skills — host convention | author | an own set of names in the distinction |
| Groups and the active alternative — in the profile; `excludes` — pairwise exclusion of instructions | author | `excludes` between tags |
| `compose` accepts a resolved effective profile | author | inheritance resolution inside compose |
| No derived index in v1 | author | an index as an artifact |
| No LLM client: shortlist → the choice is made by the skill | author | semantic search in VP |
| Tag aliases — in `catalog.json` | author | an alias in the instruction metadata |
| Catalog lookup — relative to the script file | author | cwd / an env variable |
| Gates: `test` + `test:coverage` + `typecheck`; CRAP/mutation — deferred | author | a Stryker dependency in VP |
| Dev tools read YAML manifests; shipped code — only JSON | author | a JSON duplicate of licenses |
| The design in `packages/powers/docs/` | **owner (a)** | `docs/superpowers/specs/…` |

# 13. Deferred decisions

| ID | Question | Status |
|---|---|---|
| CAT-D1 | The project layer of instructions (overlay) | Deferred: v1 canonical |
| CAT-D2 | Semantic `decision.evaluate` in VP | Deferred: v1 deterministic; the D5 protocol is ready |
| CAT-D3 | The digest link of instructions | **Resolved 2026-10-19:** the digest in `catalog.json` (corpus listing), generated by `convert.ts` |
| CAT-D4 | Language of the instructions | v1 — the product language |
| CAT-D5 | Catalog hierarchy (subdirectories) | v1 — flat |
| CAT-D6 | CRAP/mutation gate for VP | Deferred: a new dependency is needed (Stryker) — requires owner consent |
| CAT-D7 | Whether VP has its own `index.md`/corpus navigation | Deferred: the bundle index already exists; the corpus is navigated by search |
| CAT-D8 | Who approves the tag vocabulary and groups | The mechanism is resolved: the owner, in a batch pass; the specific tags — at stage D |
| CAT-D9 | How many instructions is enough for the MVP | Deferred to step D: exit criteria |
| CAT-D10 | Where the selection and merging report is stored | Deferred to step D: a step report, not the corpus |

# 14. Synchronization of normative documents (within this work item)

| Document | What changes |
|---|---|
| `decisions/D3-instruction-catalog-and-registry.md` | rev 2: the canonical catalog = `.md` instructions + `catalog.json` (identity, vocabulary, aliases, exceptions); the bundled projection is unchanged |
| `system-specification.md` | SR-01, SR-06, SR-07, SR-15, SR-76, SR-34, SR-62 |
| `acceptance.md` | AC-01 (validation of an instruction file, the list of sources), AC-42 (manifest ↔ disk), 
| `traceability.md` | the D3 row; a reference to the catalog design as a source |
| `docs/index.md`, `docs/log.md` | the design in the bundle index; records about the changes |

# 15. Traceability from research

| Research § | Design element |
|---|---|
| §4.1 canonicalization of donors | the instruction format, `provenance[]` (several sources), the license binding, merging of duplicates, the processing map (§5a) |
| §4.2 two dimensions of tags | `capability_tags`, `pattern_tags`, ≥2 components, vocabulary, aliases; terminology is merged by the vocabulary |
| §4.3–4.5 methodology as policy | `compose` + the profile as a conflict resolver; inheritance/override — Stage 4 |
| §4.6 risk-adaptive updates | the instruction `revision` + the change log (OKF) |
| §4.7 catalog operations | `tags/search/get/compose` (§7) |
| §4.8 two selectors | a deterministic shortlist from the catalog; the choice — in the skill |
| §4.9 OKF | `catalog.json` and the log — in our bundle; instructions — the product format |
| §6.2 `artifact_contract` | the `artifact_contract_*` fields |
| §9.2 stable names | `instructions/<id>.md` |

# 16. What is left to the builder

- The exact code and order of the frontmatter parser (the subset: scalars, YAML blocks,
  comments, empty values, non-ASCII).
- The module structure of `catalog.ts` (functions, types, exports) and the exact CLI protocol
  (flags, stdout/stderr, exit codes).
- The format and error codes of `check-corpus.ts`.
- The exact set of seed instructions (5–8) from research/SR — to check the rules, aliases
  and group conflicts.
- The structure of the tests and fixtures.
- Whether `frontmatter.ts` remains a separate file (the author's decision: yes — it is needed by
  `check-corpus.ts` too).



