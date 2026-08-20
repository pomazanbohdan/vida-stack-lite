<!--
managed-by: codex-gsd-ponytail-orchestrator
orchestrator-schema: 1.0
project-sidecar: AGENT.sidecar.md
update-policy: replace-this-file-wholesale
project-specific-content: forbidden
-->

# Automatic Development Orchestrator

> **Mandatory bootstrap:** immediately read `./AGENT.sidecar.md`. Do not plan, edit, dispatch agents, or create workflow artifacts before the sidecar has been loaded.

This file is the generic, updateable orchestration policy. `AGENT.sidecar.md` is the project-owned source map and configuration. Users describe work in ordinary language; they must not be required to invoke GSD or Ponytail commands.

## 0. Bootstrap

For every user request:

1. Read this file.
2. Read `AGENT.sidecar.md` immediately.
3. Resolve the repository/worktree root and every project source referenced by the sidecar.
4. Read only the business, system-specification, code, test, and operational sources relevant to the request.
5. When working inside a subtree, also read any nested `AGENTS.md`; treat it as local implementation guidance.
6. Only then classify and execute the request.

If `AGENT.sidecar.md` is missing or unreadable:

- For a read-only question, inspect available repository evidence and explicitly report reduced confidence.
- For any mutation, stop before editing. Report a project-installation error; never invent authoritative requirements, validation commands, or documentation locations.

A missing secondary source is not automatically blocking. Continue when the intended behavior remains unambiguous, record the gap, and block only when the missing source can materially change the result.

## 1. Operating contract

- Accept natural-language requests and automatically route them through the appropriate development flow.
- Never tell the user to run `/gsd-*`, `/ponytail`, or another internal workflow command.
- Use installed GSD capabilities, roles, tools, and projections internally. Resolve capabilities by role/registry rather than relying on hard-coded slash names.
- Apply Ponytail only as an implementation policy for code-producing lanes.
- If GSD or Ponytail is unavailable, execute the equivalent process manually and mark the run as degraded; do not offload internal orchestration to the user.
- Existing project documentation and code remain authoritative according to `AGENT.sidecar.md`. Do not replace them with a new project-management hierarchy.
- GSD planning files are derived execution state unless the sidecar explicitly declares otherwise.
- Make the smallest process and code change that safely satisfies the request.

## 2. Three-layer project model

| Layer | Meaning | Typical content | Constraint |
|---|---|---|---|
| **B — Business requirements** | Human description of why and what is needed | outcomes, user needs, policies, business rules, scope, constraints, acceptance language | May use any fully human structure. Preserve its language and organization. |
| **S — System specifications** | Detailed behavioral description of what the system must implement | components and responsibilities, states, flows, APIs/events, data rules, algorithms as behavior, errors, edge cases, security, performance, integrations, operational behavior | Detailed enough to implement, but remains a specification rather than source code. |
| **C — Code and executable evidence** | Actual implementation | source, tests, schemas, migrations, configuration, IaC, build/deploy automation | Must implement S and remain traceable to B. |

The sidecar maps the actual files, systems, URLs, owners, and update policy for each layer. Do not assume names such as `requirements/`, `specs/`, or `src/`.

### Trace invariant

Every material change must establish or preserve:

```text
business intent (B)
        ↓
system behavior/specification (S)
        ↓
code + tests + configuration (C)
```

Use existing IDs when available. Otherwise cite stable references such as `path#heading`, ticket IDs, API operation names, test names, symbols, or line ranges. Do not force a new numbering scheme onto human documents.

## 3. Authority and conflict handling

First apply the authority matrix and exceptions in `AGENT.sidecar.md`.

Default fallback when the sidecar does not define a case:

1. The user's explicit current instruction authorizes the requested change.
2. Approved business intent constrains system behavior.
3. Approved system specifications constrain code.
4. Tests and code are evidence of current behavior, not automatic proof of intended behavior.
5. Comments, generated files, and stale plans are weaker evidence.

When sources conflict:

- Do not silently choose the easiest source.
- Identify the exact conflict and determine whether the request itself resolves it.
- If one reversible interpretation clearly preserves approved intent, proceed and record the decision.
- Pause only when materially different user-visible outcomes, data semantics, security posture, or irreversible operations remain possible.
- Never rewrite business meaning merely to match existing code.
- Never change code to match a stale specification when stronger evidence shows the specification is obsolete; reconcile the documentation according to the sidecar policy.

## 4. Generic work artifacts

Project-specific canonical documents stay where they already are. Resolve work-artifact destinations in this order:

1. An explicit destination in the user request.
2. `AGENT.sidecar.md`.
3. An existing project convention or ticket system referenced by the sidecar.
4. Fallback: `.agent/work/<work-id>/`.

Use an existing issue/ticket ID as `<work-id>` when available; otherwise use a stable lowercase slug with a date or unique suffix.

### Default minimal layout

```text
.agent/
└── work/
    └── <work-id>/
        ├── WORK.md        # request, source trace, plan/tasks, status, result
        ├── EVIDENCE.md    # optional: research, logs, decisions, review evidence
        └── HANDOFF.md     # optional: only for paused/incomplete work
```

Rules:

- Read-only questions normally create no work files.
- A small, low-risk code edit may remain diff/test driven unless the sidecar requires an audit record.
- Create `WORK.md` for cross-layer, multi-file, multi-agent, high-risk, or resumable work.
- Split `PLAN.md`, `TASKS.md`, `DECISIONS.md`, or `VERIFICATION.md` out of `WORK.md` only when the single file becomes materially hard to use, normally with more than eight tasks, several execution waves, or independent reviewers.
- Never create empty scaffolding.
- Never create a second canonical business or system specification inside `.agent/`.

### GSD runtime isolation

When GSD needs project, roadmap, requirements, state, phase, or plan artifacts, treat them as an internal projection:

```text
GSD_PROJECT    = sidecar override, otherwise "agent-flow"
GSD_WORKSTREAM = <work-id>

.planning/<GSD_PROJECT>/workstreams/<work-id>/...
```

- Do not initialize or overwrite root-level `.planning/PROJECT.md`, `ROADMAP.md`, or `REQUIREMENTS.md` merely to process a request.
- Any GSD-local business or system text must be marked **DERIVED / NON-AUTHORITATIVE** and link back to the actual B/S sources.
- `.planning/...` may be regenerated; `.agent/work/...` and the sidecar-defined canonical sources carry the durable human trace.
- If the project already uses GSD, obey the sidecar's namespace and persistence policy.

## 5. Automatic request router

Classify each request along four axes:

```text
intent:  answer | inspect | design | change | operate
layer:   B | S | C | B→S | S→C | B→S→C
scope:   micro | bounded | multi-component
risk:    low | medium | high
```

High-risk triggers include public contracts, authentication/authorization, privacy, money, destructive actions, data migrations, production operations, concurrency/distributed state, compliance, secrets, security boundaries, and hard-to-reverse changes.

### Decision tree

```text
READ SIDECAR
    |
    +-- read-only question or explanation?
    |       -> evidence answer; no workflow files by default
    |
    +-- active incident / production breakage?
    |       -> incident flow: triage -> contain -> root cause -> minimal fix
    |          -> regression check -> follow-up reconciliation
    |
    +-- changes business outcome, policy, scope, or acceptance?
    |       -> full B -> S -> C flow
    |
    +-- changes observable system behavior, data contract, API, state, or NFR?
    |       -> S-first flow; confirm B alignment -> implement C
    |
    +-- bug fix or behavior-preserving refactor?
    |       -> C-first diagnosis; trace intended S/B -> root-cause fix
    |
    +-- documentation-only?
            -> update the existing authoritative layer; verify links/consistency
```

### Route levels

| Route | Use when | Internal process |
|---|---|---|
| **R0 Evidence** | questions, explanations, location/search | bootstrap → gather evidence → answer |
| **R1 Micro** | one localized reversible change with clear behavior | bootstrap → trace → tiny plan → implement → focused check |
| **R2 Standard** | bounded feature/fix across several files | bootstrap → trace → plan → plan check → execute → verify → reconcile |
| **R3 Full** | business/system change, multi-component or high-risk work | discovery/discussion → B/S trace → research → plan/waves → independent plan check → execute → verify/review → reconcile |
| **R4 Incident** | urgent failure | triage → contain → diagnose root cause → minimal safe patch → regression → deferred documentation/cleanup |

The user never selects a route or invokes a workflow command. Select it automatically and escalate when new evidence increases scope or risk.

## 6. Execution state machine

```text
BOOT
  ↓
INTAKE
  ↓
TRACE
  ↓
ROUTE
  ↓
PLAN
  ↓
EXECUTE
  ↓
VERIFY
  ↓
RECONCILE
  ↓
REPORT
```

### BOOT

Load the sidecar, relevant nested instructions, project source map, validation commands, safety boundaries, and artifact policy.

### INTAKE

Normalize the request into:

- desired outcome;
- observable acceptance;
- in-scope and explicitly out-of-scope items;
- affected components and layers;
- constraints, risk, reversibility, and rollout expectations.

Do not inflate a small request into a project.

### TRACE

Build the smallest sufficient B/S/C trace:

- relevant business source and intended outcome;
- relevant system behavior or missing specification;
- code/tests/configuration currently implementing it;
- contradictions, unknowns, and documentation impact.

For a code-only request, trace backward only as far as needed to establish intended behavior. For a business change, trace forward through every affected specification and implementation boundary.

### ROUTE

Select R0–R4. Decide whether durable work artifacts, research, parallel agents, worktrees, or human approval are justified.

### PLAN

A plan must be executable and include only what is necessary:

- acceptance criteria;
- files/components expected to change;
- ordered tasks and dependencies;
- tests/verification;
- business/system documentation impact;
- migration, rollout, observability, and rollback when relevant.

For R2/R3, run an independent plan check without Ponytail. Fix requirement gaps, missing verification, unsafe ordering, and unintended scope before implementation.

### EXECUTE

- Dispatch specialized roles internally through GSD or the harness.
- Use isolated worktrees/branches when parallel work can conflict.
- Apply Ponytail only to code-producing agents.
- Keep commits/diffs coherent and traceable to tasks.
- Do not change authoritative B/S documents unless the request and sidecar permit it.
- If execution reveals that the plan or intended behavior is wrong, return to TRACE or PLAN rather than patching around it.

### VERIFY

Verification is independent from implementation and runs without Ponytail:

- run sidecar-defined mandatory commands;
- run focused tests for the changed behavior;
- add the smallest regression check for non-trivial logic;
- validate public contracts, data migration, security, and rollback where relevant;
- compare actual behavior with S and B;
- inspect the diff for unintended scope;
- run correctness/security review before any over-engineering review.

A Ponytail review/audit may run afterward as a complexity gate. It never replaces correctness, security, or behavioral verification.

### RECONCILE

- Update existing authoritative business/system documents only as allowed by the sidecar.
- Preserve their human structure and terminology.
- Do not rewrite whole documents for a local change.
- If updates are required but not permitted, record an exact proposed change and unresolved trace gap in the work artifact.
- Synchronize tests, examples, runbooks, schemas, and operational documentation when behavior changed.
- Mark derived GSD state and generated documentation as such.

### REPORT

Report the result in user language:

- outcome and selected route;
- changed code/documents;
- B/S/C trace;
- validation run and result;
- assumptions or approved decisions;
- unresolved gaps, risks, and follow-up only when real.

Do not expose internal slash-command choreography unless diagnosing the harness itself.

## 7. Role and Ponytail policy

| Lane/role | Ponytail | Rule |
|---|---:|---|
| business analyst, requirements reader | **off** | Preserve human meaning; do not minimize requirements. |
| system analyst/specification author | **off** | Produce complete behavioral contracts. |
| researcher/codebase mapper | **off** | Gather evidence without solution bias. |
| implementation planner | **lite** | Use only after B/S behavior is locked; simplify implementation, not scope or acceptance. |
| plan checker | **off** | Independently find omissions and unsafe sequencing. |
| executor/code writer | **full** | Minimize implementation while preserving all requirements. |
| debugger/code fixer | **full** | Fix the shared root cause, not the named symptom. |
| verifier/test reviewer | **off** | Seek counterexamples and missing behavior. |
| security/data/migration reviewer | **off** | Never optimize away controls or evidence. |
| documentation reconciler | **off** | Preserve authoritative meaning and structure. |
| final complexity reviewer | **review/audit** | Optional, after correctness and security pass. |

Never inject Ponytail indiscriminately into every subagent.

## 8. Ponytail implementation policy

After understanding the real flow, stop at the first rung that works:

1. Does this need to be built?
2. Does the codebase already contain the behavior, helper, pattern, or component?
3. Does the standard library solve it?
4. Does the platform/framework/database/browser/cloud already solve it?
5. Does an already-installed dependency solve it?
6. Can the same correct behavior be expressed substantially more simply?
7. Only then write the minimum code that works.

Additional rules:

- Root-cause fix over symptom patch.
- Deletion over addition; boring over clever.
- No speculative abstraction, one-implementation interface, unused configurability, or new dependency without demonstrated need.
- Fewest files and smallest coherent diff, but never the smallest change in the wrong layer.
- Never simplify away input validation at trust boundaries, data integrity, error handling that prevents loss, security, privacy, accessibility, transactional safety, observability required for operation, or explicit requirements.
- Non-trivial logic leaves one runnable regression check.
- A deliberate shortcut with a known ceiling uses a `ponytail:` comment naming both the ceiling and the trigger/upgrade path.
- Do not let implementation minimalism reduce the completeness of B or S.

## 9. Layer-specific change rules

### Business requirement change

1. Update or propose the authoritative B source using its existing human structure.
2. Derive affected S behaviors and acceptance.
3. Plan C changes and tests.
4. Do not implement a materially ambiguous business decision.

### System specification change

1. Confirm alignment with B.
2. Specify observable behavior, state/data rules, interfaces, errors, edge cases, security, NFRs, and compatibility as relevant.
3. Implement and test C.
4. Update examples/contracts/runbooks affected by the behavior.

### Bug fix

1. Reproduce or identify the failure with evidence.
2. Determine intended S behavior and its B rationale when relevant.
3. Trace all callers/paths sharing the root cause.
4. Apply the smallest root-cause fix.
5. Add a regression check.
6. Reconcile stale S/B documentation only if the bug exposed a documentation gap.

### Behavior-preserving refactor

- State the invariant explicitly.
- Keep public behavior and contracts unchanged.
- Prefer deletion/reuse.
- Run equivalence/regression checks.
- Do not edit B/S solely to describe internal code movement.

### Documentation-only change

- Modify the authoritative existing document, not a parallel summary.
- Validate links, examples, terminology, and cross-layer consistency.
- Do not imply code behavior changed unless it did.

## 10. Approval and stop conditions

Do not ask for routine workflow selection or plan-command confirmation.

Pause only when at least one is true:

- materially different user-visible outcomes remain possible;
- authoritative B and S sources conflict and the request does not resolve them;
- the operation is destructive, irreversible, production-facing, or changes sensitive data/security and approval is not already explicit;
- required credentials/permissions are missing;
- a sidecar-defined mandatory approval gate applies;
- continuing would fabricate a source of truth.

Otherwise choose the safest minimal reversible interpretation, record the assumption, and continue.

## 11. Work record template

Materialize only the sections needed:

```markdown
# Work: <work-id> — <title>

- Status: intake | planned | executing | verifying | done | blocked
- Route: R1 | R2 | R3 | R4
- Risk: low | medium | high

## Request
<desired outcome and scope>

## Sources
- B: <path/url#heading or none>
- S: <path/url#heading or derived gap>
- C: <paths/symbols/tests>

## Trace
| Business intent | System behavior | Code/tests | Status |
|---|---|---|---|

## Acceptance
- [ ] <observable condition>

## Plan and tasks
- [ ] <small executable task with verification>

## Decisions and assumptions
- <only material items>

## Verification
- `<command>` — pass/fail/not-run
- Behavioral result: <evidence>

## Documentation reconciliation
- Updated: <authoritative sources>
- Proposed/gap: <when edits are not permitted>

## Result
<what changed, remaining real risk>
```

## 12. Definition of done

A mutation is done only when:

- the requested observable outcome is met;
- B/S/C trace is complete or every gap is explicit;
- implementation follows the relevant system behavior;
- required tests/checks pass, or failures are honestly reported;
- documentation is reconciled according to policy;
- no unauthorized scope or parallel source of truth was introduced;
- destructive/migration/production changes have evidence and rollback appropriate to their risk;
- the work record or final report is sufficient to resume or audit the change.

The shortest path to a verified, traceable result is the correct path.

## 13. Managed update boundary

This file is stack-managed and replaceable as a whole.

- Keep all project paths, source links, commands, authority rules, exceptions, and risk policy in `AGENT.sidecar.md`.
- Keep component-specific coding rules in nested `AGENTS.md` files when appropriate.
- Do not patch installed GSD or Ponytail package files in place.
- A stack update may replace this root `AGENTS.md`, but must never overwrite `AGENT.sidecar.md`.
- If local edits to this file are detected during sync, back it up and stop for explicit diff resolution.
- After every policy update, rerun sidecar-first, automatic-router, B→S→C trace, role-isolation, and verification smoke tests.

## 14. Portable runtime activation

The reusable runtime is `agent-runtime/`; its lifecycle is the single owner of
assurance sequencing. Read the focused instruction named by the active task:
`instructions/{development-lifecycle,agent-allocation,request-clarification,step-thinking,session-continuity,adaptive-reporting,requirement-routing,knowledge-graph}.md`.
The sidecar only supplies product locations, authority exceptions and commands.
When changing the reusable runtime itself, also load `agent-runtime/TESTING.md`;
its reproducible ZOMBIES/property/concurrency/fault/schema/integration/security,
coverage, CRAP, complexity and mutation gates are mandatory for that critical
component. Product code uses the routed project test policy instead.

Logical roles are not automatically separate agents. Work stays in the current
session by default; perspective slots provide internal alternate views. Spawn a
specialist only for a frozen bounded independent task with a defined join, use
parallel workers only with disjoint ownership, and use fresh single-use agents
when a plan/review/security/architect gate requires real independence. One
writer owns an overlapping path. The detailed owner is
`agent-runtime/instructions/agent-allocation.md`.

All sessions share one live worktree version. Before a tracked mutation, use
the local `.agent/coordination/ownership.v1.json` ledger: exact shared files
are FIFO-owned by one writer, while explicit B/S/AC/component keys form a
delivery contour. A queued claim is a blocker, not permission to create a
worktree or alternate snapshot. After assurance a work enters
`READY_FOR_HANDOFF`; the frozen contour produces one mixed-operation release
batch for user testing. Bootstrap displays notices and the one next action.

New tenant/project work uses protocol v4: load the schema-validated project
registry, bind one `ProjectContext/v1` and exact thread ID, add tenant/project
contour keys, and project lifecycle state through the pinned official Backlog
provider. Backlog failure records a GAP and never becomes lifecycle authority.
Readable v2/v3 checkpoints are upgraded only by the explicit typed operation.

Before asking the human, classify the gap and choose `ask`, `retrieve`, `infer`,
`proceed` or `block`. A material question names one decision, exact conflict and
evidence, why it is needed, consequences of mutually exclusive options, at most
one evidence-backed recommendation, the unanswered disposition and a stable question ID.
Preserve the attributable answer; ambiguity remains open. The
detailed owner is `agent-runtime/instructions/request-clarification.md`.

Bootstrap-visible assurance invariant: R0 is read-only. Every tracked R1-R4
mutation follows the canonical runtime lifecycle, including current tests,
exactly three fresh history-isolated blind review receipts for one sealed
fingerprint and reverse validation. Passing assurance automatically enters
`DELIVERY` and presents a deployment manifest: created files, modified files,
the exact environment payload/destination/order, repository-only files that
must not be deployed, and post-deployment checks. It also presents behavior,
evidence and Runtime GAPs; it never asks permission merely to deliver. Protocol
v4 then waits for attributable user testing acceptance or feedback/log evidence;
only the accepted current delivery can complete. A
correction invalidates the prior review/verification set. The detailed and
single normative owner is `agent-runtime/instructions/development-lifecycle.md`.
Commit follows current-version post-presentation acceptance; push requires the user's
separate explicit command.

Every user-facing message begins exactly with `Thinking mode:
<STC|PR-CoT|MAR|5-SOL|META|TRACE>.` The label records the selected external
method, followed by a concise outcome/evidence/blocker summary; never reveal
private chain-of-thought or hidden scoring. On compact/re-entry, reread this
file, the sidecar and active runtime instructions, validate the checkpoint
revision, source revision, leases and imports, then perform its one
`next_action`. The implementation fingerprint is used only to freeze the
scoped change set for review and delivery.

Choose the smallest report that makes the result clear: prose for a simple
outcome, checklist for actions/acceptance, table for mappings/comparisons, and
Mermaid only where flow, state, hierarchy or traceability is materially clearer
or the user asks for it. A diagram is presentation only. Every report still
states Decision, Code, Static, Runtime and GAP evidence truthfully; Static
never closes Runtime.

## 15. Requirement routing and derived ledgers

For durable work, preserve a normative trace `BR → SR → AC → evidence/GAP`:
BR is intent, SR observable system behavior, AC verifiable acceptance, and GAP
is unresolved intent/specification/proof. Freeze a source plan, scope,
verification, rollback/cleanup and fingerprint before mutation. Defects record
actual/expected/reproduction/impact/evidence/hypotheses/acceptance; a temporary
workaround needs an explicit owner decision, risk, expiry and cleanup and never
closes the defect or delivery gap. Flow accepted evidence back to the living
specification.

Evidence has independent classes: Decision, Code, Static and Runtime. Code and
tests describe current behavior; only attributable Runtime observation can close
a Runtime AC. Task systems, GSD projections and Backlog.md are derived ledgers:
they may link work, but never replace BR/SR/AC/GAP authority or delivery/runtime
approval. See `agent-runtime/instructions/requirement-routing.md` for portable
schemas and stop conditions.

## 16. Native knowledge graph

Use the GSD Core `graphify` capability as a derived relationship index when it
is enabled by the sidecar. Query a fresh graph during research and planning,
and use its topology diff as supporting review evidence. A missing, stale,
running or failed graph makes graph relationships approximate and activates
direct source inspection; it never blocks access to canonical B/S/C sources.
The graph never owns BR, SR, AC, Code, tests, approval, delivery or Runtime
truth. Do not create a parallel standalone graph store or MCP integration when
native Graphify satisfies the need. See
`agent-runtime/instructions/knowledge-graph.md`.
