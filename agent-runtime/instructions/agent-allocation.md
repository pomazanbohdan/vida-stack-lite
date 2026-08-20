# Agent allocation

## Role-scoped Ponytail policy

The host resolves one repository-owned `PonytailPolicyDecision/v1` per
code-oriented dispatch and carries only its compact decision plus a bounded
role fragment. The trusted managed release and active `SKILL.md` hash are
validated once per capability epoch; the existing capability cache is reused.

| Role | Ponytail mode |
|---|---|
| requirements, business/system research, codebase mapping | `off` |
| implementation planner | `lite` |
| executor, debugger, code-producing specialist | `full` |
| final complexity reviewer | `review` |
| correctness, security/data/migration, verifier, documentation | `off` |
| blind architect | `off` |

`off` is mandatory for independent assurance. A reviewer or architect prompt
must never receive a Ponytail fragment, implementation history, prior finding,
or broad repository context. Ponytail changes implementation mechanics only;
it cannot alter BR/SR/AC, security, evidence, Runtime, acceptance, review,
architect or delivery gates. Protocol v4 binds a validated full code policy
before mutation. v2/v3 remain readable and may receive the same binding through
the typed `bindPonytailPolicy` operation; manual checkpoint edits are not
allowed. A missing, tampered or degraded capability is a typed GAP for a code
lane and may only degrade a read-only lane.

Before the first implementation mutation in a cycle, the host also records an
immutable `PlatformKnowledgeContext/v1` with the applicable official Academy
references, local source pointers and skill IDs/hashes. The executor receives
only its compact digest. After focused checks, a Ponytail-free
`documentation-skill-validator` records `DocumentationSkillValidation/v1`
before exact-three dispatch. This validator is independent from correctness,
security and blind-architect assurance and is never counted as a fourth
reviewer. A delivery feedback or rejection starts a new cycle and invalidates
the prior knowledge context; do not reuse its snapshot as authority.

Logical roles do not imply separate processes. Start every admissible step in
the current session and escalate only when independence, bounded parallelism or
specialization creates more value than context transfer, coordination, write
collision and latency. Agent count is an output of the work topology, never a
quality target.

## Allocation modes

1. **`session`** — default for BOOT, intake, routing, clarification, sequential
   implementation, correction, joins, reconciliation and delivery reporting.
   Keep one coherent writer when paths or state overlap.
2. **`perspective`** — use a named perspective slot for another reasoning view
   inside the same session. It is not an agent, receipt, vote or approval.
3. **`specialist`** — dispatch one agent only for a concrete bounded subtask
   that can run independently while the parent performs useful local work, or
   when verified domain/tool specialization is material. A specialist needs a
   frozen packet, exact output and stop condition.
4. **`parallel_workers`** — dispatch independent workers only when dependency
   order permits it and write scopes are disjoint or isolated by worktrees.
   There is one writer per path; the parent integrates and does not concurrently
   edit a child-owned path. Read-only lanes may share a frozen evidence bundle.
5. **`independent_assurance`** — use fresh single-use agents whenever a gate
   requires independence: R2/R3 plan check, the three blind review lenses,
   required security/data/migration review, or architect escalation. Internal
   perspectives, provider summaries and reused identities cannot substitute.

Use available concurrency for the highest-value ready lanes; do not create an
agent merely because a slot exists. Defer optional enrichment before delaying
a critical writer, reviewer or blocker-removal lane. Exactly three reviewers
means three—not fewer and not extra voting reviewers.

## Configured subtask routing

The repository-owned registry at
`agent-runtime/config/agent-profiles.v1.json` is the single configuration
surface for bounded agent types. Each role declares whether it is enabled, its
model, reasoning level, assurance stage, blind/independent status, context
budget, output schema, and reuse preference. The portable resolver is
`agent-runtime/lib/agent-routing.cjs` and returns a compact
`AgentRoutingDecision/v1`; it does not spawn a host handle or authorize a
lifecycle transition.

The configured model policy is intentionally narrow: all research, mapping,
planning, implementation, debugging, synthesis and ordinary review roles use
`gpt-5.6-luna`, with only `high`, `xhigh` and `max` reasoning levels. The sole
`gpt-5.6-sol` route is the fresh blind architect at `high` and assurance stage 4.
Stages 1-2 cover research and implementation; stage 3 covers plan checks,
documentation validation and the exact-three Luna review set. The stage-4
architect is conditional diagnosis, not an additional review vote.

The current session remains the manager. Before doing research, code mapping,
or a bounded implementation subtask, the manager resolves the role once and
passes only an `AgentTaskContract/v1` with the declared scope, source revision,
context budget, output schema, and stop condition. A same-scope active agent
may be reused only when its scope, source revision, and context digest match.
Otherwise the host starts the configured specialist. `plan-checker`, review,
security, documentation validation, and architect roles are always fresh and
independent; their route cannot reuse the parent or another child.

The resolver is deliberately host-independent. The host adapter may materialize
the returned contract through its existing spawn/wait surface, while the
portable runtime records only the decision and compact telemetry. This avoids
a second spawn/wait implementation and keeps exact-three, blind architect,
Runtime, and delivery gates unchanged. A disabled, unknown, stale, or
unattestable role returns a typed GAP before any handle is created.

## Allocation decision

Choose the first applicable outcome:

1. If a gate requires independent evidence, use `independent_assurance`.
2. If another view is useful but independent evidence is not required, use a
   `perspective`.
3. If the work shares mutable files, checkpoint state or a tight sequential
   dependency with the parent, keep it in `session`.
4. If a bounded specialist task has an exact contract and the parent has useful
   concurrent work, use `specialist`.
5. If two or more ready tasks have disjoint ownership and a defined join, use
   `parallel_workers`; otherwise keep their dependency order in `session`.

For material R2/R3 dispatch, record the selected mode and why it improves
independence, specialization or elapsed time. Do not use an uncalibrated numeric
complexity score. Prefer observed telemetry before setting thresholds.

## Frozen dispatch and join

Every dispatched task defines:

- task identity, outcome and current source revision;
- authoritative inputs and sanitized evidence pointers;
- allowed and protected paths, mutation/read-only mode and ownership;
- acceptance, required output schema and verification responsibility;
- dependencies, stop condition and what the agent must report as a blocker.

Blind assurance packets additionally exclude implementation chat, earlier
findings, correction narrative and other reviewers' outputs. A reused research
or implementation specialist may continue only in the same current scope;
blind reviewers are always fresh and single-use. An architect writes a decision
or correction packet and never implements or approves it. The repeating-cycle
architect is a distinct diagnostic role rather than a fourth reviewer: after
two failed review generations it receives only current BR/SR/AC pointers and
external observation/runtime pointers, with no source, diff, findings,
correction history or agent conversation. It must be one fresh history-isolated
`gpt-5.6-sol`/`high` handle at assurance stage 4. Its `ArchitectureDiagnosis/v1` may direct a
separate correction, but a new full three-review set remains mandatory.
An architect handle that fails the blind-context or profile contract is not
reused. Record an attributable `ArchitectDispatchDisqualification/v1`, retain
its identity in the used-dispatch ledger, and allocate exactly one new unique
history-isolated handle before accepting any diagnosis.

At join, the parent validates attribution, source revision, allowed-path scope,
output shape and test evidence before importing the result. Reject or rebase a
stale result; never merge it by prose. Deduplicate findings, record the imported
result through the active typed continuity contract, release ownership, and
set exactly one next action. Child completion alone never advances a lifecycle
gate.

## Shared-worktree ownership and handoff

All sessions work on one live file version. The untracked local runtime ledger
`.agent/coordination/ownership.v1.json` is the coordination authority, not a
business or delivery source. Before mutation, a work declares explicit
`br:`, `sr:`, `ac:`, `component:`, `file:` and optional `domain:` keys.
Business/specification/component links form a deterministic delivery contour;
an exact `file:` (and an explicitly exclusive domain) has one FIFO writer.
The second writer records and sees a typed notice, then waits for
`serialize`, `handoff`, `adopt`, `read_only` or `recover_expired`; a lease
expiry never transfers a file automatically. Worktrees, snapshots and merge
paths are not part of this runtime. A verified work becomes
`READY_FOR_HANDOFF`; all frozen contour members are presented in one release
batch even when their deployment operations differ.

## Clarification and continuous intent check

The current session owns the lightweight Intent Monitor. After source/tool
discovery and before every mutation or gate, classify each material unknown as:
`ask`, `retrieve`, `infer`, `proceed` or `block`.

- `ask` for user-owned facts, materially different outcomes, sensitive policy
  or irreversible/high-risk decisions;
- `retrieve` for a verifiable fact in an allowed source;
- `infer` only for a reversible low-impact assumption that is recorded;
- `proceed` when the field cannot affect current acceptance;
- `block` when safe execution or truthful evidence is impossible.

Ask the smallest non-redundant batch. A question is valuable when it can change
the outcome, resolve an authority conflict or materially reduce risk; otherwise
retrieve or proceed. New ambiguity during execution returns the work to TRACE
or PLAN instead of spawning a permanent monitor or patching around it.

## Minimal telemetry

For material multi-agent work, retain sanitized counts and timings only:
dispatch mode, started/completed/failed/disqualified, wait duration, imported
results, findings accepted, correction caused and write-scope collision. Do not
retain private reasoning, secrets or full agent chats. Use this evidence to
calibrate future allocation; low-yield agents are removed from the default
topology rather than kept for symmetry.
