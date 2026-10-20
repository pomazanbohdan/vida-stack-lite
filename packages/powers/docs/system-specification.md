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
  title: Accepted decisions D1–D11
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
revision: '3'
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
- **SR-26.** The groups are independent; alternatives in one group are mutually exclusive (`test-first-development` ↔ `test-after-development`), `risk-based-testing` — a compatible addition.
- **SR-27.** Inheritance is explicit and selective by stable IDs; implicit full inheritance through a shared repository is not applied.
- **SR-28.** A local override has priority over the inherited one without repeated confirmation; two contradictory inherited alternatives → a block with a request to the owner.
- **SR-29.** A task-scoped override is a one-off agreed exception for a task and a product: it is recorded, passed to child agents; it does not change the permanent profile, other products, permissions or security gates.
- **SR-30.** Live Inheritance: references to stable IDs without version pinning; a change of behavior = a **new pattern ID**, not a substitution under the same ID.
- **SR-31.** The flow level, applicability and requirement level (`required`/`conditional`/`optional`) are separate properties. `Light` does not skip mandatory AC, materialization and mandatory gates; `Full` does not mean performing all stages.
- **SR-32.** The roles (Researcher, Analyst, Decision Reviewer, Requirements Specialist, Test Designer, Implementer, Automation Tester, Manual/UI Tester, Independent Reviewer, Verifier) are formed as needed; the requirement level of a role ≠ actual participation. Independent verification is not replaced by the author's self-review.
- **SR-33.** One profile schema — different carriers: Runtime → a section in `.vida/project.yaml`; Standalone → the same section in the managed YAML block of the instruction file; host shim → the project config file.

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
- **SR-58.** Bootstrap passes minimal rules, the product identity, references to the methodology and current artifacts; the whole corpus is not loaded into the session — only the bundle enters the session, limited to **≤ 20 instructions and ≤ 64 KB** of total text.
- **SR-59.** Activation verification: the start of a session, recovery after compaction, the context of a delegated agent. The absence of a host capability is a **limitation**, not an equivalent check. `vp-setup` preserves third-party instructions and the current source map (SR-75).
- **SR-60.** A new or changed hook hash requires native review; a trust entry is not synthesized — a trust GAP is recorded, not bypassed.
- **SR-61.** Recovery after compaction restores the pointers and the state, rather than repeating completed content actions.

## 12. Formats

- **SR-62.** The machine formats that the shipped code reads are JSON (catalog, profiles, registry, work records); YAML — only human manifests. The exception is the format of the instruction itself: `.md` with frontmatter of a limited YAML subset (the product's own format).
- **SR-63.** The code shipped in the skills runs without a build under Bun/Node/Deno: only `node:` modules, no external dependencies and no Bun-specific APIs.
- **SR-64.** VP dev tools run under the project runtime (Bun) and may use Bun-specific APIs.
- **SR-65.** One canonical owner per document and contract; parallel copies of normative text are forbidden.

---
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

---

**Synchronization with research.** An S change that changes the intent entails an update of research (§7.1) and an impact assessment on decisions, requirements, tasks and checks (§7.6).
