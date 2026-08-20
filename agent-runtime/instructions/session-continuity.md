# Session continuity

Persist the smallest durable state: task and step goal, must-do/must-not,
fixed facts, open unknowns, allowed/protected scope, source revision,
receipts/leases/imports, active thinking method and exactly one next action.
On start, compact, re-entry or handoff reread runtime entry instructions, verify
the checkpoint revision, source revision, lease freshness and
import attribution, then execute only `next_action`. Facts from session evidence
may refine feasibility but cannot rewrite normative BR/SR/AC without authority.

When the runtime flow or its gates change, a running developer thread does not
inherit the new rules silently. Its next compact/re-entry must reload the
current `AGENTS.md`, `AGENT.sidecar.md`, lifecycle/allocation/clarification
instructions and `TESTING.md`, then record the new bootstrap revision in its
work trace before mutating. A newly dispatched developer receives that current
bootstrap automatically. The host may send a bounded update notice, but the
notice is not a substitute for rereading the normative files.

Record deltas when invariants are unchanged. A conflict, stale receipt or
protected-scope change stops the next mutation until trace/approval is renewed.

For shared-worktree work, continuity also records the local coordination
ticket, queue generation, active resources, blocked resources and open notices.
On re-entry, a session may continue analysis and mutate only its still-active
resources; it never writes a queued file. It cannot seal, enter VERIFY or mark
`READY_FOR_HANDOFF` until every required resource is claimed or has a typed
handoff/adopt disposition. The untracked ownership ledger is live control
state; the checkpoint preserves only compact references and the next action.

## Historical-runtime migration bridge

Resume legacy work through a read-only semantic import, never by executing the
retired runtime. Classify every substantive record as BR, SR, AC, GAP, defect,
Decision, Code, Static or Runtime evidence and retain its sanitized provenance
pointer. Reconcile that projection against current authoritative sources and
materialize the accepted state in the repository's living specification,
derived task ledger and a fresh `WORK.md`/`resume.json` checkpoint.

The migrated checkpoint records the current baseline, allowed scope, source
revision, acceptance, test disposition, unresolved defects/GAPs and exactly one
`next_action`. Resume at the latest state supported by current evidence:
`TRACE/PLAN` for ambiguous or conflicting intent, `VERIFY` for an already
implemented current change that still needs fresh assurance, or a separate
runtime-pending disposition when development is complete but attributable
observation is missing.

Historical approvals, leases, reviewer identities, readiness markers,
fingerprints and delivery/runtime receipts remain historical. They may explain
provenance but cannot authorize a current transition. Before claiming migration
completeness, prove a semantic crosswalk from every substantive legacy item to
a current canonical record or an explicit historical-only disposition and run
transition-equivalence checks for any imported state.
