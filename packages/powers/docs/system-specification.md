---
type: System Specification
title: Vida Powers — system specification
description: 'The observable behavior of Vida Powers: the instruction and catalog model, selection operations, routing, methodology profile, materialization, findings and operational rules.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- system-specification
- observable-behavior
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers — business requirements
- id: decisions
  resource: /decisions/index.md
  title: Accepted decisions D1–D13 (and D4b)
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
revision: '11'
---

S-level: **what VP does, observably**. The B-level — `business-requirements.md`,
the research output — `research/vida-powers-product-research.md`. Each clause has a stable
ID `SR-nn`; the criteria — in `acceptance.md`. Research rules are not duplicated: here only
normative behavior.

## 1. Instruction

- **SR-01.** An instruction is an `.md` file with frontmatter: `instruction_id` (kebab-case, stable, not reused, = the file name), `title`, `summary`, `revision` ≥1, `status` (`active`/`disabled`). These are the canonical field names; the encoding of the fields in the frontmatter and the exact composition of the catalog are defined in `catalog-design.md`.
- **SR-02.** Two dimensions of tags: `capability_tags[]` (what to do) and `pattern_tags[]` (which methodology). A tag ≠ an agent/skill/step/permission.
- **SR-03.** A tag is kebab-case with at least two meaningful components; abbreviations — aliases, the canonical tag dominates.
- **SR-04.** An active instruction has ≥1 capability tag and ≥1 pattern tag; an absence is closed by an **explicit exception entry with a reason**.
- **SR-05.** Each tag has a description in the catalog vocabulary; a tag without a description — a validation error.
- **SR-06.** Mandatory fields: `conditions`, `artifact_contract`, `compatibility` (`excludes`, `requires`), `provenance` — a **list of sources** (donor, license, revision, path); an instruction may have several sources after merging duplicates. The other composite fields are encoded by flat prefixed keys (`conditions_applies_when`, `artifact_contract_output_type`, `compatibility_excludes` and so on) — without nested maps; the source list — as lines `donor=…; license=…; revision=…; path=…`. Additionally permitted are the **optional** fields `roles[]` and `products[]` — carriers of the search dimensions by role and by product (SR-10, SR-70); an absence or an empty list means "applicable to any role/product".
- **SR-07.** `provenance` is mandatory and has at least one source. Each source — a line `donor=…; license=…; revision=…; path=…`; the license and the revision come from the donors manifest, and `revision` **must equal** `donors.yaml[donor].head_sha`. Without provenance an instruction is not accepted. Merging duplicates preserves all sources in one instruction, selects the better terminology and raises `revision`.
- **SR-77.** The body of a corpus instruction is the normative text of its donor in the original language, reduced to an atomic norm. Only these edits are permitted: cutting the parts that are not relevant to the norm, merging duplicated sentences, replacing donor names with neutral ones, moving the binding to the norm, and adding an explicit step that states what is considered done. A translation, an invented rule, a weakened strictness, an added requirement the donor does not have and a dropped constraint are defects. The fidelity of a body to its donor is checked by the corpus audit (`scripts/audit.ts fidelity`): a body line whose token run is not found in a declared donor file is reported for review, and the review — not the count — decides. (D11)
- **SR-08.** `artifact_contract` is mandatory. For instructions that produce a result, `artifact_contract_output_type` and `artifact_contract_verified_by` are non-empty, `artifact_contract_required_data` may be empty. For guidance instructions, `artifact_contract_output_type` = `none`, `artifact_contract_required_data` is empty.

## 2. Catalog operations

- **SR-09.** `catalog.tags` → the available capability/pattern tags with descriptions, in a stable order; without instruction texts.
- **SR-10.** `catalog.search` by a set of capability tags, pattern tags, identifiers, role, product and/or application conditions (SR-70) returns **only metadata** (ID, title, short description, tags, revision) — no full texts. The filters combine: tags within one dimension — "at least one", between dimensions — "and"; role, product and conditions — a conjunction.
- **SR-11.** `catalog.get` → the full text of the **exactly specified** instruction; an unknown ID — an error, not an empty result.
- **SR-12.** `catalog.compose` → the found + mandatory + transitive dependencies, after a compatibility check and removal of duplicates.
- **SR-13.** Mandatory and dependent instructions are not discarded because of a relevance score; the registry limits of the research contour do not extend to VP.
- **SR-14.** An `excludes` conflict (in either direction) → an error with the name of the conflicting pair; an unknown or disabled dependency → a separate error. A pair declared as **opposing** (D12) — the two instructions name each other and share one theme pattern tag — is reported with both names; where the pair is the alternatives of one profile group, the active alternative enters the bundle and the other does not.
- **SR-15.** The catalog = instructions (`.md` + frontmatter) + the machine manifest `VPCatalog/v1` (`catalog.json`: identity, tag vocabulary, aliases, exceptions); `revision` describes the content, the package version is a separate value.

## 3. Decision Provider

- **SR-16.** `decision.evaluate`: input — the operation, the product, the task context, tags, the **already admissible candidates**; output — the selected IDs, the score, the justification, the identification of the provider, the refusal marker and reason. In v1 the scoring is **deterministic**: the operation returns a shortlist or a refusal reason (no candidates, unknown candidate ID, candidate outside the admissible, malformed format); semantic scoring remains with the skill (D5), an external provider — a host capability.
- **SR-17.** Implementations: the master LLM of the agent (typical) and an external provider, if the host configuration specifies it. There is no tie to a vendor API.
- **SR-18.** **Agent Fallback is mandatory:** unavailability, timeout, API error, malformed format, unknown candidate ID, insufficient confidence → the choice passes to the main agent; scope, policy and validation remain in force.
- **SR-19.** Fallback does not replace a choice that belongs to the user.
- **SR-20.** The source of the decision, the selected IDs and the fallback reason are materialized.
- **SR-21.** The relevance threshold is calibrated **per operation**; for an uncalibrated operation it is not applied, and the result is marked as uncalibrated. A high score ≠ proof of correctness, permission or completion.

## 4. Routing

- **SR-22.** Routing = **LLM selection** → **agent formation** according to a fixed reference (the catalog) → **flow level** (`Full` / `Medium` / `Light` or another profile).
- **SR-23.** The formed agent receives: role, task contract, effective methodology, Work Scope, materialization requirements, references to artifacts.
- **SR-24.** Routing does not compile an execution graph: the route belongs to VIDA Core/Mastra (Runtime) or to the host agent (Standalone); VP provides only a description of the admissible options (`workflow.options`).

## 5. Methodology profile

- **SR-25.** The profile (`VPMethodologyProfile/v1`): selection groups (`testing-sequence`, `review-strategy`, `architecture`, `delivery`, `approval-policy`), active alternatives, compatible additions, conditional dependencies. The groups and their alternatives are declared by the **profile**; an instruction binds to a group through its `pattern_tags`, and **each alternative has its own pattern tag** (the shared group tag is a search marker, not an alternative). The resolved (effective) profile — `VPEffectiveProfile/v1` (D10). Groups with a product policy have an **explicitly declared** active alternative in the source profile (`default`); for groups where the choice is made by the user, `default` is forbidden (D10 §1).

Canonical profile/schema metadata reused by compose is bound to the exact current bytes of both files, decoded with strict UTF-8. Changed bytes require validation before reuse. An unreadable, ill-formed UTF-8 or invalid replacement fails closed; a prior cached parse cannot make that replacement valid. This does not replace the caller's agreed task snapshot under SR-67.
- **SR-26.** The groups are independent; alternatives in one group are mutually exclusive. The current user-choice `approval-policy` alternatives are `approval-policy-proceed` and `approval-policy-gate`; compatible additions are admitted only where the profile declares them.
- **SR-27.** Inheritance is explicit and selective by stable IDs; implicit full inheritance through a shared repository is not applied.
- **SR-28.** A local override has priority over the inherited one without repeated confirmation; two contradictory inherited alternatives → a block with a request to the owner.
- **SR-29.** A task-scoped override is a one-off agreed exception for a task and a product: it is recorded, passed to child agents; it does not change the permanent profile, other products, permissions or security gates.
- **SR-30.** Live Inheritance: references to stable IDs without version pinning; a change of behavior = a **new pattern ID**, not a substitution under the same ID.
- **SR-31.** The flow level, applicability and requirement level (`required`/`conditional`/`optional`) are separate properties. `Light` does not skip mandatory AC, materialization and mandatory gates; `Full` does not mean performing all stages.
- **SR-32.** The roles (Researcher, Analyst, Decision Reviewer, Requirements Specialist, Test Designer, Implementer, Automation Tester, Manual/UI Tester, Independent Reviewer, Verifier) are formed as needed; the requirement level of a role ≠ actual participation. Independent verification is not replaced by the author's self-review.
- **SR-33.** One profile schema — different carriers: Runtime → a section in `.vida/project.yaml` after the approved cutover (D8); Standalone → the same section in a managed block with a JSON payload in `AGENTS.md` or `CLAUDE.md` (the YAML carrier); host shim → the project config file.

## 6. Two forms of an instruction

- **SR-34.** An instruction has two forms: a **document** (the source; `.md` with frontmatter) and a **registry entry** (derived, for activation). The entry is bound to the document by a digest.
- **SR-35.** A registry entry carries a reference to the source, the content digest, the activation class, conditions (`triggers`/`phases`/`lanes`), `output_schema`, a size limit, a privacy class, a status. A digest mismatch — an activation error.
- **SR-36.** The registry boundaries (entry limit, path template, size limits) are constraints of the system registry, not of the VP model; an extension for VP — a separate runtime request to the agent maintainer.

## 7. Materialization

- **SR-37.** After a content operation a readable result remains, or an explicitly recorded update of an existing one.
- **SR-38.** Three parts: **Content Artifact** (the result), **Artifact Reference** (ID, type, product, binding to scope/work, locator, revision/digest, links), **Action/Event Record** (who, when, did what, checked, approved or could not).
- **SR-39.** `ResearchResult/v1`, `ResearchSynthesis/v1`, `DecisionRecord/v1`, `AcceptanceManifest/v1`, `ImplementationScope/v1`, `WorkItem/v1`, `WorkState/v1`, `LifecycleArtifactReference/v1`, `WorkArtifactReference` are reused; VP creates no parallel versions.
- **SR-40.** Work Item: a stable ID, goal, Work Scope, AC, links (`derived-from`, `informs`, `implements`, `tests`, `blocks`, `supersedes`, `changes`, `found-during`), evidence. The draft is refined in place; after acceptance the scope is frozen; a completed task is not rewritten — a new Work Item is created with a link.
- **SR-41.** The presence/format/digest check and the semantic check are different operations; both are needed to close an AC.
- **SR-42.** A handoff is confirmed only after checking the availability of the output and its compliance with the contract; the evidence is bound to the revision that was checked.

## 8. Findings

- **SR-43.** A finding records the problem, the evidence, the source, the product, the link to work/scope, the blocking impact. Creating a finding does not authorize a fix.
- **SR-44.** The record is centralized: one writer; subagents return structured messages; in Runtime the record goes through the state owner.
- **SR-45.** Deduplication: identity → deterministic search (ID, fingerprint, context, provenance) → semantic candidates → equivalence check (reproduction, context, evidence). A location match or a high score is insufficient; ambiguity is not merged; a repeated delivery creates no event.
- **SR-46.** The history is append-only: primary observations are not deleted, a merge is a separate event.
- **SR-47.** `findings` in a research document are research statements, not entries of the defect registry.
- **SR-78.** The severity of a finding is expressed on one scale across the corpus: Critical, Important, Minor. An instruction that states a finding severity uses these three labels and keeps the criteria of each level. A risk scale, an effort scale and a status vocabulary keep the donor's own labels. (D13)

## 9. Join and Lifecycle Scope

- **SR-48.** `blocking` — the parent stage waits for the result and its acceptance; `non-blocking` — does not delay the completion of the parent stage. Errors and unfinished results are recorded and returned to the owner.
- **SR-49.** `non-blocking` does not lower the requirement level: a result needed for an AC or a gate cannot be optional.
- **SR-50.** Lifecycle Scope: `parent`, `workflow`, `independent`. For each scope the owner, the identity, the place of the result, the observable state, the completion/cancellation mechanism are defined.
- **SR-51.** Start ≠ completion; a cancellation request ≠ proof of a stop; a preserved context ≠ proof of ongoing execution.
- **SR-52.** Work Scope — the volume, Lifecycle Scope — the duration; no lifecycle model expands the Work Scope; in Standalone there is no durable execution infrastructure of its own.

## 10. Scope-First

- **SR-53.** Instructions, routing and nested tasks are limited by the Work Scope; methodology, coverage/security considerations, a relevance score and the status of an independent agent do not give the right to expand the scope.
- **SR-54.** Finding classes: a bug within the work — fixed within it; an AC blocker outside the authority — a blocker and a permission request; a third-party bug that does not block — a separate finding; an improvement/optimization — a separate entry; under the agreed auto-fix policy, third-party work — separately after the main one.
- **SR-55.** Without standing permission, a proposal to fix a third-party problem is an optional human loop after the main work.

## 11. Operational rules

- **SR-56.** `vp-setup` is idempotent: a repeated run on unchanged input creates no duplicate blocks, hooks, entries or canonical documents.
- **SR-57.** `vp-setup` does not change files of the installed agent package; the root `AGENTS.md` of the agent is generated from the package template and is not edited.
- **SR-58.** Bootstrap passes minimal rules, product identity, methodology and current-artifact references; the whole corpus is not loaded into the session. The composed bundle contains at most **20 instructions** and **64,000 UTF-8 bytes**, inclusive. Measure the sum of each selected instruction's `content` bytes after profile filtering, active-alternative substitution, and full required/transitive dependency closure. `1 KB` means 1,000 bytes. Exclude the tag dictionary, JSON/envelope, instruction metadata, and execution context. Overflow returns `CATALOG_BUNDLE_LIMIT_EXCEEDED` for the whole result; never trim or return a partial bundle.
- **SR-59.** Activation verification: the start of a session, recovery after compaction, the context of a delegated agent. The absence of a host capability is a **limitation**, not an equivalent check. `vp-setup` preserves third-party instructions and the current source map (SR-75).
- **SR-60.** A new or changed hook hash requires native review; a trust entry is not synthesized — a trust GAP is recorded, not bypassed.
- **SR-61.** Recovery after compaction restores the pointers and the state, rather than repeating completed content actions.

## 12. Formats

- **SR-62.** The machine formats that the shipped code reads are JSON (catalog, profiles, registry, work records); YAML — only human manifests. The exception is the format of the instruction itself: `.md` with frontmatter of a limited YAML subset (the product's own format).
- **SR-63.** The code shipped in the skills runs without a build under Bun/Node/Deno: only `node:` modules, no external dependencies and no Bun-specific APIs.
- **SR-64.** VP dev tools run under the project runtime (Bun) and may use Bun-specific APIs.
- **SR-65.** One canonical owner per document and contract; parallel copies of normative text are forbidden.

---

## 13. Requirements added by the round 3 validation

This section was added following the results of a comprehensive validation (round 3). Thematically
the clauses belong to §1, §2, §3, §5, §8, §9 — they are placed together so as not to break
the existing numbering.

- **SR-66.** The corpus processing map (`VPCorpusMap/v1`, `packages/powers/corpus-map.json`)
  records for each donor (with a **fixed revision**) and each carrier file
  the result: `converted` (one instruction), `split` (several), `merged` (the merge
  target, `contributed_sources` — the contributing sources), `rejected` (with a `reason`).
  Conversion is idempotent by (donor, revision, path): a repeated run on the same
  revision changes nothing. An instruction without an entry in the map, a map entry pointing to a missing
  instruction, and a `rejected` without a reason — errors.
- **SR-67.** Within an active task the agreed **snapshot** of
  applied instructions applies; the next task may receive a more current compatible
  revision. Changed input invalidates only the evidence bound to it.
- **SR-68.** Changes of instructions are classified by risk: low — a clarification without
  a contract change, auto-acceptance; medium — semantic compatibility, a regression eval
  and an independent review; high — confirmation by a human. A change of semantics is issued as
  a **new pattern ID**, not as an edition of the same instruction. The accepted revision
  records the origin, the authorship, the checks and a separate change entry.
- **SR-69.** The product has a stable identifier independent of the path; shared code
  is not automatically reduced to the methodology of the nearest directory — for each
  covered product its policy, scope and sources are taken into account. Under real
  methodological variability the user's choice is obtained **once** and
  recorded; under an existing recorded policy it is not requested again.
- **SR-70.** `catalog.search` supports filters: capability tags, pattern tags,
  identifiers, role, product and application conditions. In the result — only metadata.
- **SR-71.** Executing a scenario by a UI agent **is not** human acceptance: without the required
  human answer the result remains `awaiting-human-verification`, not PASS.
- **SR-72.** In Standalone the last entry is determined by the agent transparently, without a system
  of rights, lease or reservation; hidden overwriting of others' changes is forbidden, conflicts
  are resolved by the practical means of the host. No lifecycle model expands the
  Work Scope.
- **SR-73.** Search covers the ID, filename, title, body, type, product, tags/labels and
  relations. The full-text index is **derived** and recoverable; it does not duplicate
  the normative documents, and a third-party normative document outside `wiki_root` is indexed
  by reference.
- **SR-74.** Any agent may involve other agents for its own subtasks, in particular
  for research, analysis, preparation of an instruction, testing or review. The right to
  **request** a specialist does not equal the right to **grant** it new authority.
  The workflow graph and the delegation tree are different structures: nested work adds no
  external stages and does not bypass gates. Depth, concurrency and resource limits
  are determined by the execution owner (Runtime or the host), not by VP.
- **SR-75.** `vp-setup` preserves third-party instructions and the current source map; only
  the appropriate VP part of the integration is updated, and an existing Runtime-owned file is not turned into another
  owner of policies.
- **SR-76.** The catalog manifest (`catalog.json`) is the **single listing of the corpus**: for each
  instruction — `instruction_id`, `path` and the `sha256` of the content. A file in `instructions/` that is
  not in the manifest, a file in the manifest that is not on disk, and a digest mismatch —
  errors. The manifest is written only by the converter (the single writer); runtime scripts only read.
- **SR-79.** Delivery manifests declare the shipped `vp-mode` and `vp-setup` skills through each selected
  host's supported field shape: Codex compatibility `plugin.json` uses `skills: "./skills/"`; Claude and
  Cursor list `./skills/vp-mode/` and `./skills/vp-setup/`; Claude marketplace output includes the package
  description at top level. Before a host write or successful check, the
  builder verifies both `SKILL.md` resources are regular files rooted in the package and rejects missing
  paths or symlink traversal. The portable root manifest has no `skills` field and relies on standard
  `skills/` discovery. The `catalog.json` remains the canonical corpus listing, accessed through the CLI
  and skill; manifests do not copy the catalog or add a vendor-specific catalog field. Local generation
  requires only metadata required by selected host formats and never fabricates missing values. D4b's
  owner-supplied public-release metadata remains a separate publication gate. Current target status and
  deferred E5b gaps are recorded in `task-plan-step-e.md#e5-target-status`.
- **SR-80.** Manifest generation owns only files recorded in its package-local ownership ledger and
  whose current SHA-256 matches the recorded digest. It regenerates or prunes only proven-owned files;
  foreign or modified targets conflict before writes. Check mode reconciles ledger digests against present
  outputs: a present output without a ledger entry or with a mismatched digest returns
  `MANIFEST_OUTPUT_CONFLICT`; an initially absent expected output remains `MANIFEST_OUTPUT_MISSING`.
  Missing, drifted and stale outputs remain distinct. Check mode snapshots file bytes and direct-directory
  membership, performs read-only path, skill, ledger and transaction preflight, and rejects corrupt
  ownership or retained transaction state without changing that snapshot. Writes are staged and
  recoverable; an unresolved transaction fences later writes until reconciled.

---

**Synchronization with research.** An S change that changes the intent entails an update of research (§7.1) and an impact assessment on decisions, requirements, tasks and checks (§7.6).

## 14. Accepted phased content scope (D14, D15)

The clauses below define future work. They do not change current E4 behavior or prove donor admission, rights clearance, implementation, or Runtime acceptance.

- **SR-81.** D14 permits one bounded engineering/UX, product and business instruction pack. Use its selected domains and one canonical instruction catalog. Source selection records the pinned donor, carrier path, raw digest, domain, exact selection rationale, previous disposition and reason, scope decision and required applicability behavior. A family label is not an allowlist. Preserve journey exclusions; former domain exclusions remain pending reconsideration and unpublished until individual gates close. Source review, applicable rights clearance and attributable owner admission are required for each published subset. General product/business methods do not wait for unrelated H3 typed resources; domain-sensitive applicability still requires H2.
- **SR-82.** An instruction with domain-dependent applicability carries structured facts for framework or package identity, declared version range, runtime, target platform, standard identifier, standard version, and conformance level where relevant. Preserve the donor's original applicability label. Parse version labels under a defined rule before matching; an unparsed label never matches automatically. Distinguish applicable, inapplicable, and unresolved. Missing, conflicting, or unknown required context yields no applicable selection and the visible refusal reason applicability-unresolved. This filter is independent of compatibility dependencies and opposing-instruction rules.
- **SR-83.** D15 permits only typed palette, font-pairing, style, icon-list, and standards-checklist records. An actionable rule is an instruction; reference data remains a typed record with a stable resource ID, resource type, schema version, revision, provenance, source locator, and content digest. Exact-ID retrieval uses catalog.resource.get through the existing catalog and portable reader. Search returns metadata only; reference records are not automatically retrieved, activated, or included wholesale. The canonical catalog manifest remains the single listing; adding resources requires an explicit versioned manifest/schema migration and does not create a second catalog or activation path.
- **SR-84.** The future processing map accounts for every selected carrier file and every candidate CSV row. Each source unit has a stable identity and an explicit disposition: one or more instruction IDs, one or more resource IDs, merged with retained source locators, or rejected with a reason. Row identity uses a donor entity ID and source key where available; otherwise it binds the canonical source path and a digest of ordered parsed headers and cell values. Keep a separate raw-file digest. Do not use line numbers, trim, case-fold, or Unicode-normalize cell content when computing source identity. Reordering rows leaves identity stable; editing a cell changes its content digest. An identical duplicate is merged with every locator retained or rejected with a reason.
- **SR-85.** CSV parsing is a development-only intake operation over pinned, allowlisted sources. It accepts strict UTF-8, quoted commas, and quoted newlines; empty or duplicate headers are errors. Formula-like or command-like cell values remain inert. The map binds each instruction to its exact source rows and cells and records cell roles. Fidelity review checks meaning, original language, strictness, negation, units, applicability, severity, and exceptions against those cells; token matches elsewhere in the file are not evidence. A human review decides semantic fidelity.
- **SR-86.** The shipped resource reader uses only portable standard APIs and validates canonical containment, rejects symlink traversal, verifies content digests, schema and record type, encoding and size, and marks retrieved text as untrusted source data. It reads only explicitly selected resource IDs; a diagnostic read of one ID is not a qualified composed session bundle. The original CSV and unselected rows are never injected as assets.
- **SR-87.** When resource retrieval is implemented, the existing 64,000 UTF-8 byte cap applies to the sum of selected instruction content and selected resource payloads serialized as canonical UTF-8 JSON. The limit of 20 applies to instructions only. Resource metadata, outer JSON envelope, and execution context remain excluded. Overflow rejects the entire result without truncation or partial output.

- **SR-88.** Development-only Markdown source packets bind donor, pinned revision, canonical carrier path, raw-byte SHA-256 and byte length. Capture rejects malformed UTF-8, retains a leading BOM as U+FEFF, preserves raw newlines and splits display lines on CRLF/LF/CR. Locators are one-based lines with half-open Unicode-codepoint ranges and separate UTF-8 byte offsets. No trimming or Unicode normalization changes identity. Evidence references bind exact artifacts and stage inputs; missing, stale or contradictory evidence blocks reuse. CSV identity remains SR-84, not this Markdown locator contract.
- **SR-89.** Source packets remain preparation artifacts. Deterministic assessment verifies source, selection, decomposition, check and review bindings, but cannot grant authority. Root reconciles attributable human fidelity, rights and owner-admission decisions for the exact proposed subset before constructing publication eligibility. Model review or a matching digest cannot substitute for those decisions. Only evidence dependent on changed inputs is invalidated; a scoped delta never becomes a full-source review.
- **SR-90.** The existing converter owns prepared batch compilation and publication. Preserve the signatures and results of convert(specPath, options) and convertMany(specPaths, options), including their legacy sequential partial-success behavior. Prepared publication preflights all specs, IDs, tags, donor revisions and target preimages, compiles catalog/map once, stages immutable outputs and requires exact-plan independent review and Root ownership before writes. A changed donor revision cannot erase stored mappings incidentally. Unknown effects fence retry; reconciliation classifies changed targets as all-old, all-intended, mixed or conflict, and handles no-op targets separately. Several filesystem replacements are not one atomic transaction. Retain before-images, staged outputs and unknown receipts; never infer stopped-writer status from elapsed time.
- **SR-91.** Before claiming donor throughput improvement, record a pre-treatment baseline and matched treatment cohort with identical eligibility, quality/review criteria and reusable evidence, pinned inputs/tools, terminal outcomes, failures, rework and elapsed time. Component fixture timings do not establish end-to-end donor speedup. H1 retains ten distinct source files and batches of at most 25 until separately reviewed; H2 follows H1 and H3 follows H2 for their respective behaviors.

Reconversion under SR-90 preserves a previously merged disposition when its output is already mapped, and preserves contributed source locators. Adding another output records a split while retaining those locators. This corrects the previous map-replacement behavior without changing public signatures or legacy sequential partial success. Prepared preflight verifies both directions of every selected source-to-spec provenance link before any publication.

### Existing clause clarifications
- **Interpretation of SR-16 and SR-20.** Current v1 refusal triggers remain exactly four: no candidates, unknown candidate ID, candidate outside the admissible set, and malformed format; the current codes are no-candidates, unknown-candidate, candidate-not-allowed, and invalid-format. The fifth code applicability-unresolved is a future extension for SR-82 only. Once that phase is implemented, SR-20 also materializes this reason and the unresolved context; it is not a current E4 behavior.
- **Interpretation of SR-58.** The current 20-instruction / 64,000-byte contract remains. After D15 retrieval is implemented, the 20 cap still counts instructions only and the 64,000-byte sum also counts selected canonical UTF-8 JSON resource payloads. Overflow still rejects the whole result.
- **Interpretation of SR-62 through SR-64.** Shipped readers consume JSON, typed JSON records, and Markdown frontmatter; they never read CSV. Only pinned-source development intake may parse CSV, using the project runtime. Shipped skill code stays dependency-free and portable under Bun, Node, and Deno; Bun-specific APIs remain limited to development tools.
- **Interpretation of SR-70.** The future application filter is structured framework/package identity, version range, runtime, platform, standard identifier and version, and conformance level where relevant. It preserves source labels and never infers an unparsed range.
- **Interpretation of SR-73.** Resource bodies are not copied into the generic derived full-text index; typed resources are selected by exact ID and only metadata may appear in search.
- **Interpretation of SR-76.** catalog.json remains the single canonical listing. A versioned schema migration adds typed resource entries to that manifest before resource code; no second catalog is allowed.
- **Interpretation of SR-77.** CSV-derived instructions bind fidelity evidence to exact source rows and cells under SR-85. A token match elsewhere in a file cannot stand in for source-cell proof.
