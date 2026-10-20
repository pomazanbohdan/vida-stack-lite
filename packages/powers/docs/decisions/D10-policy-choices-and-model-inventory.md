---
type: Decision
title: 'D10 — Policies as a choice in setup, model inventory and the JSON payload of the managed block'
description: 'Opposing approval policies live in the instructions as alternatives of one group, the choice is made by the user during setup; setup records the available models and the independent verification lane; the managed block in the YAML carrier carries a JSON payload that is read without a YAML parser.'
status: stable
stale_after: '2027-10-20T00:00:00Z'
tags:
- vida-powers
- methodology-profile
- configuration-surface
- verification
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: d7
  resource: /decisions/D7-consumer-initialization.md
  title: D7 — Environment-driven VP initialization
- id: d8
  resource: /decisions/D8-methodology-profile.md
  title: 'D8 — Methodology profile: one VP schema, carrier per environment'
- id: design
  resource: /catalog-design.md
  title: Vida Powers — instruction catalog design
- id: step-e-plan
  resource: /task-plan-step-e.md
  title: Vida Powers — task-level plan for step E
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-20T19:45:00Z' }
verified: { by: human:repository-owner, at: '2026-10-20T20:10:00Z' }
revision: '2'
---

# Decision

## 1. Policies — as alternatives, the choice is made by the user

**Essence.** Instructions with **opposing algorithms** cannot be selected "by default"
during execution: the agent must not decide this itself. They live in the corpus as
**alternatives of one profile group**, each instruction:

- describes **its own** algorithm and the condition under which it applies;
- **names the other alternative** (a cross-reference in the text), so that the contradiction is visible
  in the instructions themselves;
- says: if another policy is active — follow it, do not invent a third behavior.

**The choice is made by the user during setup.** `vp-setup` shows the alternatives
with descriptions and records the choice in the effective profile. A group for which no choice has been made
remains **unresolved**: no alternative is substituted silently, and
`vp-mode` moves the question into a negotiation request.

**Groups with a product policy** (`user_decision: false`) have the active alternative
**explicitly declared** in the source profile (the `default` field); this is a recorded
policy, not a silent default value. For user-decision groups the
`default` field is forbidden. A user choice cannot change a group with a product
policy — such a choice is rejected.

**Consequence for compose.** A profile group is a single choice: a dependency on an inactive
alternative is satisfied by the **active** alternative of that group. A mutual requirement
between two alternatives of one group is not allowed (they do not require one
another).

**The first such pair:** `proceed-without-waiting-for-confirmation` ↔
`size-and-gate-the-work` (group `approval-policy`, `user_decision: true`).

## 2. Independent verification: the executor is not merely "another model"

**Essence.** The ladder of executors (per the `verify-with-independent-lanes` instruction):

1. another model family of **another** vendor;
2. another model of the **same** vendor;
3. a **blind** agent on the same model (without the context of the originating session).

Each lane receives a separate brief and separate evidence sources and does not see
the intermediate conclusions of other lanes; the chosen rung limits the strength of the evidence, and this
is marked explicitly. **Work does not stop** when only one model is available:
the strongest available rung is used, and the limitation is named.

**Setup records the environment.** `vp-setup` collects an **inventory of
available models and vendors** (primary models, agent ones, other families
of the same vendor and of others) — without invented slugs — and assigns models
to roles and verification lanes (the `record-available-executor-models` instruction).
`lane_policy` **is computed** deterministically from the inventory according to the ladder, and is not
requested from the user.

## 3. The managed block in the YAML carrier carries a JSON payload

**Essence.** D7/D8 called the managed block a "YAML block". Clarification: in the YAML carrier
(`AGENTS.md`, `CLAUDE.md`) the managed block is **markers + a fenced ```json block** with
the effective profile. It is read through `JSON.parse` without a YAML parser (SR-62), so
the shipped scripts remain runtime-agnostic, and idempotency
is verified against the **parsed** profile, not against the text.

**Consequences:** D7 §4 and D8 (the carrier section) are supplemented by this clarification; "managed
YAML block" in D7/D8 is read as "managed block with a JSON payload".

## 4. Setup hooks — deferred with a condition

Hooks (D4 Stage 5, SR-60) are not part of this step: they depend on the runtime.
The return condition: the runtime request (step G) provides the attachment point; until then
setup creates no hook and does not change files of the installed agent
package (SR-57).

## 5. Manifest layout

Per-host `marketplace.json` and `plugin.json` live in their own directory (the D4b pattern);
the package description for the marketplace — at the root of the package (`source: "./"`). The owner of the manifests
is the package build (a separate step, not in the current scope).

---

# Consequences

| Consequence | Where it is recorded |
|---|---|
| Groups and alternatives are declared by the source profile `VPMethodologyProfile/v1` | `config/methodology-profile.json` + schema (step E, Task E1) |
| Choice of policies, model inventory, verification lane | effective profile `VPEffectiveProfile/v1` (Task E2) |
| Managed block = markers + ```json | `skills/vp-setup/scripts/setup.ts` (Task E3), D7/D8 clarification |
| Replacement of an inactive alternative in compose | `catalog.compose` + design §7 (Task E2) |
| Hooks — out of scope, return condition | this record, §4 |

# Rejected options

| Option | Why rejected |
|---|---|
| The agent chooses the approval policy itself by default | Forbidden by the silent-value rule (SR-19, SR-69) and contradicts the owner's mandate: the choice is the user's decision |
| One skill with two modes instead of two instructions | The contradiction would remain hidden in one text; the mandate requires visibility in the instructions themselves |
| A YAML parser in the shipped `setup.ts` | SR-62: YAML is not parsed in shipped code |
| Manual choice of the verification lane by the user | The lane is determined by the availability of models and by the ladder; a manual choice is weaker than a deterministic rule |
