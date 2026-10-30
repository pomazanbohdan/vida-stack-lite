---
type: Product Research
title: Vida Powers — product concept and architectural baseline
description: The current agreed concept of the Vida Powers portable agent plugin and its interaction with the VIDA Agent Runtime.
status: stable
stale_after: '2027-01-19T00:00:00Z'
tags:
- vida-powers
- agent-orchestration
- instruction-corpus
- artifact-first
- knowledge-governance
- runtime-integration
vida:
  id: vida-powers-product-research
  product: vida-powers
  parent_project: vida-agent-system
  kind: product-research
  revision: 6
  research_status: finalized
  implementation_status: not-started
  updated_at: '2026-10-25'
  runtime_source_commit: bb4345e107f9aee30db1c856075ac9556a7aa8a1
  validation_scope: conversation-consistency
  verification_scope: reconciliation of the research statements with the current Source during two independent review rounds; this is not runtime acceptance
  changelog_ref: /log.md
  authority: current-conversation-user-decisions-and-unsuperseded-provisions
sources:
- id: vida-runtime
  resource: https://github.com/pomazanbohdan/vida-stack-lite
  title: VIDA Agent Runtime — source repository and system specification
  author: team:pomazanbohdan
  last_modified: '2026-10-16T20:22:10Z'
  research_snapshot_revision: bb4345e107f9aee30db1c856075ac9556a7aa8a1
- id: superpowers
  resource: https://github.com/obra/superpowers
  title: Superpowers
  author: team:obra
  last_modified: '2026-10-09T17:28:04-07:00'
  research_snapshot_revision: bb92a77741419a4ab5f06e711a283343f1ada0c3
- id: bmad
  resource: https://github.com/bmad-code-org/BMAD-METHOD
  title: BMAD Method
  author: team:bmad-code-org
  last_modified: '2026-10-16T08:12:21-05:00'
  research_snapshot_revision: cfba3ff5f982c1809e060606e399f55ebd7bce5e
- id: matt-skills
  resource: https://github.com/mattpocock/skills
  title: Matt Pocock Skills
  author: team:mattpocock
  last_modified: '2026-10-09T11:56:49+01:00'
  research_snapshot_revision: 49dd158d1076134a641b33efb035946536778336
- id: addy-skills
  resource: https://github.com/addyosmani/agent-skills
  title: Addy Osmani Agent Skills
  author: team:addyosmani
  last_modified: '2026-10-13T16:21:06-04:00'
  research_snapshot_revision: aeac41d4d005999432bb7312f7ff06383a91d59d
- id: pstack
  resource: https://github.com/cursor/plugins/tree/main/pstack
  title: Cursor pstack
  author: team:cursor
  last_modified: '2026-10-16T10:07:24-07:00'
  research_snapshot_revision: 2f8377461fd533f5af782e1fd643783b1067b847
- id: gsd
  resource: https://github.com/open-gsd/gsd-core
  title: GSD Core
  author: team:open-gsd
  last_modified: '2026-10-16T13:52:18-04:00'
  research_snapshot_revision: 19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005
  research_snapshot_ref: next
- id: ponytail
  resource: https://github.com/DietrichGebert/ponytail
  title: Ponytail
  author: team:DietrichGebert
  last_modified: '2026-10-16T15:20:19+02:00'
  research_snapshot_revision: 6f1c2bfff0c837d268929a7c4e490918eb4fab29
- id: okf
  resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
  title: Open Knowledge Format v0.2
  author: team:GoogleCloudPlatform
  last_modified: '2026-08-21T13:08:36-07:00'
generated: { by: chatgpt/2026-10-17, at: '2026-10-17T00:45:42+03:00' }
verified:
- { by: deepseek/deepseek-flash, at: '2026-10-19T13:36:34Z' }
- { by: opencode/glm-5.3-flash-free, at: '2026-10-19T13:59:31Z' }
---

# Vida Powers — product concept and architectural baseline

## 1. Purpose and scope

**Vida Powers (VP)** is a portable agent plugin with one canonical catalog of atomic methodological instructions, bounded engineering/UX guidance, and selected typed reference records. It selects relevant knowledge, specializes agents, and defines how they materialize results. The plugin must work standalone in compatible AI hosts and, when the VIDA Agent Runtime is present, integrate with its existing execution management.

The initial methodology covers the full work lifecycle. D14 accepts one bounded engineering/UX pack and, under the owner's 2026-10-25 extension, product and business guidance. Selected domains include discovery, strategy, pricing, positioning, marketing, sales, growth, analytics and product organization. Each candidate still requires per-source research, fidelity, rights and owner admission; historical exclusions are not automatically promoted. D15 accepts selected typed reference data in a later phase. General methodology remains in the same catalog. Other unselected domains remain outside scope. D14 and D15 set product scope; they do not admit a donor or approve rights, schemas or Runtime acceptance. The owner separately requested implementation of the reviewed migration tooling.

**Current H1 preparation evidence (2026-10-25):** the ten existing held captures cover product discovery, business strategy, marketing, growth, UX and organization methods. Root compared every selected raw file, README and LICENSE with Git blobs at the pinned Wondelai revision `c172996495bed0fcd26896a9416b2093fd7073f0`; all selected bytes match. The MIT declarations and named-work attributions are carrier facts, not item-specific third-party permission. Exact passages/editions, overlap, human fidelity, rights and owner admission remain open. The prior eight-file rights cohort has no path/hash overlap with these ten; only its identical LICENSE carrier evidence is reusable. Complete `VPSourcePacket/v1` packets for this cohort: zero; current decomposition, per-unit selection, check, review and spec bindings still need preparation. These ten raw captures do not satisfy the ten-admitted-source-file H1 pilot. The retained local evidence is `packages/powers/.tmp/panel/donor-migration-architecture-20261025/continuation/` (`h1-rights.*`, `h1-pinned-evidence.json`, `h1-rights-addendum.json` and `h1-readiness.*`); it is not shipped content or a rights/admission decision.

Work starts from any state: a vague idea, a question, a research request, an accepted decision, a document, a defect, a ready task, a fragment of an implementation or a request for verification. **Finishing research does not mean starting implementation.** No automatic transition to a new scope of work happens without the corresponding authority.

**Document status:** finalized current research and agreed concept. D14 and D15 are accepted scope decisions. This is not proof that new content was admitted or implemented, not an approved low-level schema, and not Runtime acceptance.

VP is an autonomous installable plugin: ordinary use does not require installing the VIDA Agent Runtime. The shared canonical base is suitable both for Standalone and for use by the agent system. Packaging and distribution through a marketplace remain a target capability; the specific channels and the verified host support belong to the implementation stage.

**One main working entry point — the orchestration skill `vp-mode`; `vp-setup` — a separate auxiliary setup skill.** Donor skills become pluggable instructions rather than hundreds of separate user entry points. The user describes the desired outcome in ordinary language; they are not obliged to manually launch research, task definition, TDD, a tester, review and verification.

## 2. Separation of Vida Powers and VIDA Runtime

| Area | Vida Powers Standalone | VIDA Runtime |
|---|---|---|
| Methodological knowledge | Owner of the canonical instruction corpus | Uses the same instructions |
| Semantic search | `capability_tags`, `pattern_tags`, metadata, selection of the needed texts | Calls the shared resolver |
| Routing | Main LLM agent and native host tools; adaptive replanning | VIDA Core is responsible for governed execution |
| Executors | Dynamic role composition, host-native subagents | Agents through host adapters / Mastra |
| Formal workflow/DAG | **Has no own engine, scheduler or DAG state store** | Owner of the configured and dynamic workflow |
| Authorization/permission control | Follows the policies and native constraints of the host | Existing HostState, scope/lease/CAS/permissions |
| Materialization | Meaningful files + simple local records, without duplicating the Runtime | Existing file contracts and persistence through the Runtime |
| Findings | Local product-scoped JSONL | Product-scoped SQLite through the single persistence owner |
| UI | Not part of VP | Future separate interface on top of the VIDA API |

VIDA Runtime retains **two top-level modes**:

- **Dynamic:** fully adaptive decomposition and selection of the next steps; the owner of formal execution is VIDA Core/Mastra. This is a requirement for the target behavior, not a statement that all dynamic functions are ready in the current code.
- **Configured:** an immutable main graph from `.vida/flows.yaml`; dynamic nested work is allowed within the current node/stage, without inserting new stages into the main graph.

Any agent can **request** nested delegation for a task within the granted scope; the actual launch, permissions and execution accounting are controlled by the responsible owner: the master agent/native host in Standalone or VIDA Core in Runtime. Duplicating the Runtime's scheduler, ledger, authorization or state store inside VP is forbidden.

### 2.1 Hybrid agents and role contracts

The hybrid model combines a **stable catalog of base roles** with **dynamically specialized instances for the task**. The role defines responsibility; the Task Contract — the concrete goal; the selected atomic instructions — the execution techniques. This is not an arbitrary redefinition of a role during work and not a mechanical transformation of every skill into a separate agent.

An agent receives a role, a task from the user or a parent agent/Runtime, the allowed scope, the effective methodology of the product, the relevant instructions, references to input artifacts, the expected results and the way to verify them. A child task has its own identity and an isolated context; the full history of the main thread is not passed automatically. The parent accepts and verifies the result rather than merely relaying the child's self-report.

In Standalone the route is fully dynamic: the main thread is the orchestrator and uses the host's native subagents. A temporary plan and local work records are acceptable; no own formal DAG compiler and scheduler are created. In Runtime separate role tasks are executed through Core and the corresponding host adapter. Subagent support is a requirement for the target hosts; a missing or unverified capability is marked as a limitation, not as equivalent independent verification.

### 2.2 Recursive subtasks without double orchestration

Any agent can engage other agents for its own subtasks, in particular for research, documentation search, Wiki analysis, instruction preparation, testing or review. Further nested delegation is also allowed. The concrete dispatch goes through the execution owner of the corresponding environment; the right to invite a specialist is not equal to the right to grant them new authority.

**The workflow graph and the delegation tree are different structures.** In Configured mode, auxiliary research and other work stay inside the node of the normative YAML graph. The child result is aggregated into the result of that node; the agent does not add external stages, does not change mandatory transitions and does not bypass gates. In Dynamic mode the route adapts within the approved goal and scope.

Independent subtasks can work in parallel; shared changes are coordinated according to the rules of the write owner. Depth, concurrency and resource limits are controlled by host or Runtime means, without introducing an own scheduler in VP and without fixing universal numeric limits in this research.

### 2.3 Selective Join and lifecycle

| Property | Contract |
|---|---|
| `blocking` | The parent stage waits for the required subtask result and its acceptance |
| `non-blocking` | An auxiliary subtask does not delay the completion of the parent stage |
| Mandatory checks | A result required for an AC or gate cannot be declared optional through `non-blocking` |
| Errors | Errors and incomplete results are recorded and returned to the responsible owner |
| Late result | Does not overwrite an already accepted result of the parent; it has a separate record and proper handling |

**Join Policy does not define Lifecycle Scope.** Conceptually a distinction is made between `parent` — work within the parent task, `workflow` — work that can outlive the stage but belongs to the overall workflow, and `independent` — a separate governed task that can outlive its completion. The way these three areas are supported, the behavior when the parent closes and the possibility of independent execution belong to the verifiable portability contract of the host/Runtime.

`non-blocking` by itself does not turn a subtask into an independent one. A longer life requires a defined owner, identity, a place to store the result, an observable state and a supported completion/cancellation mechanism. Confirmation of a start differs from completion; a cancellation request is not proof of an actual stop. The presence of a stored context also does not prove that execution continues after the session ends.

**Work Scope** defines the allowed extent and actions, **Lifecycle Scope** — the lifetime and responsibility. No lifecycle model extends the Work Scope. In Standalone these rules do not create an own durable execution infrastructure; in Runtime its existing management mechanisms are used.
## 3. Installation, bootstrap, compatibility

**`vp-mode`** — the main Vida Powers orchestration skill: it accepts a request in ordinary language, selects the needed instructions, forms a bundle (role, task contract, effective methodology, scope, materialization requirements, references to artifacts) and launches execution or delegation. This is the single main working entry point; donor skills do not become separate entry points.

**`vp-setup`** — an auxiliary skill for the initial setup of a project for Vida Powers. `vp` is the Vida Powers prefix. `vp-setup` is not the main orchestration skill and must not run on every request.

Its job: detect the projects and the current instructions; safely add/update the integration rules in `AGENTS.md` and in files supported by the host; configure the available session/compaction hooks; map the locations of documents and local work; ensure idempotent re-setup and verify activation.

Session start events and context compaction **restore the context of `vp-mode`**, but do not restart completed work and do not create new workflows without a task. Hook capabilities differ between hosts; a host-specific adapter is needed without invented guarantees. The detailed portability contract and the platform support matrix are deferred to implementation and tests in the IDE.

During setup, third-party instructions and the current source map are preserved. Only the part of the integration that belongs to VP is updated; an existing Runtime-owned file does not become a second owner of policies. Re-setup does not create duplicates of managed blocks, hooks, product records or canonical documents.

Bootstrap passes the minimal `vp-mode` rules, the product identity, references to the methodology and the current artifacts. It does not load the whole instruction corpus into every session. Activation verification covers the session start, restoration after compaction and the necessary context of a delegated agent; the exact event and configuration names are determined by the adapter of the corresponding host.

## 4. Canonical instruction corpus, tags and methodologies

### 4.1 Canonicalization of donor techniques

The catalog is formed from seven donor projects: **Superpowers, BMAD Method, Matt Pocock Skills, Addy Osmani Agent Skills, pstack, GSD Core, Ponytail**. This is VP's own canonical base, not a wrapper that launches all source skills or copies their monolithic prompts one by one.

Processing covers not only the implementation of ready tasks but also research, clarification, decisions, work definition, acceptance criteria, test design, manual and automated checks and materialization. During the transformation, atomic instructions are extracted at the same time, tags are assigned, sources are preserved, and semantic duplicates, dependencies and conflicts are identified. What is transferred is the methodological content, not other people's execution engines, tracker integrations or competing state journals.

An **atomic instruction** describes one meaningful norm or technique with a stable ID, application conditions, a semantic contract, provenance and compatibility rules. One instruction can be applicable to several operations, roles and domains; it does not need to be copied for each tag.

### 4.2 Two dimensions of tagging

| Metadata | Meaning | Examples |
|---|---|---|
| `capability_tags` | What needs to be done | `prepare-pr`, `research-domain`, `define-acceptance-criteria`, `design-test-cases`, `implement-feature`, `run-automated-tests`, `perform-manual-testing`, `review-code` |
| `pattern_tags` | By which methodology | `evidence-based-research`, `test-first-development`, `risk-based-testing`, `goal-backward-verification`, `scope-first-execution`, `minimal-complete-change` |

Each tag has **at least two meaningful components** written in kebab-case. Abbreviations such as TDD may remain as explanations/aliases; the canonical tag is `test-first-development`. Search provides the name, description and semantics of tags, not just a list of opaque codes.

A tag **is not** an agent, a skill, a workflow node, an order of steps or a permission. Instruction tags are not identical to the thematic `tags` of the Wiki or the `labels` of tasks. Application conditions, obligation, dependencies, incompatibility and priorities have separate metadata and are not hidden in the tag name.

Different tags by themselves do not prove incompatibility. Groups such as `testing-sequence` and `review-strategy` allow independent methodological choices to be separated. For example, `test-first-development` and `test-after-development` are alternatives in the testing sequence group; `risk-based-testing` can complement test-first. The compatibility registry distinguishes mutually exclusive groups, compatible supplements and conditional dependencies.

### 4.3 Methodology as product policy

The methodology is defined by **product policy**, not by the situational choice of an agent. Separate groups can define testing, review, architecture, delivery and other directions independently of each other.

In Standalone the agreed techniques are fixed by a managed block in `AGENTS.md` or in an authoritative project source explicitly named by it. In Runtime their owner is the product configuration and the current source map. Before selecting a route and forming an instruction bundle, the **Effective Methodology Profile** is determined for the specific product and task.

If real methodological variability exists and there is no choice yet, the Router is obliged to obtain the user's choice and record it. It is not allowed to arbitrarily choose TDD or an alternative merely because a certain donor skill recommends it. When a recorded policy exists, the choice is not requested again; answers known from the context or authoritative documents are not turned into a new interview.

One repository can contain **several products** with different methodologies and work orders. A product has a stable ID independent of the path. Shared code and a cross-product task are not automatically reduced to the methodology of the nearest directory: for each covered product its policy, scope and sources are taken into account.
### 4.4 Explicit selective inheritance and exceptions

Products are independent by default. They can **explicitly selectively inherit** the shared profile, individual pattern groups or defined techniques of another product. Implicit full inheritance merely because of being located in the same repository is not applied.

An explicit local override of the corresponding group takes priority over the inherited rule without repeated confirmation. Two conflicting inherited options without a local decision are a conflict for the user, not a "last loaded wins" rule. The resolution is stored in the product settings. A change to another product must not imperceptibly substitute the chosen methodological behavior.

A **Task-scoped methodology override** is a separately agreed temporary exception for a specific task and product. The Router requests it once, records the decision in the context/artifact of the task and passes it to child agents. The exception does not change the permanent profile, other products, permissions, security gates or the boundaries of the allowed scope.

### 4.5 Live Inheritance and semantic stability

**Live Inheritance:** products reference stable IDs of instructions and profiles, **without version pinning**. After a new available revision of the canonical base appears, the current compatible instructions are used; this does not mean mandatory network auto-update of every host.

An update improves accuracy, clarity, completeness of execution and efficiency, but does not change the purpose, authority, application conditions or mandatory methodological sequence. A change of behavior is issued as a **new pattern ID**, not by replacing the old technique under the same tag. A product's transition to another behavior requires an explicit decision. Library revisions, source digests and change history are kept for tracing and rollback, although the product does not fix them manually.

Within an already active task, the agreed snapshot of the applied instructions is used. This is the stability of a specific run, not product pinning. Subsequent tasks can receive the current compatible revision. Compatibility is assessed by the contract and by checks, not by the literal identity of LLM answers.

### 4.6 Risk-Adaptive Instruction Updates

| Change class | Verification and acceptance |
|---|---|
| Low risk | Clarification and shortening without a contract change; automated checks and auto-acceptance |
| Medium risk | Improvement of the execution of the same technique; semantic compatibility, regression eval and independent review; acceptance after successful checks |
| High risk or undefined compatibility | Extended checks and human confirmation |
| Incompatible methodological behavior | New pattern; do not update the old behavior in place even with green tests |

For an accepted revision, the origin, authorship, checks and a separate change record are fixed. The quality of an update and its right to change the product methodology are different questions.

### 4.7 Metadata-first search and composition

Shared deterministic scripts/library are available to Standalone and Runtime. TS or Python is an implementation choice agreed with the corresponding codebase; duplicated independent search rules are not needed.

| Logical operation | Result |
|---|---|
| `catalog.tags` | Available capability/pattern tags and their descriptions |
| `catalog.search` | IDs, names and short descriptions selected by tags, role, product and conditions, without full texts |
| `catalog.get` | The text of the exactly specified instruction |
| `catalog.compose` | The selected texts, mandatory instructions and dependencies after compatibility checking and deduplication |

The names are the logical contract of the operations, not a ready CLI/API. The Master Agent first sees the catalog and the metadata candidates, selects the relevant IDs, and only then receives just the needed texts for a specific agent. The role, task contract, effective methodology, scope, materialization requirements and references to artifacts are added to the bundle.

### 4.8 Two selectors and an optional Decision Provider

**Instruction Selection** selects the set of atomic instructions. **Workflow Routing** selects the LLM for execution, forms agents from it according to a fixed reference (the instruction catalog) and sets the flow level — `Full`, `Medium`, `Light` or another defined by the profile. They can use a shared Decision Provider but have different result contracts; a routing decision is not an instruction bundle.

In ordinary Standalone the selection is performed by the master LLM. Through the host configuration an external decision model or another compatible provider can be connected; VP is not tied to a specific vendor API. Then a script/host adapter or the Runtime passes the task context, product, operation, tags and already allowed candidates for evaluation. With a valid, sufficiently confident result, such a selection happens without additional involvement of the main LLM agent. This is an acceleration of selection, not a transfer of scheduler authority to the model. The logical operation `workflow.options` provides a description of the allowed options from the route owner, and `decision.evaluate` evaluates the passed candidates; these operations do not compile an own execution graph in VP.

Mandatory product instructions and dependencies do not disappear because of a low relevance score. The example threshold **0.90** is not a universally approved value: the threshold and the interpretation of the score are verified for a specific decision type. A high score does not equal proof of correctness, permission or completion. A transition defined by rules does not need a model call; in Configured mode any choice is limited by the YAML graph.

**Agent Fallback** applies on provider unavailability, timeout, API error, incorrect format, unknown candidate ID or insufficient confidence. The choice is passed to the main agent; the same scope, policy and validation rules remain in force. Where a user choice/permission is required, fallback does not replace it. The source of the decision, the selected IDs and the reason for the fallback are materialized.

### 4.9 OKF and the provenance of knowledge

OKF v0.2 defines the representation of knowledge and provenance: Markdown with frontmatter, `type`, `title`, `description`, `tags`, `sources`, `generated`, `verified`, `status`, `stale_after`, as well as navigation through `index.md` and a separate history. VP's own fields — instruction IDs, two groups of tags, materialization contracts, source revision/digest and the required license attributes — are explicitly defined extensions, not a new execution standard.

A source update, a change of the canonical text, re-verification and human approval are different events. Advisory `verified` does not replace authorization; the absence or presence of OKF metadata by itself does not prove Runtime readiness. The statuses of operations, Task, Test Run and human acceptance retain their own contracts.
## 5. Universal lifecycle — a coverage map, not a rigid route

VP knows the techniques and artifacts of the following areas: intake/clarification; discovery; research; assessment of alternatives and decision-making; brief/PRD/requirements; acceptance criteria; UX/solution design; test design and test cases; planning; execution; automated tests; manual/exploratory tests; review; UAT/acceptance; delivery; retrospective/outcome evaluation.

This is a **reference capability coverage map**, not 12 mandatory directories or execution nodes. A request can start at any stage and end at it if the goal has been achieved.

The relevant roles are formed automatically: Researcher, Analyst, Decision Reviewer, Requirements Specialist, Test Designer, Implementer, Automation Tester, Manual/UI Tester, Independent Reviewer, Verifier and others. Responsibilities can be combined when this is safe; real independent checks are not substituted by the author's self-check.

- **Light:** minimally sufficient instructions, artifacts and specialists.
- **Medium:** full relevant requirements, test scenarios, targeted verification, specialists as needed.
- **Full:** in-depth research, alternatives, tracing, independent verification lanes and detailed evidence — only where appropriate.

These profiles **do not create separate workflow engines and do not cancel mandatory gates**. The number of agents, checks and tokens is optimized without losing the necessary quality.

The completeness of the map covers ordinary research as a standalone result, verification of evidence, formation of alternatives and decisions, description of a task and its clarification, business/functional/non-functional requirements, user stories/use cases, scope/non-goals, acceptance criteria, test strategy, test cases, test data, test automation, automated runs, manual and exploratory checks, UAT, documentation and assessment of the effect.

Content verification is not reduced to executing code. Research is verified by questions, sources and gaps; a Decision — by alternatives, rationale and authority; a Task/Spec — by completeness, consistency and testability; a Deliverable — by AC and actual evidence. Standard rules are obtained from the canonicalized techniques, not re-agreed with the user for every task.

**Test Designer** prepares scenarios and their link to AC; **Automation Tester** creates/executes automated checks; **Reviewer** independently evaluates the result; **Verifier** reconciles evidence with the goal; **Manual/UAT participant** records their own observations. A UI agent can execute a scenario through a browser, but this is not human acceptance: without the required human answer it remains `awaiting-human-verification`, not PASS.

Light/Medium/Full change the depth of research, the detail of artifacts, the useful separation of roles and the costs. The applicability of an operation, its obligation (`required`, `conditional`, `optional`) and its depth are separate properties. Full does not mean executing all known stages; Light does not allow skipping the required AC, materialization or mandatory gates.

## 6. Artifact-first: materialization of meaningful work

After a meaningful operation there must remain a **readable and verifiable result** or an explicitly recorded update of an existing one. One file can contain several small related entities; a separate Wiki document for every tool call is not needed.

| Work | Canonical result |
|---|---|
| New request / idea | Intent with the goal and constraints or a reference to the corresponding requirements source |
| Clarification | The recorded question, answer and the corresponding update of the intent/requirements |
| Assessment of alternatives | Options assessment with comparison criteria and arguments |
| Research | Thematic Research document |
| Choice of an alternative | Separate Decision record |
| Formation of the product concept | Brief / PRD / Spec as needed |
| Work definition | New Work Item / Task |
| Acceptance criteria | Acceptance criteria with stable identities or a reference to an authoritative source |
| Test design | Test cases / test plan linked to AC |
| Code or another deliverable | A real change of the Source / document / created result |
| Automated testing | Tests in the Source + separate execution evidence with an actual run |
| Manual testing / UAT | Observation of a human/authorized tester with steps and a verdict |
| Review | Verified findings, disposition and evidence |
| Completion | Evidence, acceptance verdict, the actual deliverable and explicit GAPs |
| Handoff / rollout | Delivery/handoff record and the result of the foreseen checks |
| Assessment of the effect and conclusions | Outcome/KPI report, retrospective or separately recorded new questions and tasks |

**Handoff criterion:** an agent cannot report a saved result if the file/record does not exist, is not readable or does not conform to the required materialization contract. Persistence verification and semantic verification are different checks. The status `passed` without running a check or without real observation is forbidden.

The model of related data: `Research → Decision → Requirement → Work Item → Test Case → Evidence`. These are **typed relations**, not a requirement to create all elements for every task.

### 6.1 Three parts of materialization

**Content Artifact** — the document itself, code, a test, a table or another result. **Artifact Reference** — its stable ID, type, product, scope/work binding, locator, revision/digest and relations. **Action/Event Record** — who, when and what created, changed, checked, approved or failed to execute. The content, the reference and the event do not substitute for each other and do not form a second workflow engine.

Materialization happens as meaningful results appear, not only in the final answer. An intermediate conclusion or a partial report is stored with a truthful status. The consumer receives a durable reference to the exact result instead of depending on the memory of another agent. One concise document can contain several logical entities with stable local IDs; for a large result separate artifacts are allowed.

### 6.2 Exit contract in instructions

Instructions that produce a result define an **`artifact_contract`**: which type of output is needed, which data and references it contains, where it is materialized according to the project map and how it is verified. For research this is, in particular, questions, sources, conclusions and uncertainty; for a Task — the goal, scope and AC; for a Test Case — preconditions, steps, data and expectations; for a Test Run — the actual run and observation.

`artifact_contract` is a conceptual VP extension, not an approved low-level schema. It does **not** make every atomic norm a separate file or workflow node. Materialization rules are composed together with the relevant instructions; general norms such as minimality of the change apply inside the work.

A handoff is confirmed only after checking the availability of the mandatory output and its conformance to the contract. The check of presence/format/digest and the substantive check of the result are separated. Evidence must be bound to exactly the revision of the requirements, implementation and artifacts that was checked; a new revision does not inherit the old PASS automatically.
## 7. Document lifecycle: current content, history separately

### 7.1 Thematic Research

**One topic = one canonical living research document.** New research on the same topic updates **this same** document, replacing outdated facts with current verified conclusions. No series of `research-final-v2-2026...` is created for the same subject.

The main document keeps **only the current finalized content**. The body contains no chronology, no notes about previous versions, no "previously it was ..." formulations, no "what changed" comments and no execution transcripts.

The metadata holds the identity, `updated_at`, sources, the required currency attributes and, when needed, revision/provenance. A **separate linked change log / audit artifact** records the content change, the date, the executor and the reason; this log is not mixed with the thematic research.

If the research opens a fundamentally **new separate topic**, a new research document is created. If it leads to a decision, a **separate Decision artifact** is issued. D14 and D15 record the accepted scope limits for this same product topic; they do not create a second research owner.

### 7.2 Decisions

An accepted decision is a separate artifact with rationale, alternative options, evidence and attribution/authority. A new decision that changes an old one **does not erase** the accepted historical act: a new Decision is created with `supersedes`/relations. The existing runtime `DecisionRecord/v1` has the corresponding fields and must be reused.

Updated research may require evaluating the current decision; it **does not grant** the right to automatically revoke it or change downstream scope.

### 7.3 Tasks / Work Items

- **Draft, not yet executed task:** its current content can be clarified and updated in place according to the owner's rights.
- **After acceptance and during execution:** act within the frozen/agreed scope and the rules of the corresponding environment; changes require a proper controlled review.
- **Completed task:** remains a fact of the work performed; it is not rewritten for a new request or a new implementation. For changes, a **new Work Item** is created, linked to the previous one (`changes`, `extends`, `follows-up`, `fixes`), with its own AC and evidence.

Source requirements and specification documents can be living documents within their owner, but their change **does not automatically rewrite completed Work Items or their results**.

### 7.4 Acceptance, test cases and evidence

Acceptance Criteria and Test Cases have stable IDs and references to requirements or a Work Item. Unfinished drafts can be clarified; agreed and applied criteria must not change imperceptibly in a way that makes old `passed` mean new behavior.

Each actual Test Run, Manual Test Session, UAT verdict or review execution is separate evidence with its own identity. Old results are not rewritten to present a new run as already successful.

### 7.5 Journals of actions

The history includes **meaningful changes and results**: creation/update of research, a decision, a task transition, a check, an acceptance, an error, a new revision, materialized evidence. Not every tool call is obliged to create a separate document. The change log is not added to the body of the final research.

### 7.6 Consistency of current knowledge

Documents are updated, verified, approved and become stale according to their type and owner. Content lifecycle, verification status and approval/authority are independent dimensions: a technically verified specification may still await business approval, and an outdated source does not automatically revoke an accepted decision.

A source update triggers an assessment of the impact on the related decisions, requirements, tasks and checks. The need for a re-review is marked explicitly; dependent artifacts are not rewritten without permission and without establishing the relevance of the change. D14 and D15 set business scope only. Donor admission, rights review, implementation, and Runtime acceptance each need their own evidence. History belongs to separate linked change records/evidence, while the living normative document describes the current state without historical comments.

For donor sizing, the estimates in `DECISION-r2.md` are attributed to the M3.1 R2 review. Its 1,434 CSV rows and 391 candidate Markdown files are different source units. Merge, rejection, and new-ID ranges are estimates for review planning, not delivered counts. The listed reference categories total 4,331; the reported 4,523 is not a verified total.

The rule "one topic — one research" applies within a defined product and a meaningful contour. The same name in two products does not force mixing different sources and scopes. Shared research can have one owner and references from several products instead of copies.
## 8. Scope, write authority and Findings

### 8.1 Write owners

**VIDA Runtime:** its existing reservation, lease, CAS, single-writer, guarded filesystem and lifecycle/authorization mechanisms apply. Rights for the duration of a task are acquired, can be delegated in an allowed way and are released by the Runtime itself. VP does not duplicate them, does not grant rights and does not create a second owner of state. The target single database is `.vida/work/workspace.v1.sqlite` after a qualified transition; the existing v1 contracts remain in force until migration.

**Vida Powers Standalone:** transparent editing without an own system of leases, distributed locks, a reservation service or a scheduler. The owner of the last write and the responsible author of a specific change is the agent that made it; this is recorded in the metadata and the log. This is transparent attribution, not a VP rights-capture system. It does not transfer to it the right to change the product intent or to make decisions instead of the user. The Master Agent resolves conflicting writes with the practical means of the host; hidden overwriting of other people's changes is not allowed. A simple repeated read/reconcile does not turn into a mandatory Runtime dependency. Local Git/host capabilities and verification of the actual content help recovery but do not promise the transactional guarantees of the Runtime.

The rule of centralized writing of **Findings** is a separate contract and does not mean that the Orchestrator must personally edit every research, Task or Wiki document.

### 8.2 Scope-First Execution

Every agent, its instructions, dynamic routing and nested tasks are limited to the **allowed Work Scope**. Methodology, reasoning about coverage/security, a relevance score or the status of an independent agent do not allow it to be extended. Scope is defined by the goal, the causal link, the AC and explicit permissions, not only by which file the problem was found in.

| Finding | Action |
|---|---|
| A bug caused by the current work, within the allowed scope | Fix and verify within the current task |
| A problem that blocks an AC but requires going beyond the granted authority | Record a blocker and request permission before the change; do not promise completion without it |
| A real third-party bug that does not block the main work | Separate Finding; continue the main task without the third-party fix |
| An additional improvement, optimization or third-party security finding | Record separately; do not turn into unauthorized scope of work |
| A previously agreed auto-fix policy exists for such a class of third-party bugs | Still create a separate task, with its own scope, AC and evidence |

Without standing permission, a proposal to fix third-party problems is an **optional human loop after the main work is completed**. Under an auto-fix policy, third-party work also does not substitute the main work: it is performed separately after it. A real blockage or a missing permission may require a question earlier; non-blocking findings must not delay the main result.

### 8.3 A Finding is not identical to a Work Item

A Finding records the problem, the evidence, the discovery source, the product, the link to work/scope and the blocking impact. The very fact of its creation **is not authorization to fix**. After an explicit user decision or the application of their recorded policy, a separate Bug Work Item and a link to the Finding are formed. The execution of the task and the evidence of its fix do not become a second state in the Findings registry.

**Standalone:** a separate append-only JSONL Findings per product. **Runtime:** logical product isolation within the existing SQLite/HostState, not a new database per product and not a second JSONL owner of the same state. The specific file path is determined by the product map. External issue trackers and synchronization are not implemented in the current scope.

### 8.4 Centralized writing and Hybrid Deduplication

Subagents return structured messages about Findings. The **Orchestrator** is centrally responsible for verification, classification, deduplication and writing through one proper writer/persistence API. Subagents do not append to the canonical Findings journal directly. In Runtime the record goes through its existing state owner.

| Step | Rule |
|---|---|
| Message identity | Re-delivery of the same report/event does not create a repeated event |
| Deterministic lookup | Check of ID, fingerprint, context and provenance |
| Semantic candidate matching | The Decision Provider (D5) finds possible duplicates among the remaining candidates |
| Equivalence check | Reproduction, context and evidence must confirm the identity of the defect; the same location or a high score is not sufficient |
| Confirmed duplicate | Link to the canonical `finding_id`, preserving the new independent evidence |
| Ambiguity | Keep separate Findings with a possible link; do not merge by force |

The history is append-only: primary observations are not deleted; merging/redirecting is a separate event, not erasing a record. Re-delivery of one piece of evidence and a new independent observation are different cases. All accepted dispositions and writing problems have a truthful state, not a fictitious completion.

`findings` in a ResearchResult mean the statements of the research; they are not automatically defect registry records. They can be linked, but their semantics and lifecycles must not be mixed.
## 9. Wiki, Work Items and navigation (Jira/Confluence-like)

**Physical storage is shallow; the logical hierarchy lives in metadata and typed relations.** This gives stable references, search and future interfaces without moving files when the Wiki tree changes.

- Wiki pages: a document with `id`, `title`, `type`, `tags`, `space`, `parent_id`, `order`, `updated_at`, sources/links. Pages lie side by side, for example `docs/wiki/<KEY>-W0042-oauth-strategy.md`.
- Tasks: separate Work Items with an ID such as `<KEY>-142`. In Standalone a local file `work/<KEY>-142.md` is possible; in Runtime the authoritative task state already belongs to the database.
- Evidence: outside the main Wiki pages, with a link to the Work Item/AC; in Runtime — through the existing artifact/evidence contracts.
- Files have stable IDs and short kebab-case slugs, **without** `done`, `draft`, dates and `final-v2` suffixes in a long-lived name.
- Types `research`, `decision`, `requirements`, `test-plan` are mostly Wiki metadata/filters, not separate physical directory trees.
- Relations are typed: `derived-from`, `informs`, `implements`, `tests`, `blocks`, `supersedes`, `changes`, `found-during`.
- Indexes/navigation/UI are **derived** from the authoritative documents and Work State. Future Wiki/Task UI — a separate product on top of the VIDA API, **not a VP function**.

The specific paths for a new consumer project are finally determined by `vp-setup` according to the existing ownership. In an already existing repository the normative file stays in its place; no automatic duplication/migration of documents during setup. This is especially important for the current `packages/agent` and `packages/plugin`.

**Note:** file schemas such as `VPWikiPage/v1` or `VPWorkItem/v1`, mentioned as conceptual examples, are not implemented contracts. They must be reconciled with the existing `ResearchResult/v1`, `DecisionRecord/v1`, `AcceptanceManifest/v1`, `WorkItem/v1`, `WorkState/v1` before approving the formats.

### 9.1 Shallow typical layout

For a new product the scheme may look like this; the existing normative paths are preserved and only reflected in the map:

```text
<product-root>/
  docs/
    wiki/
      index.md
      AGT-W0001-overview.md
      AGT-W0042-oauth-strategy.md
      assets/
        AGT-W0042-sequence.svg
  work/                          # local data of VP Standalone
    AGT-142.md
    findings.jsonl
    activity.jsonl
    evidence/
      AGT-142-test-run-<run-id>.json
```

`index.md` is derived navigation, `activity.jsonl` is a local record of meaningful actions; the change log of a canonical document is a separate linked artifact. Evidence and test run results do not clutter the main Wiki. Test plans and reusable test cases can be Wiki content; small task-specific ACs/cases — identified sections of the task.

In Runtime the operational data belongs to the database. A Markdown Work Item can be an export/projection but not a second authoritative task state. The root `AGENTS.md`, `.vida/project.yaml`, `.vida/agents.yaml`, `.vida/flows.yaml`, `.vida/AGENT.sidecar.md` and `.vida/work/workspace.v1.sqlite` keep their configuration and operational roles. Product documents are not moved there automatically.

### 9.2 Stable names and logical relations

| Object | Name format |
|---|---|
| Wiki page, including research/decision/spec | `<KEY>-W<NNNN>-<slug>.md` |
| Standalone Task | `<KEY>-<N>.md` |
| Attachment | `<PAGE-ID>-<slug>.<ext>` |
| Evidence of a specific run | `<TASK-ID>-<run-id>.<ext>` or a refined run type in the name |
| AC inside a task | A stable local address such as `AGT-142:AC-01`; it is an ID, not a requirement of such a file name |

The product key such as `AGT` is registered separately from the internal `project_id`. An ID does not depend on the name, status or path and is not reused after a record is removed. ID issuance is controlled by the proper owner/a simple allocator in Standalone and by a Runtime mechanism in database mode, without invented guarantees of cross-process coordination in VP.

The slug is short, in Latin script, lowercase kebab-case, roughly up to 50 characters; it is fixed at creation and is not automatically renamed after the `title` changes. The visible document title can be Ukrainian. Dates, revisions, draft/done/approved are stored in the metadata, not in the names of living long-lived pages. Immutable evidence records are distinguished by their own run ID.

The Wiki tree is formed by `space`, `parent_id` and `order`; the task hierarchy — by `parent`, dependencies and typed relations. Moving in the tree does not require moving the file. Relations are checked for unknown IDs, cycles and an incorrect product context. One normative document can serve several tasks; its content is not copied into each of them.

### 9.3 Search and future interfaces

The shared logical hierarchy is suitable for the Wiki tree, Task Board, task details, history, backlinks and an end-to-end view Research → Decision → Requirements → AC → Tests → Evidence. It does not mean that VP ships a UI.

Primary search covers ID, filename, title, body, type, product, tags/labels and relations. An extended full-text index is recoverable and derived when needed; in Runtime its existing store is used, not a second database of truth. Someone else's normative document outside `wiki_root` is indexed by reference, not duplicated for the sake of the Wiki structure.
## 10. Models of result storage

For VIDA Runtime the existing owners and resources are used:

- `ResearchResult/v1`, `ResearchSynthesis/v1` — questions, sources, findings, uncertainty, recommendations.
- `DecisionRecord/v1` — decision, authority, alternatives, relations/supersedes.
- `ImplementationScope/v1`, `AcceptanceManifest/v1` — scope, allowed paths, acceptance IDs.
- `WorkItem/v1`, `WorkState/v1` — work identity, binding, execution, artifacts, evidence.
- `HostState` — the single owner of transactional Work, Ledger and journal CAS; file materialization under the current fs-safe/repair contract.

The general atomicity of writing to SQLite and to an ordinary file cannot be considered proven merely through a SQLite transaction. The active status cutover, migrations and allowed file owners must be verified during implementation; architectural descriptions are not proof of readiness.

In VP Standalone an owner of the local file, its metadata, sources/relations, a simple journal of meaningful events and validation of the result is sufficient; no parallel Runtime database.

The end-to-end normative link of VIDA is **BR → SR → AC → evidence/GAP**. Business intent, observable behavior, the acceptance condition and evidence have different roles. Decision, Code, Static, Runtime and GAP do not substitute for each other: static analysis or the presence of code does not close a requirement for observable runtime evidence.

Artifacts keep the ID, source/scope/work binding, revision or digest and references to preconditions. The format schema, the content edition and the package version are different quantities. During migrations no history of previous revisions is invented. The presence of Research/Decision JSON files in the current codebase does not allow transferring to them ownership of the operational state that belongs to the database; likewise the database does not force normative documents to be copied into it.

## 11. Domains and instruction packages

D14 accepts a bounded software engineering, UX, product and business guidance pack. Its selected product/business domains follow the owner's 2026-10-25 extension; each source still requires research, fidelity, rights and owner admission. Engineering/UX coverage retains framework, runtime, platform, accessibility and targeted standards rules. D15 adds only selected typed reference families. Other unselected domains remain outside the accepted scope. The broader domain-pack model below describes possible future work and does not approve additional domains.

Universal operations — Research, Decision, Define, Execute, Verify — receive domain specializations. For example, software QA → unit/API/E2E/manual; marketing QA → fact-checking, compliance with the brief and analytical labels; business QA → process scenarios and KPIs. The necessary evidence is determined by the properties of the final result.

A domain pack adds new instructions and specializations to the same semantic base and the same tag-based search mechanism. Compatible supplements do not require rewriting the Router; an incompatible pattern has a new identity and passes the product methodology selection. The very fact of installing a pack does not change the scope, authority or completed tasks.

## 12. Limits of autonomy, safety and efficiency

- The Agent and the Decision Provider choose instructions, the LLM, agents and next actions **only within the already defined Effective Methodology Profile**. They do not change the product methodology choice, do not grant permissions and do not cancel mandatory gates.
- Significant ambiguity with an external/irreversible effect, with safety, scope or product policy requires proper human authorization.
- Tests and code review are evidence, but not identical to business approval or human UAT; there is no fictitious PASS.
- Record the actual failures, limitations, unfinished GAPs; do not create pseudo-documents or checks merely for ceremony.
- Minimize duplicated research, repeated tasks, context, agent turns and tokens; preserve the independence of verification where risk and methodology require it.
- After context compaction, restore pointers/state rather than re-performing already completed meaningful actions.

As a result of a review, the cause is distinguished: a local implementation defect → scoped correction; a plan defect → correction of the allowed remainder of the work; an intent gap/missing permission → human loop; a third-party problem → Finding. Replanning does not repeat completed side effects and does not rewrite accepted evidence. Only actions for which a need, boundaries and a safe way of re-execution are defined are repeated.
## 13. Limits of the current research and the next work in the IDE

**Conceptual foundation:** an autonomous VP plugin, one main orchestration skill `vp-mode` and an auxiliary `vp-setup`; canonical atomic instructions and two dimensions of tags; bounded engineering/UX guidance and selected typed reference data under D14 and D15; product methodologies, selective inheritance and task-scoped overrides; Live Inheritance and Risk-Adaptive Updates; metadata-first selection and a Decision Provider with Agent Fallback; hybrid roles, recursive subtasks and Selective Join; Scope-First, centralized Findings and Hybrid Deduplication; the full lifecycle of arbitrary work, Light/Medium/Full, artifact-first; living research, separate decisions and new tasks for new changes; a flat Wiki, different storage/ownership boundaries of Standalone and Runtime; the absence of an own VP workflow engine.

**Technically open until the implementation phase:** detailed low-level VP schemas, a verified host compatibility matrix, the exact adapter APIs, migrations of the current contracts, the correctness of concurrent writing in specific hosts, validation of the chosen runtime integration points, MVP sequencing/evaluation. These questions **do not block the completion of the product research**.

In the IDE: first review the **current** tree/code and the normative VIDA documents, compare this concept with the Source, document the differences and have the specification approved by the owner of the corresponding product; then separately compose an implementation plan and implement incrementally. Do not change code, state or project instructions merely because this research document exists.

Development happens incrementally in a working IDE, not as a simultaneous implementation of all subsystems in cloud research. Donor conversion is a separate meaningful cycle: inventory of the material, extraction of instructions, tagging, matching of identical techniques, accounting for conflicts, binding of materialization contracts, provenance and verification of the resulting corpus. This is the content of subsequent work, not the launch of conversion by this document.

The bounded pack and resource families are accepted for phased work but are not implemented or admitted. The future UI on the VIDA API, Runtime integration, marketplace publication and other domain packs are not considered created. External synchronization is deferred; detailed portability guarantees remain open until verification on hosts. Low-level schemas, APIs and migrations remain open for the Step H contract and its independent review.

## 14. Sources and principles of use

- [VIDA Agent Runtime](https://github.com/pomazanbohdan/vida-stack-lite) — authoritative project sources for Core, HostState, setup and persistence; the source commit recorded in the research is specified in the metadata.
- [Superpowers](https://github.com/obra/superpowers) — brainstorming, planning, TDD, independent review, verification, subagent dispatch.
- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) — research/decision, PRD/Spec, Build, QA, triage, deferred work.
- [Matt Pocock Skills](https://github.com/mattpocock/skills) — research/spec/tickets, test-first, task frontier, review relative to the specification.
- [Addy Osmani Agent Skills](https://github.com/addyosmani/agent-skills) — specialist roles, test engineer, code reviewer, security, constraints.
- [Cursor pstack](https://github.com/cursor/plugins/tree/main/pstack) — selective playbooks, agents, verification, bounded programs.
- [GSD Core](https://github.com/open-gsd/gsd-core) — requirements, planning artifacts, wave execution, verification, UAT.
- [Ponytail](https://github.com/DietrichGebert/ponytail) — minimal complete change, removal of avoidable complexity without skipping risk controls.
- [Open Knowledge Format v0.2](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md) — structure, metadata and provenance of knowledge concepts, not execution semantics.

**The current concept is recorded. Further research on this same topic must update this document in place and leave the history in a separate linked change log, not in the main text.**

Donor and framework references are sources of techniques, not a right to change product decisions. For further qualification, semantic separation is used: artifact services (Google ADK), checkpoints and long-term storage (LangGraph), executor state/checkpoints (Microsoft Agent Framework), history/replay and child lifecycle (Temporal), workflow outputs and persistence (Mastra), agent results (OpenAI Agents SDK), task/artifact identity (A2A/MCP), provenance relations (W3C PROV). These are research reference points; their specific APIs and versions are verified before integration, and no integration is a dependency of VP Standalone.

## Currency and verification

Last significant change: 2026-10-22 — the research reflects the owner decisions D14 and D15 and the phased implementation boundary. Currency rule: `stale_after` = 2027-01-19, after this date the document is considered stale and needs review; a research source changes only the part of the source to which the evidence is bound.

Verified: consistency of the statements with the current Source by two independent review agents on 2026-10-19 (round 1 — `deepseek/deepseek-flash`, round 2 — `opencode/glm-5.3-flash-free`). The verification covered reconciliation of the concept with the Source, the coverage of §1–14 and consistency with its own §7.1/§7.5. This is confirmation of consistency, not runtime acceptance.

Not verified: qualification on real hosts, runtime acceptance, legal review of donor licenses, the capacity of the instruction registry beyond 64 records. These points remain GAPs and are closed at stages 2, 3 and 8 of the implementation plan.








