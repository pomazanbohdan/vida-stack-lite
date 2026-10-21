---
instruction_id: verify-a-precondition-with-read-only-checks-only
title: Verify a precondition with read-only checks only
summary: "A precondition is one line of prose that names a checkable fact, and the executor verifies it with read-only checks only; a check that would have a side effect is not run."
capability_tags:
  - execute-plan
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A task states a precondition that has to be checked before the task runs.
conditions_does_not_apply_when: The task has no precondition.
artifact_contract_output_type: precondition-check
artifact_contract_required_data:
  - the precondition in one line of prose
  - the read-only check that verifies it
artifact_contract_verified_by: the precondition is one checkable line and the check that ran had no side effect
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-preconditions.md
status: active
revision: 1
---

# Verify a precondition with read-only checks only
`<precondition>` is a single line of prose inside the `<task>` element, placed right after `<name>` and before `<files>`. It is **prose, not a structured block** - concrete enough that the executor agent can run a read-only check (file existence, env var presence, idempotent `GET /health`-style ping), prose enough not to require a parser extension. The executor MUST verify with read-only checks only: no writes, no network POSTs, no secret emission. If a side-effecting check seems required, the executor halts and surfaces a checkpoint rather than running it.
**Vague readiness checks.** "The system is ready" is not checkable. Name the concrete signal: a `curl` response, a file path, an env var name.
**Intra-plan ordering.** "Task 1 has completed" - that is what `depends_on` is for. Reserve `<precondition>` for state the plan's wave/dependency graph cannot express.
**Implementation choices.** "We have chosen library X" - that belongs in the `<action>` body or a `## Decisions` row, not a runtime fact.
**Things the task itself creates.** A precondition names a fact the task *assumes*; if the task produces it, it is a postcondition (`<done>`).
The executor MUST verify with read-only checks only: no writes, no network POSTs, no secret emission. If a side-effecting check seems required, the executor halts and surfaces a checkpoint rather than running it
**Vague readiness checks.** "The system is ready" is not checkable. Name the concrete signal: a `curl` response, a file path, an env var name
**Unmet** | STOP — return a `checkpoint:human-verify` reporting `**Gate:** blocking-human` (use `checkpoint_return_format`) with `**Blocked by:** Precondition not met: <precondition text>`. Do NOT partial-commit the task. Unmet preconditions are NEVER auto-approved — a missing prerequisite is not a verification step a human can rubber-stamp, it is a fact the executor cannot establish on its own
