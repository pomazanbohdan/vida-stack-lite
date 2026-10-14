<!--
managed-by: agent-runtime
template-schema: v1
orchestrator-schema: 1.0
project-sidecar: AGENT.sidecar.md
runtime-package: {{BUNDLE}}
update-policy: replace-this-file-wholesale
project-specific-content: forbidden
-->

# Automatic Development Orchestrator

> **Mandatory bootstrap:** read `./AGENT.sidecar.md` before planning, editing, dispatching agents, or creating workflow artifacts.

This file defines generic orchestration behavior. The project-owned
`AGENT.sidecar.md` maps sources, owners, commands, and exceptions. Users can
describe work in ordinary language; do not require internal workflow commands.

## Bootstrap and authority

For every request:

1. Read this file and then `AGENT.sidecar.md`.
2. Resolve the repository or worktree root, project roots, and sources named by
   the sidecar. Read nested `AGENTS.md` files for work in their subtree.
3. Read only the business, system, code, test, and operational sources relevant
   to the request.
4. If the work changes the reusable agent framework, resolve and read the
   installed lifecycle instruction with
   `vida-agent instructions --path development-lifecycle` before planning.
5. Classify the request and proceed.

If the sidecar is missing or unreadable, answer read-only questions from
available evidence and report reduced confidence. Stop before a mutation. Do
not invent authoritative requirements, validation commands, or document paths.
A missing secondary source is not blocking when it cannot change the result.

The sidecar defines source authority, repository and product roots, ownership,
validation, and approval exceptions. Do not infer paths such as `src/`,
`requirements/`, or `specs/`. Do not copy runtime source into a consumer
project. Resolve project data from its configured project root and runtime
instructions from the installed package.

When the sidecar does not define a case, the user's explicit current
instruction authorizes the requested change. Approved business intent then
constrains system behavior, and approved system specifications constrain code.

When sources conflict, identify the conflict and check whether the current user
request resolves it. Do not rewrite approved business intent to match code or
change code to match a stale specification. Proceed with a reversible
interpretation only when it preserves intended behavior. Pause when the choice
could materially change user-visible behavior, data, security, or an irreversible
operation.

## Trace intent to implementation

Use the smallest trace that establishes the request:

| Layer                     | Meaning                                             | Examples                                                                  |
| ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| **B — Business intent**   | Why the change is needed and what outcome is wanted | User needs, policies, scope, constraints, acceptance language             |
| **S — System behavior**   | What the system must do                             | Components, states, interfaces, data rules, errors, security, performance |
| **C — Code and evidence** | What implements and verifies the behavior           | Source, tests, schemas, configuration, and deployment automation          |

Preserve the trace `B → S → C`. Use existing IDs or stable references such as
`path#heading`, ticket IDs, API operations, symbols, or test names. Do not impose
a new numbering scheme on human documents. For a code-only request, trace back
only as far as needed to establish intended behavior. For a business change,
trace through every affected specification and implementation boundary.

Tests and code show current behavior; they do not by themselves establish
intended behavior. Generated files and stale plans are weaker evidence than
their declared sources.

## Route the request

Classify intent as `answer`, `inspect`, `design`, `change`, or `operate`; identify
the affected layer, scope, and risk. High-risk work includes public contracts,
access control, privacy, money, destructive actions, migrations, production
operations, distributed state, compliance, secrets, and hard-to-reverse changes.

Choose the smallest route that meets the request:

- **Evidence:** answer or explain from sources. Read-only work normally creates
  no work files.
- **Small change:** trace, make a brief plan, implement, and run the focused
  check.
- **Standard change:** trace, plan, check the plan independently when scope or
  risk warrants it, implement, verify, and reconcile sources.
- **Business or high-risk change:** establish B and S intent, research gaps,
  plan dependencies and safeguards, get an independent plan check, implement,
  verify, review, and reconcile.
- **Incident:** triage, contain, find the cause, make the smallest safe fix,
  check for regression, and record deferred reconciliation.

Route documentation-only work to its existing authoritative document. When a
change affects observable behavior, data, interfaces, or non-functional
requirements, confirm the S contract before implementation. For a behavior-
preserving refactor, establish the invariant and preserve public behavior.

Use GSD or another configured harness only as an internal, optional execution
tool. If it is unavailable, follow the same necessary process manually and
report any material limitation. GSD plans, roadmaps, and task files are derived
execution state unless the sidecar explicitly grants them authority. Keep them
in the configured project/workstream namespace; do not initialize or replace
root planning documents just to process a request.

## Plan and execute

Keep the plan executable and no larger than the work requires. Include
acceptance, affected files or components, task order, checks, documentation
impact, and rollout or rollback when relevant. Do not inflate a small request
into a project.

Use configured roles or agents only when they improve the work. Assign one
writer to each shared file. Use independent reviewers for checks that require
independence. Planning, review, research, and requirements roles do not inherit
implementation policy. Apply Ponytail only to code-producing lanes, as a code
minimization policy. Do not let it reduce requirements, acceptance, evidence,
or safeguards. Never require a particular agent framework or style plugin for
all consumers of this template.

Before writing, inspect the existing implementation and reuse an established
owner. Prefer a root-cause fix, deletion or reuse, and the smallest coherent
change. Do not add speculative abstractions or dependencies. Preserve input
validation, integrity, error handling, security, privacy, accessibility,
transactional safety, and operational observability required by the contract.

Do not silently expand scope when evidence changes the plan. Return to trace or
planning when new evidence changes the intended behavior or risk.

## Verify and reconcile

Verification is separate from implementation. Use the sidecar's required
commands and the focused checks for the changed behavior. Compare results with
S and B, inspect the final diff, and use independent correctness or security
review when risk requires it. A complexity review can follow correctness and
security review; it cannot replace them.

Treat tests and code as evidence of current behavior. Record actual outcomes,
including failures and unknown results. Do not retry a possibly completed side
effect until an observed terminal result, no-effect proof, or explicit
reconciliation permits it. Unknown effects remain fenced. Reviews do not grant
Source-write, delivery, or Runtime-acceptance authority.

Update existing authoritative B or S documents only when the request and
sidecar permit it. Preserve their human structure and terminology. Reconcile
examples, contracts, runbooks, schemas, and operational documentation when
behavior changes. Keep one canonical owner for each governed document; do not
create a parallel business or system specification. If an update is required
but not permitted, record the exact proposed change and the unresolved trace.

Report the outcome in the user's language. State what changed, the relevant
trace, checks and results, decisions, and any real remaining gap. Do not expose
internal command choreography unless the user is diagnosing the harness.

## Work records and workflow artifacts

Create work artifacts only when they help audit, coordinate, or resume work.
Read-only questions normally need none. A small reversible edit can remain
diff-driven unless the sidecar requires a record. Use a work record for
cross-layer, multi-file, multi-agent, high-risk, or resumable work.

Resolve the destination in this order: the user's explicit path, the sidecar,
an existing project convention, then `.agent/work/<work-id>/`. Use an existing
ticket ID when available; otherwise use a stable slug. A compact `WORK.md` can
hold the request, sources, trace, acceptance, plan, decisions, verification,
and result. Add separate evidence or handoff files only when needed. Never
create empty scaffolding or a second canonical specification.

Keep one workflow record rather than duplicate plans, task lists, decisions,
and verification files. Split records only when their size or independent
ownership makes a single record hard to use. Mark planning-system content as
derived and link it to B and S.

## Approval and completion

Do not ask the user to choose a routine workflow or confirm a plan command.
Pause only when materially different outcomes remain possible, authoritative
sources conflict without resolution, a required permission is missing, an
approval gate applies, or continuing would invent a source of truth. For a
routine reversible ambiguity, choose the safest interpretation, record it, and
continue.

A mutation is complete when the requested outcome is met, its B/S/C trace is
complete or its gaps are explicit, required checks are reported truthfully,
documentation is reconciled, and no unauthorized scope or parallel authority
was introduced. Match evidence and rollback to the risk. The shortest path to a
verified, traceable result is the right path.

## Installed runtime instructions

Use the installed runtime's focused instruction for lifecycle policy rather
than copying that policy into this file. Resolve an instruction with
`vida-agent instructions --path NAME`, then read the returned path. Supported
names are `development-lifecycle`, `agent-allocation`, `request-clarification`,
`adaptive-reporting`, `requirement-routing`, and `knowledge-graph`. The sidecar
supplies project locations, authority exceptions, and commands. When the
runtime is unavailable, follow applicable project policy and report the
limitation; do not invent a lifecycle or claim the runtime ran.

The lifecycle instruction owns Source authorization and ownership, compare-and-
swap (CAS), unknown-effect recovery, assurance sequencing, and installation.
Preserve its exact ownership and evidence boundaries. Keep native observations
distinct from caller-reported data. Only attributable user testing of the
delivered version can establish Runtime acceptance. Changed inputs invalidate
only evidence bound to those inputs. A review is independent evidence; it does
not authorize Source writes or delivery.

Treat the Source package and installed runtime as separate states. A Source
change does not prove that a qualified artifact was formed, installed, or
observed. Use the lifecycle owner's evidence for each transition. Keep shared
product behavior in the package named by the sidecar and let repository adapters
call that owner.

Provider,
tenant and namespace IDs are integration metadata only. They do not select a
repository or project, or establish lifecycle identity. Resolve roots and
project mappings from the active project configuration and sidecar. Never infer
a different repository or project from integration metadata.
When configured project context includes `repository_id` and `project_ids`,
bind those values from validated configuration.

Task systems, GSD projections, graphs, and Backlog.md are derived ledgers. They
may link work, but do not replace B, S, acceptance, or evidence. Use a graph
only when the sidecar enables one; stale or unavailable graph data requires
direct source inspection and never blocks access to canonical sources.

## Documentation policy

The sidecar or bound documentation policy selects canonical roots, owners,
classes, indexes, and required checks. Do not guess missing paths or create a
parallel documentation authority. Keep active documents current and put
history in the repository or the configured evidence store. A compatibility
statement remains current while that compatibility surface exists.

When a documentation policy enables CLEAR or DocFlow, follow its single
installed lifecycle owner. Keep the active document canonical, current,
evidence-linked, auditable, and ready under that policy. A required blocked or
stale closeout remains a gap. Documentation checks do not replace Code, Static,
Delivery, or Runtime evidence, and cannot establish Runtime acceptance.

The package-owned template generates this entry point. Initialization creates
it only when the project integration output is absent; managed updates must
preserve the active documentation contract under the lifecycle owner's update
policy. Keep project values in `AGENT.sidecar.md` and project configuration.
