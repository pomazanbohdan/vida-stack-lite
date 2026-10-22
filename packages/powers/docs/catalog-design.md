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
  title: Accepted decisions D1–D15 (and D4b)
- id: next-actions
  resource: /next-actions.md
  title: Vida Powers — next actions within packages/powers
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
revision: '17'
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
      SKILL.md                    ← the main orchestration skill (host convention), implemented in step E
      scripts/
        schema.ts                 ← validator of a limited JSON Schema subset
        frontmatter.ts            ← parser of a limited YAML subset
        catalog.ts                ← operations tags/search/get/compose
        catalog-cli.ts            ← the CLI of the operations
    vp-setup/
      SKILL.md                    ← auxiliary setup skill
      scripts/
        setup.ts
        cli.ts
  instructions/                   ← canonical instructions: flat, .md + metadata
    test-first-development.md
    accept-a-block-only-when-the-user-says-so.md
    …
  scripts/                        ← product support tools (as with the donors)
    check-okf.ts                  ← already exists (moved from tooling/)
    check-corpus.ts               ← corpus validation
    validate-donors.ts            ← moved from .tmp
    convert.ts                    ← donor converter (step D) — the single writer of the corpus
    audit.ts                      ← corpus audit CLI (read-only)
    audit-report.ts               ← the report engine the audit CLI drives
    definitions.ts                ← duplicate BR/SR/AC/NFR definition checker
  config/
    vpcatalog.v1.schema.json      ← schema of catalog.json
    vpcorpusmap.v1.schema.json     ← schema of the processing map (SR-66)
    vpinstruction.v1.schema.json   ← schema of the instruction frontmatter (§5)
    vpmethodologyprofile.v1.schema.json ← schema of the source methodology profile (D8, D10)
    vpeffectiveprofile.v1.schema.json ← schema of the effective profile for compose
    methodology-profile.json      ← the source profile instance (D10); `compose` receives the resolved profile
  docs/                           ← OKF bundle (this design is part of the bundle)
  tests/
    catalog.test.ts  frontmatter.test.ts  schema.test.ts  check-corpus.test.ts
    catalog-cli.test.ts  convert.test.ts  audit.test.ts  definitions.test.ts
    donors-manifest.test.ts  setup.test.ts
    fixtures/catalog/             ← a minimal catalog (alpha, beta, conflict-mode,
                                     disabled-mode, gamma, guidance) with its own
                                     `catalog.json` and the two schemas it needs
  catalog.json                    ← catalog identity + tag vocabulary + aliases
  corpus-map.json                 ← processing map: donor + file → converted/split/merged/rejected
  package.json  bunfig.toml  tsconfig.json  .bun-version
```

**The source profile and the resolved profile.** `VPMethodologyProfile/v1` is the
**source** profile (`config/vpmethodologyprofile.v1.schema.json` — the schema,
`config/methodology-profile.json` — the instance, D8/D10). `VPEffectiveProfile/v1`
(`config/vpeffectiveprofile.v1.schema.json`) is the **resolved** profile that the host
passes to `compose` (§7). The two are different artifacts: the source carries the
declared groups and their alternatives, the resolved one carries the active
alternative.

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
- Per-host manifests (`.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`,
  `.agents/plugins/`) —
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
compatibility_excludes: []
compatibility_requires: []
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

**Volume of candidates (the records of the processing map `corpus-map.json`; the
clones are pinned in `donors.yaml`)** — the `.md` column is the number of carrier
`.md` files of the donor that the map records, the `SKILL.md` column is the share of
them that are skill files.

| Donor | `.md` | SKILL.md | Comment |
|---|---|---|---|
| superpowers | 120 | 15 | |
| ponytail | 60 | 13 | |
| BMAD | 327 | 40 | workflows/agents |
| matt-skills | 132 | 38 | |
| addy-skills | 113 | 25 | |
| pstack (in cursor/plugins) | 134 | 58 | our donor is only the `pstack/` subdirectory (169 tracked files — this is `content_file_count` in `donors.yaml`; the monorepo itself holds 947) |
| GSD | 1815 | 72 | mostly docs, not methodology |
| open-knowledge-format | 89 | 0 | document format; the rules of the format are the norms |

All 8 donors: **2790 carrier files → 2510 instructions**. The exit criteria of step D
are applied to every donor; the MVP pair (superpowers + ponytail) is a part of the
corpus, not its limit. The catalog has no limit on the number of records — the
measured state is in `catalog.json` and `corpus-map.json`.

**What is not transferred** (research §4.1): execution engines, tracker integrations,
donor state journals. Filtering happens at phase 2, and every rejection is recorded with a
reason in the processing map.
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

**The current vocabulary** (measured 2026-10-22): the dictionary holds **78 capability
and 157 pattern tags** (1 alias).

**Before the package proposal — the mapping pass** (owner decision, 2026-10-20):
every proposed tag is first compared with the vocabulary that already exists.
A proposal that an existing tag already covers is **folded into that tag** and
does not enter the package: the same word must not name two things, and the
catalog search must not have to know which of two synonyms was meant. Only the
proposals that the existing vocabulary does not cover are put to the owner.
In the donor `addy-skills` this reduced 134 proposals to 71 (24 capability +
47 pattern); 63 found an existing counterpart.

**The owner is no longer asked about the tags** (owner decision, 2026-10-21): the
mapping pass runs first, and a tag that is genuinely needed and genuinely unique
is **created by the agent** — the vocabulary grows where the work needs a word it
does not have. What the owner still decides is the corpus itself, not the
vocabulary that routes it.

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
| `catalog.compose` | `capability[]`, `pattern[]`, `instruction_ids[]`, `roles[]`, `products[]`, `conditions[]`, `required_ids[]`, `profile` | `{instructions:[{instruction_id,title,summary,content,artifact_contract,selection_reason}]}` + execution context (SR-23) | `CATALOG_INVALID`, `CATALOG_ID_UNKNOWN`, `CATALOG_INSTRUCTION_DISABLED`, `CATALOG_REQUIRED_CONFLICT`, `CATALOG_PROFILE_CONFLICT`, `CATALOG_DEPENDENCY_MISSING`, `CATALOG_DEPENDENCY_DISABLED`, `CATALOG_BUNDLE_LIMIT_EXCEEDED` |

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
    "testing-sequence": { "active": "test-first-development", "alternatives": ["test-first-development"] },
    "review-strategy": { "active": "code-review", "alternatives": ["code-review"] },
    "architecture": { "active": "structural-design", "alternatives": ["structural-design"] },
    "delivery": { "active": "plan-execution", "alternatives": ["plan-execution"] }
  },
  "unresolved_groups": {
    "approval-policy": ["approval-policy-proceed", "approval-policy-gate"]
  }
}
```

The active alternative is a **pattern tag** (a methodology), not an `instruction_id`; this way
groups remain about methodologies (SR-26), and an instruction is bound to them by its own
`pattern_tags`. **Every alternative has its own pattern tag**: the shared tag of the group
(e.g. `approval-policy`) is a marker for search, not an alternative; otherwise two
alternatives of one group would not differ from each other. The example mirrors
`config/methodology-profile.json`: `testing-sequence`, `review-strategy`, `architecture`, and
`delivery` each have one explicitly declared default alternative; the user-choice
`approval-policy` is unresolved and carries both canonical alternatives. The latent guard for
future product groups with multiple defaults remains deferred while the four current product
groups each have one alternative. Groups with product policy have an **explicitly declared** active
alternative in the source profile (`default`); for groups where the user makes the choice,
`default` is forbidden (D10). Inheritance resolution and override are outside `compose` (Stage 4);
`compose` accepts an effective profile with canonical groups and unresolved-choice state.

**`compose` rules**

1. Validate the query and supplied effective profile before selection. The profile must
   represent every canonical group as resolved or unresolved. A missing `unresolved_groups`
   field, a user-choice group absent from both `groups` and `unresolved_groups`, or a
   stale/mismatched canonical alternative set returns `CATALOG_PROFILE_CONFLICT` with
   `profile_refresh_required: true`; refresh through `vp-setup` before treating it as a
   user-choice request.
2. `required_ids` are always included, even when they do not match tags (SR-13). Tag
   matching runs only when at least one non-empty selection dimension is supplied; with
   no dimensions, `compose` does not pull the whole corpus.
3. Apply profile filtering to selected matches. A required inactive alternative conflicts;
   selecting an unresolved user-choice group returns `CATALOG_PROFILE_CONFLICT` with
   `resolution_required: true` and the canonical alternatives, without a bundle. A
   conflicting group without a supplied profile requests a refreshed effective profile.
4. Close every transitive `compatibility_requires` dependency. Missing or disabled
   dependencies return `CATALOG_DEPENDENCY_MISSING` or `CATALOG_DEPENDENCY_DISABLED`.
   Replace an inactive dependency only with the active alternative of its same resolved
   group. If dependency closure reaches an unresolved group, return its canonical
   alternatives with `resolution_required: true` and no bundle; never substitute a default
   or discard a dependency silently.
5. After dependency closure, validate canonical policy alternatives and all
   `compatibility_excludes`. Conflicting canonical alternatives return
   `CATALOG_PROFILE_CONFLICT`; excluded instructions return `CATALOG_REQUIRED_CONFLICT`.
   Without a profile, non-conflicting diagnostics remain available, while conflicting
   alternatives and exclusions fail; diagnostic output is not a resolved session bundle.
6. Sort returned instructions by `instruction_id`, then enforce the whole-bundle limit:
   at most 20 instructions and at most 64,000 UTF-8 bytes summed over each selected
   `content` field after filtering, active substitution, and dependency closure. `1 KB`
   means 1,000 bytes; the tag dictionary, JSON/envelope, metadata, and execution context
   do not count. Overflow returns `CATALOG_BUNDLE_LIMIT_EXCEEDED` and no partial bundle.

**Compose error distinctions:** missing `unresolved_groups` or stale canonical alternatives
return `CATALOG_PROFILE_CONFLICT` with `profile_refresh_required: true`; a selected unresolved
choice returns `CATALOG_PROFILE_CONFLICT` with `resolution_required: true`, the canonical
alternatives, and no bundle. Missing or disabled transitive dependencies return
`CATALOG_DEPENDENCY_MISSING` or `CATALOG_DEPENDENCY_DISABLED`; post-closure exclusions return
`CATALOG_REQUIRED_CONFLICT`; a count or content-byte overflow returns
`CATALOG_BUNDLE_LIMIT_EXCEEDED`. Without a profile, non-conflicting diagnostics are preserved,
but they are not a resolved session bundle.

**Semantics of `decision.evaluate` (D5).** In v1 the operation is implemented **deterministically**:
`decision.evaluate` accepts already allowed candidates and returns a shortlist or a refusal
reason (no candidates, unknown candidate ID, candidate outside the allowed ones,
incorrect format). Semantic evaluation is done by the `vp-mode` skill; an external
provider is a host capability, not a VP obligation. The D5/SR-16…SR-21 contract preserves
all fields (the source of the decision, the selected IDs, the reason for the fallback).

Current v1 has exactly four refusal codes: no-candidates, unknown-candidate, candidate-not-allowed, and invalid-format. The applicability-unresolved code is planned only for the future structured applicability contract in SR-82; it is not a current v1 or E4 result.

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

**The second verification surface — the corpus audit CLI.** `audit.ts` (a dev tool in
`scripts/`, with the report engine in `audit-report.ts`) reads the corpus and reports
what the validator does not state as an error:

| Command | What it reports |
|---|---|
| `map` | the processing map and the instruction provenance name each other (SR-66): a claim the map does not record, a map record no provenance names, a rejected record that a provenance cites, a merged record whose target is unknown |
| `pairs` | a declared opposing pair is mutual and carries one shared theme pattern tag (D12): a one-way exclusion, a pair without a theme, a pair that shares no pattern tag |
| `pair-agreement` | the table of the D12 decision record and the pairs the corpus declares are the same pairs (D12): a pair the record does not list, a pair the record lists but the corpus does not declare |
| `pair-table` | every declared pair with its theme tag — the rows of the D12 table, regenerated from the corpus |
| `fidelity` | an instruction body carries the donor's own text (D11, SR-77): a body line whose token run is not found in a declared donor file is reported **for review** — the review, not the count, decides |
| `specs` | a repair specification is consistent with the corpus it will be written into: the donor, the path, the tags, the compatibility targets and the body text |

**The read-only invariant.** The converter (`scripts/convert.ts`) stays the **single
writer** of `instructions/`, `catalog.json` and `corpus-map.json`; the audit **only
reads**. The audit writes no corpus file — it writes its report to the terminal or to
the file of `--out <file>`. A finding of an audit report is not a defect of the corpus
until a reviewer has decided on it (the `fidelity` report in particular), and the
counters of a report — not the exit status of the command — are the evidence.

# 10. Tests and gates

Commands: `bun run --cwd packages/powers test` (fast cycle), `test:coverage`
(`bun test --coverage`, coverage threshold 1.0 from `bunfig.toml`), `typecheck`.

| Test | What it checks |
|---|---|
| `frontmatter.test.ts` | the parser: scalars, YAML blocks, comments, empty values, non-ASCII, format errors |
| `catalog.test.ts` | the rules of §5; search does not return `content`; alias → canonical tag; `get` on an unknown/disabled ID; compose: required + dependencies + a conflict without a profile + rejection of an inactive alternative by the profile + a direct `excludes` + output order; `disabled` is not in search |
| `check-corpus.test.ts` | `check-corpus` on the synthetic corpus that the test builds itself: unknown tag, missing provenance, unknown `requires`, duplicate ID, incompatible license, an instruction without a map entry, a map entry pointing to a missing instruction; the `catalog.json` manifest ↔ disk: a file outside the manifest, an entry without a file, a mismatched `sha256` (AC-42); the source methodology profiles against schema, corpus, pattern tags and decisions |
| `catalog-cli.test.ts` | CLI: JSON on stdout, a code on stderr, a non-zero exit, catalog lookup relative to the file |
| `schema.test.ts` | the JSON Schema subset validator and the production schemas of `config/` (catalog, instruction, source profile, effective profile, corpus map) |
| `convert.test.ts` | the converter: the specification is parsed and rendered, the instruction + the digest entry + the map record are written, the writes are idempotent, a removal recomputes the affected records |
| `audit.test.ts` | the audit CLI: the argument parsing, the bounded output (`--limit`, `--offset`, `--filter`, `--summary`, `--all`, `--json`, `--out`) and every report — `map`, `pairs`, `pair-agreement`, `pair-table`, `fidelity`, `specs` |
| `definitions.test.ts` | the normative ids (BR/SR/AC/NFR) are defined exactly once in the bundle |
| `donors-manifest.test.ts` | `donors.yaml`: seven methodology donors and one format reference, unique ids, the content path of pstack, the not-cloned runtime repository |
| `setup.test.ts` | `vp-setup`: the carrier detection, the managed block of the profile, the resolution of the selections and the verification ladder, the CLI |

Fixtures — a minimal catalog: `tests/fixtures/catalog/` (`alpha.md`, `beta.md`,
`conflict-mode.md`, `disabled-mode.md`, `gamma.md`, `guidance.md`) with its own
`catalog.json` and the two schemas it needs. The synthetic corpus fixtures of
`check-corpus` are built inside the test file itself.

# 11. Commands

```sh
bun run --cwd packages/powers test                              # fast cycle
bun run --cwd packages/powers test:coverage                     # coverage (threshold 1.0)
bun run --cwd packages/powers typecheck                         # type checking
bun packages/powers/scripts/check-corpus.ts                     # corpus validation
bun packages/powers/scripts/check-okf.ts                        # OKF compatibility of the bundle
bun packages/powers/scripts/audit.ts map --summary              # corpus audit (read-only)
bun packages/powers/skills/vp-mode/scripts/catalog-cli.ts tags  # manual check of the operations
bun run --cwd packages/agent lint:knip:pinned                   # repository lint gate
```

**The corpus audit CLI** — one command per report, one option set for every command:

```sh
bun packages/powers/scripts/audit.ts <map|pairs|pair-agreement|pair-table|fidelity|specs> [options]
```

| Option | Meaning |
|---|---|
| `--root <dir>` | the corpus root (default — the package root) |
| `--limit <n>` | rows per section (default 20) |
| `--offset <n>` | rows skipped before the first shown row |
| `--filter <text>` | only the rows that contain the text |
| `--summary` | the counters only, no rows |
| `--all` | every row, without a limit |
| `--json` | the report as JSON |
| `--out <file>` | the whole report is written to the file; the terminal shows the counters |
| `--instruction <id>` | the fidelity report is limited to one instruction |
| `--spec <file>` | a specification to verify (repeatable) |
| `--spec-dir <dir>` | every specification in the directory (repeatable) |

The converter (`scripts/convert.ts`) remains the **single writer** of the corpus; the
audit **only reads**. The audit exits 0 even when a report holds findings — the
counters of the report are the evidence.

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
| CAT-D4 | Language of the instructions | **Resolved 2026-10-20:** the product language is the decision **D11** (`docs/decisions/D11-product-language.md`, `stable`): the documentation is in English, and the body of an instruction is the donor's original text. The normative clause is **SR-77** (§5, §9) |
| CAT-D5 | Catalog hierarchy (subdirectories) | v1 — flat |
| CAT-D6 | CRAP/mutation gate for VP | Deferred: a new dependency is needed (Stryker) — requires owner consent |
| CAT-D7 | Whether VP has its own `index.md`/corpus navigation | Deferred: the bundle index already exists; the corpus is navigated by search |
| CAT-D8 | Who approves the tag vocabulary and groups | **Resolved 2026-10-21:** the owner approves the corpus, not the vocabulary — the mapping pass runs first and a genuinely new, unique tag is created by the agent (§6) |
| CAT-D9 | How many instructions is enough for the MVP | **Resolved 2026-10-21:** the exit criteria of step D are applied to all 8 donors — 2790 carrier files → 2510 instructions (the MVP pair was closed 2026-10-20) |
| CAT-D10 | Where the selection and merging report is stored | **Resolved 2026-10-19:** the report **is** the corpus — the processing map `corpus-map.json` (`VPCorpusMap/v1`, SR-66); the rejections are recorded in the map, not in a separate report (§5a) |

# 14. Synchronization of normative documents (within this work item)

| Document | What changes |
|---|---|
| `decisions/D3-instruction-catalog-and-registry.md` | rev 2: the canonical catalog = `.md` instructions + `catalog.json` (identity, vocabulary, aliases, exceptions); the bundled projection is unchanged |
| `system-specification.md` | SR-01, SR-06, SR-07, SR-15, SR-76, SR-34, SR-62 |
| `acceptance.md` | AC-01 (validation of an instruction file, the list of sources), AC-42 (manifest ↔ disk), 
| `traceability.md` | the D3 row; a reference to the catalog design as a source |
| `docs/index.md`, `docs/log.md` | the design in the bundle index; records about the changes |

### D14/D15 reconciliation for §§5a, 6, 7, 14, and 16 (future, not implemented)

- **§5a — formation.** The existing converter remains the Markdown instruction writer. H1 may use only a reviewed, rights-cleared Wondelai general-method subset from the pinned carrier. All 14 guided-journey directories are inside the declared carrier at plugins/wondelai-skills/skills/; their specified mirrors under plugins/metaskills/skills/ must be byte-identical. Exclude the 30 journey Markdown files (zero are outside the carrier), leaving 391 candidate Markdown files for classification. Those are files, not norms or delivered instructions. H2 uses only explicitly pinned and allowlisted normative CSV paths after rights and source review; record each row and cell in a versioned map. No CSV parser ships in a skill.
- **§6 — catalog data.** Preserve one catalog.json. The future versioned VPCatalog/v2 manifest adds typed resources alongside instructions; it does not reinterpret VPCatalog/v1. Resource files use resources/<resource-id>.json and a VPReferenceResource/v1 contract with resource_id, type, revision, applicability, provenance, source row/cell locators, payload, and digest. Preserve the raw file hash separately. Define canonical JSON serialization and the digest boundary before formation. The processing map advances explicitly to VPCorpusMap/v2 to represent file, row, cell, instruction, resource, merge, and rejection links; do not retrofit CSV rows as Markdown files.
- **§7 — operations.** Add catalog.resource.get as an exact-ID operation in the existing catalog CLI and portable reader. Extend search/compose with structured applicability facts, independent of methodology alternatives and compatibility conflicts. Current v1 refusal reasons stay the four existing codes; applicability-unresolved is a fifth reason only after H2 implements unknown-context handling. Resource retrieval is explicit, selected records only, and uses the shared canonical-path, symlink, digest, type, encoding, and size checks. One helper belongs under skills/vp-mode/scripts/ and development formation imports it; scripts/formation-payload.ts is not a runtime dependency.
- **§7 — budget.** Keep the current 20-instruction cap. After resource retrieval is implemented, count selected instruction content plus selected resource payloads serialized as canonical UTF-8 JSON against the same 64,000-byte cap. Reject the whole result on overflow; resource IDs or artifact references cannot bypass the cap.
- **§14 — estimate provenance.** The M3.1 R2 review of DECISION-r2.md (review SHA-256 d16d526824a89f60d6d05ad89e352a0ea7ae244956d2c1c9686df7f64b8e9aa2; reviewed artifact SHA-256 c0d09d203f8af86807f8381eec2e5f90bf8ea8144246e65652bee900c4840946) attributes the planning estimates. The verified 1,434 UUPM normative CSV rows and 391 candidate Markdown files are unlike source units; 1,300–1,700 new IDs, 10–40 existing-corpus merges, and 3–6 cross-donor clusters are estimates. The listed reference categories total 4,331, not 4,523; the 192-item discrepancy is unresolved. The 3,810–4,210 total and 52–68% growth are derived estimates, not delivered counts. Use only counts needed to plan and measure a pilot.
- **F8 estimate link.** The M3.1 R2 review, §4/F4, traces the prior .61 F8 estimate finding to DECISION-r2.md lines 131–143. The review and reviewed-artifact hashes above bind the estimate attribution and correction.
- **§16 — status.** D14/D15 are accepted scope only. No Wondelai rights clearance, UUPM admission, converted content, resource schema, implementation, or Runtime acceptance is claimed. Step H owns the phased work and gates.

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

# 16. What is left to build

The design is implemented: the corpus holds 2510 instructions from 8 donors, the
operations, the converter, the validator and the audit CLI exist and are covered by
the test suite. What is left is not inside this design any more — it is the next
steps of the product.

- **Step E4 — the orchestration skill** `skills/vp-mode/SKILL.md`: implemented with
  `catalog.search`/`catalog.compose`, Agent Fallback, unresolved-policy negotiation, and
  the enforced SR-58/AC-26 limit. `.38` records Bun/Node setup and compose smoke checks,
  54 focused tests, a 28-file typecheck, and matching hashes for 2,510 instruction payloads;
  Deno was unavailable. Full Step E gates remain pending in
  [`task-plan-step-e.md#e5-target-status`](task-plan-step-e.md#e5-target-status).
- **Step E5 — the delivery channels**: the canonical target status and E5b gaps are in
  [`task-plan-step-e.md#e5-target-status`](task-plan-step-e.md#e5-target-status). The Codex
  compatibility manifest uses the scaffold field `skills: "./skills/"`; Claude and Cursor
  enumerate the current `vp-mode` and `vp-setup` paths. Adding a shipped skill requires a
  matching map, schema, test and golden update; this is not a claim of future discovery.
  The portable root uses standard `skills/` discovery and has no `skills` or `catalog` field.
  Claude marketplace output includes the package description at top level. Owner decision
  (2026-10-22, F2): `catalog.json` remains the canonical listing, surfaced by the CLI and
  `vp-mode`; no catalog copy or vendor-specific catalog field is added. Rationale: supported
  host formats declare skill paths, not a shared catalog property; CLI/SKILL access keeps one
  corpus listing. Host mapping follows the
  [Codex package structure](https://developers.openai.com/plugins/build/plugins),
  [Claude manifest](https://code.claude.com/docs/en/plugins/manifest-reference),
  [Claude marketplace](https://code.claude.com/docs/en/plugins/marketplace-reference) and
  [Cursor plugin reference](https://cursor.com/docs/reference/plugins).
- Local generation requires only selected-host mandatory metadata: `author.name` for Codex,
  marketplace `owner.name` for Claude/Cursor, and Codex local marketplace `category`.
  Email, license, privacy and terms fields stay optional where the host format allows them;
  no placeholder values are synthesized. D4b's owner-supplied version, license, owner,
  privacy and terms remain required for public release; skills-only Codex package validation
  does not require MCP app review URLs ([submission requirements](https://developers.openai.com/plugins/deploy/submission)).
- The generator records SHA-256 ownership in ignored package-local state. It regenerates only
  matching owned files, conflicts on foreign or manually changed targets before writes, prunes
  only proven-owned stale outputs, keeps check mode read-only and fences unresolved transactions.
  Focused tests cover recovery and observed write-failure rollback (SR-80/AC-46).
- **Step F — the Work Items and the findings**: the human Work Items and bounded
  Standalone writer exist. `.35` focused tests support deterministic replay and the
  no-fix boundary; AC-20/21/23 remain open, AC-22 is partial, and no real-event
  `findings.jsonl` exists. Step F gates remain open in [VP-6](work/VP-6.md).
- **Step G — the runtime request**: [`REQ-D3-D8`](requests/REQ-D3-D8-runtime-request.md)
  is prepared as a draft, not sent or accepted. Final relevant Source/schema hash binding
  waits for the `.62` catalog/findings freeze; E5a is not a prerequisite.
- **Step H — D14/D15 content scope:** plan-review and current H0 evidence status are recorded in [task-plan-step-h.md](task-plan-step-h.md). No source is admitted by D14/D15; Wondelai rights review, engineering/UX content selection, typed resource schemas and all H1-H3 implementation gates remain open.
- **The four owner decisions that are open** (`.agent/work/vp-next-steps/WORK.md`,
  "The open items that are not this work"):
  1. the ADR status vocabulary (R1) — `DEPRECATED` needs a decision;
  2. the profile group of the context-degradation pair — with the mutual exclusion, a
     `curate-context` compose that matches both sides hard-fails, and no group gives
     the user a way to choose;
  3. the `approval-policy` marker — it is carried by instructions that are not in the
     group; it identifies a topic rather than the group, and the owner must decide
     whether the marker and the group are one thing;
  4. the wording of D12 §4 — the owner may reword it.



