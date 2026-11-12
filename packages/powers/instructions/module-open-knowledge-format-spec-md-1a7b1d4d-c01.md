---
schema: VPInstructionModule/v1
instruction_id: "module-open-knowledge-format-spec-md-1a7b1d4d-c01"
title: "open-knowledge-format: SPEC.md module"
summary: "Carrier for 8 atomic instructions from open-knowledge-format:SPEC.md."
source: "{\"donor\":\"open-knowledge-format\",\"path\":\"SPEC.md\"}"
atom_ids:
  - attest-with-deterministic-code-not-a-model
  - choose-the-version-bump-by-consumer-impact
  - consume-an-unknown-format-version-in-best-effort-mode
  - derive-the-trust-tier-from-the-verifier
  - describe-a-concept-with-its-title-description-and-resource
  - favour-structured-markdown-over-freeform-prose
  - give-each-computation-its-own-trust-state
  - infer-trust-from-objective-signals-not-from-a-stored-score
atom_count: 8
atoms: "[{\"atom_id\":\"attest-with-deterministic-code-not-a-model\",\"file_sha256\":\"a187486a52d1d4eb4edc78ca6c832f831491c564f5edd67837cd60f0b6f07866\",\"content_sha256\":\"625557ce41b829c3a7e1327f9ff7dc808dd318a15272dcd13f62f29478dffa07\",\"file_bytes\":1298,\"body_bytes\":237},{\"atom_id\":\"choose-the-version-bump-by-consumer-impact\",\"file_sha256\":\"877a636d7e1eb64fc356ca853237a8df4c968339cc8e513f026e08c76dde81c5\",\"content_sha256\":\"d9b35e69f7323cd5095d796d3dd36d20173fdb8a3f0a6f4ee6ca7b2e8e691ff9\",\"file_bytes\":4250,\"body_bytes\":2674},{\"atom_id\":\"consume-an-unknown-format-version-in-best-effort-mode\",\"file_sha256\":\"2ed0009074403caaf9765188edf781777bbe44cc946d456011676bad06d8400a\",\"content_sha256\":\"8fdac848666c193fe6954d05c396ce7d5cbdad2674b61375c05640f9555b990a\",\"file_bytes\":1472,\"body_bytes\":358},{\"atom_id\":\"derive-the-trust-tier-from-the-verifier\",\"file_sha256\":\"fa817e158c4118d1dfa6133852f416cde2eb6507e397884922c1ff24ef4a4d81\",\"content_sha256\":\"3d00afd3e0531d870d89ad36367dadb1589c64e9f45abb4a94676c114b86fb03\",\"file_bytes\":1570,\"body_bytes\":420},{\"atom_id\":\"describe-a-concept-with-its-title-description-and-resource\",\"file_sha256\":\"e57aabaeb811beeff38ea2cfec1dd4c85807282153363a137a335abb5d06503d\",\"content_sha256\":\"8d9b2118e49170c7d13c49ec32c06a1cf468489e332029817ff8cb3712aa825f\",\"file_bytes\":1709,\"body_bytes\":519},{\"atom_id\":\"favour-structured-markdown-over-freeform-prose\",\"file_sha256\":\"7c33c235c11e3e6ff15f295b81212a66f0f52813438f88593eff93827f69ccd2\",\"content_sha256\":\"8c5400ee4b5b8ca26ab1831a9711768206f13058c53a5aeb619a2203e4fa0744\",\"file_bytes\":1382,\"body_bytes\":288},{\"atom_id\":\"give-each-computation-its-own-trust-state\",\"file_sha256\":\"36fa153c2a44382eb64f3d9411f8c43cd348fd1ada5eb96fdcbef1ce3b512d38\",\"content_sha256\":\"cf5e6eeba4926a2640caec5b2c2d6beb32d263cf90a90e0a72700eacc757b975\",\"file_bytes\":1743,\"body_bytes\":661},{\"atom_id\":\"infer-trust-from-objective-signals-not-from-a-stored-score\",\"file_sha256\":\"baa09d6dea7fc10d576b219f5559937daeb7cc52a154ad37f6fce56a8cd32e34\",\"content_sha256\":\"739037a52467d628a38eb607b3f6559677842d850b5e1c506bb2c1ba3d715541\",\"file_bytes\":2450,\"body_bytes\":1204}]"
carrier_sha256: ad317e00e4255fa8e09ca02333bd1c5e09b4c52c6bbac8ff32b0587a03ebd4d3
carrier_bytes: 17095
revision: 1
status: active
---
<!-- vpmodule:atom:begin attest-with-deterministic-code-not-a-model -->
---
instruction_id: attest-with-deterministic-code-not-a-model
title: "Attest with deterministic code, not with a model"
summary: The check of a run is deterministic code that reads the receipt and returns a verdict; it runs on the consumer side.
capability_tags:
  - verify-work-results
pattern_tags:
  - attested-computation
conditions_applies_when: A receipt of a run has to be checked.
conditions_does_not_apply_when: The check is a definition check against a policy rather than a check of a run.
artifact_contract_output_type: attester
artifact_contract_required_data:
  - the receipt
  - the verdict the deterministic check returned
artifact_contract_verified_by: the verdict came from deterministic code over the receipt
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Attest with deterministic code, not with a model
`attester`: The deterministic check.
`resource` names code (no LLM) that takes a receipt and returns a verdict.
It is meant to run consumer-side.
`executor`: How the computation is run.
<!-- vpmodule:atom:end attest-with-deterministic-code-not-a-model -->
<!-- vpmodule:atom:begin choose-the-version-bump-by-consumer-impact -->
---
instruction_id: choose-the-version-bump-by-consumer-impact
title: Choose the version bump by consumer impact
summary: "Let the version number say what a consumer will observe: breaking change, new behaviour or a fix; a minor bump adds backward-compatible fields and headings, a major bump may rename a required field or change a reserved filename."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A release is being prepared for something that depends on the code.
conditions_does_not_apply_when: Nothing outside the project depends on the code.
artifact_contract_output_type: version-decision
artifact_contract_required_data:
  - what consumers observe
  - the chosen bump
  - the promise the number makes
artifact_contract_verified_by: the number matches the observable change and the code behaves as the number promises
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/git-workflow-and-versioning/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/version-a-capability.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=VERSIONING.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Choose the version bump by consumer impact

Commits are how *you* track change; a **version** is how your *consumers* track it. The moment anything else depends on your code — another team, a published package, a deployed client — "latest on main" stops being a sufficient answer to "what am I running, and is it safe to upgrade?" A version number and a changelog are the contract that answers it.

For anything with consumers, version `MAJOR.MINOR.PATCH` and let the number carry meaning:

```
  MAJOR  breaking change — consumers must change their code to upgrade
  MINOR  new functionality, backward-compatible — safe to upgrade
  PATCH  bug fix, backward-compatible — safe to upgrade
```

The number is a promise, so make the code match it. A "patch" that changes behavior consumers relied on is a major change wearing a disguise (Hyrum's Law — see the interface-design skill). When unsure whether a change is breaking, assume it is; a surprise major is far cheaper than a broken consumer.

A **minor** version bump introduces backward-compatible additions (new optional fields, new conventional section headings).
A **major** version bump may make breaking changes (renaming required fields, changing reserved filenames).

"It's just a small fix, bump the patch" | Check what consumers can observe. A behavior change they relied on is a major, whatever the diff size.

A breaking change shipped under a minor or patch version bump
| Backwards-compatible bug fixes or minor prompt improvements | **patch** (0.0.x) | Fix a typo in an agent instruction; tighten a hook condition. |
| New extension point, new skill, or new config key — existing consumers unaffected | **minor** (0.x.0) | Add a new optional config key. |
| Breaking change to the hook contract, removal of a skill or config key, change of `id` | **major** (x.0.0) | Rename a hook extension point; remove a skill consumers depend on. |
Concretely:
| Increment | When | Examples |
|-----------|------|----------|
| **PATCH** | Bug fixes, typo corrections, test additions | A config corruption fix |
| **MINOR** | Non-breaking enhancements, new commands, new runtime support | A new workflow command |
| **MAJOR** | Breaking changes to config format, CLI flags, or runtime API; new features that alter existing behavior | Removing a command, changing a config schema |
Branch names map to commit types:
| Branch prefix | Commit type | Version bump |
|--------------|-------------|-------------|
| `fix/` | `fix:` | PATCH |
| `feat/` | `feat:` | MINOR |
| `hotfix/` | `fix:` | PATCH (immediate) |
| `chore/` | `chore:` | none |
| `docs/` | `docs:` | none |
| `refactor/` | `refactor:` | none |
<!-- vpmodule:atom:end choose-the-version-bump-by-consumer-impact -->
<!-- vpmodule:atom:begin consume-an-unknown-format-version-in-best-effort-mode -->
---
instruction_id: consume-an-unknown-format-version-in-best-effort-mode
title: Consume an unknown format version in best-effort mode
summary: A corpus declares the version it targets; a consumer that does not understand that version reads the corpus as well as it can instead of refusing it.
capability_tags:
  - curate-context
pattern_tags:
  - permissive-conformance
conditions_applies_when: A consumer meets a corpus whose declared version it does not know.
conditions_does_not_apply_when: The consumer understands the declared version.
artifact_contract_output_type: best-effort-read
artifact_contract_required_data:
  - the declared version
  - what the consumer could read
artifact_contract_verified_by: the corpus was read as far as the consumer could and was not refused
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Consume an unknown format version in best-effort mode
Bundles MAY declare the version they target with `okf_version: "0.2"` in a bundle-root `index.md` frontmatter block (the only place frontmatter is permitted in an `index.md`).
Consumers that do not understand the declared version SHOULD attempt best-effort consumption rather than refusing the bundle.
<!-- vpmodule:atom:end consume-an-unknown-format-version-in-best-effort-mode -->
<!-- vpmodule:atom:begin derive-the-trust-tier-from-the-verifier -->
---
instruction_id: derive-the-trust-tier-from-the-verifier
title: Derive the trust tier from the verifier
summary: "The trust tier of a document is derived from who verified it: nobody, only machines, or a person."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - trust-signals
conditions_applies_when: A consumer has to say how far it trusts a document.
conditions_does_not_apply_when: The consumer only needs the content of the document.
artifact_contract_output_type: trust-tier
artifact_contract_required_data:
  - the verification entries
  - the tier derived from them
artifact_contract_verified_by: the tier follows from the verifiers and a single verifier is read as one entry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body maps verifier identity to trust labels for documents; it does not identify what the document is about, so a content domain would be inferred."
---

# Derive the trust tier from the verifier
Consumers derive a trust tier from `verified`, lowest to highest:
- No `verified` key ⇒ **unverified**.
- `verified` by non-`human:` actors only ⇒ **machine-confirmed**.
- `verified` by a `human:<id>` actor ⇒ **human-reviewed**.
A single verifier MAY be written as one `{ by, at }` mapping without the list dash.
Consumers MUST treat a bare mapping as a one-element list:
<!-- vpmodule:atom:end derive-the-trust-tier-from-the-verifier -->
<!-- vpmodule:atom:begin describe-a-concept-with-its-title-description-and-resource -->
---
instruction_id: describe-a-concept-with-its-title-description-and-resource
title: "Describe a concept with its title, description and resource"
summary: "A concept carries a title, a one-sentence description, the URI of the asset it describes and its tags, so that a consumer can list, preview and find it without opening the body."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - output-formatting
conditions_applies_when: A concept document is written.
conditions_does_not_apply_when: The concept describes an abstract idea and has no underlying asset.
artifact_contract_output_type: concept-metadata
artifact_contract_required_data:
  - the title
  - the description
  - the resource
  - the tags
artifact_contract_verified_by: "the concept carries a title, a single-sentence description, the URI of the asset it describes and its tags"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Describe a concept with its title, description and resource
`title`: Human-readable display name.
If omitted, consumers MAY derive a title from the filename.
`description`: A single sentence summarizing the concept.
Used by `index.md` generators, search snippets, and previews.
`resource`: A URI that uniquely identifies the underlying asset the concept describes.
Absent for concepts that describe abstract ideas rather than physical resources.
`tags`: A YAML list of short strings for cross-cutting categorization.
<!-- vpmodule:atom:end describe-a-concept-with-its-title-description-and-resource -->
<!-- vpmodule:atom:begin favour-structured-markdown-over-freeform-prose -->
---
instruction_id: favour-structured-markdown-over-freeform-prose
title: Favour structured markdown over freeform prose
summary: "The body of a document is written as structure — headings, lists, tables, fenced code — because structure serves both the human reader and the agent that retrieves it."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: The body of a document is written.
conditions_does_not_apply_when: The document holds only a single sentence of prose.
artifact_contract_output_type: structured-body
artifact_contract_required_data:
  - the sections of the body
  - the structural elements used
artifact_contract_verified_by: the body uses structure rather than freeform prose
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - design-ux
---

# Favour structured markdown over freeform prose
The body is standard markdown.
Producers SHOULD favor structural markdown (headings, lists, tables, fenced code blocks) over freeform prose, since structure aids both human reading and agent retrieval.
There are no required body sections.
<!-- vpmodule:atom:end favour-structured-markdown-over-freeform-prose -->
<!-- vpmodule:atom:begin give-each-computation-its-own-trust-state -->
---
instruction_id: give-each-computation-its-own-trust-state
title: Give each computation its own trust state
summary: "A sanctioned computation is its own document, so that every figure verifies, expires and attests on its own."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - attested-computation
conditions_applies_when: A corpus states how a value is computed and how each figure is confirmed.
conditions_does_not_apply_when: The value is computed by the reader itself.
artifact_contract_output_type: computation-concept
artifact_contract_required_data:
  - the computation document
  - the trust state of each figure
artifact_contract_verified_by: each figure has its own document and its own verification and expiry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - business
---

# Give each computation its own trust state
A sanctioned computation is a standalone concept of `type: Attested Computation`.
**Trust state is per computation.**
`verified`, `stale_after`, and a single `attester` describe one thing.
Revenue, profit, and margin each verify and attest independently, which is three concepts, not three entries in one frontmatter.
**One computation, many consumers.**
The same computation can back a metric, a dashboard concept, and a report; as a concept it is referenced once and reused.
**`runtime` defines what `parameters` mean.**
A parameter is a SQL bind variable, a dbt var, or a Python argument depending on the runtime.
<!-- vpmodule:atom:end give-each-computation-its-own-trust-state -->
<!-- vpmodule:atom:begin infer-trust-from-objective-signals-not-from-a-stored-score -->
---
instruction_id: infer-trust-from-objective-signals-not-from-a-stored-score
title: "Infer trust from objective signals, not from a stored score"
summary: "Trust is inferred from objective per-source signals; no credibility score is stored, and a usage count is read as liveness and trend rather than as a ranking."
capability_tags:
  - research-primary-sources
pattern_tags:
  - trust-signals
conditions_applies_when: A consumer judges how far to trust a concept by the sources it was extracted from.
conditions_does_not_apply_when: The judgement is about who may read the document rather than about how credible it is.
artifact_contract_output_type: trust-signals
artifact_contract_required_data:
  - the signals of each source
  - the usage window
  - the reading of the usage count
artifact_contract_verified_by: no credibility score is stored and the usage count is read as liveness and trend
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Infer trust from objective signals, not from a stored score
The format records objective, per-source signals so a consumer can judge how much to trust a concept by judging the sources it was extracted from.
It does not store a credibility score: a score is subjective, unportable across consumers, and goes stale.
Each signal is optional and lives on a `sources` entry:
- `author`: Who or what produced the source, in the actor convention (§7).
An authority signal.
- `usage_count`: How often `resource` was exercised (dashboard views, query executions, page reads) over `usage_window`.
- `last_modified`: When the source itself last changed.
- `usage_window`: Written once as a sibling of `sources`, it frames every `usage_count` with a `{ from, to }` datetime range.
A single entry MAY carry its own `usage_window` to override the shared one.
`usage_count` is a coarse signal.
It is comparable at the alive-versus-dead and order-of-magnitude level, and against a source's own history over time, but not as a precise cross-kind ranking: a scheduled query's executions and a human's deliberate dashboard views do not carry equal weight.
Consumers SHOULD read it as liveness and trend, not as a score.
<!-- vpmodule:atom:end infer-trust-from-objective-signals-not-from-a-stored-score -->