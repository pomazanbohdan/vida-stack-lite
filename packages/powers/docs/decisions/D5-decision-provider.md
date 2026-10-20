---
type: Decision
title: 'D5 — Decision Provider and routing in VP: provider-neutral interface, LLM selection and agent formation'
description: 'VP defines the provider-neutral decision.evaluate contract with the implementations "master LLM of the agent" and "external provider per host config"; Agent Fallback is mandatory; routing = LLM selection, agent formation from a fixed reference, and the flow level (Light/Medium/Full).'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- decision-provider
- routing
- fallback
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: runtime-instruction-activation
  resource: /../../agent/src/research-decision.ts
  title: Runtime — deterministic instruction matching and activation cache
- id: adaptive-routing
  resource: /../../agent/docs/system-specification.md
  title: Agent runtime system specification — adaptive routing
- id: runtime-config
  resource: /../../agent-runtime.config.v1.yaml
  title: AgentRuntimeConfig/v1 — models and selection profiles
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '2'
---

# Decision

**The Decision Provider in VP is the provider-neutral `decision.evaluate` interface** with two
implementations:

| Implementation | When | Source of the decision |
|---|---|---|
| Master LLM of the agent | The typical Standalone mode | The main agent of the host |
| External provider | If the host config specifies it | Host configuration, not VP |

**Agent Fallback is a mandatory part of the contract, not an option.** When the provider is
unavailable, on timeout, API error, malformed format, unknown candidate ID or
insufficient confidence, the choice passes to the main agent; the same scope, policy
and validation rules remain in force, and the source of the decision, the chosen IDs and the reason
for the fallback are materialized.

**Routing is LLM selection, agent formation and the flow level.** Routing selects
the LLM for execution, forms agents from it according to a **fixed reference** (the catalog of
instructions), and sets the flow level — `Full`, `Medium`, `Light` or another one
defined by the profile (research §5). VP does not compile its own execution graph: this is
forbidden even when it forms the agents itself.

LLM selection in Runtime mode relies on registered model/effort profiles
(the adaptive routing of the Runtime owner); in Standalone — on the capabilities of the host. VP does not
own this choice separately, but **supplies** it as an input: the instruction set,
the role, the task contract and the flow level. The description of the admissible options is given by
`workflow.options`; the owner of the route decides, and VP does not substitute its decision.

**Where VP does make decisions:** the semantic selection of instructions (when tags do not give
an unambiguous answer), the selection of duplicate candidates in Findings and the calibration of
scores. Both — through `decision.evaluate`; neither is the owner of the execution graph.

# Contract (conceptual, not an approved schema)

- **Input:** the operation (`instruction-selection`, `finding-dedup`), the product, the task
  context, tags, the **already admissible candidates** (id, name, short description), constraints.
- **Output:** the selected candidate IDs, the score, a short justification, the identification of
  the provider, the fallback flag and the fallback reason.
- **The threshold is not universal:** the `0.90` example from research §4.8 is an illustration, not
  a constant. The semantics of the score and the threshold are calibrated **per operation**; for
  an uncalibrated operation the threshold is not applied, and the result is returned with
  an explicit indication of being uncalibrated. A high score is not proof of correctness, permission or
  completion.
- **Refusal:** a result outside the permitted candidates, an unknown candidate ID or
  a formal error → fallback, not "the best of the unknown".

# Consequences

1. **Research is updated in place**: the mentions "Jeff"/"Jev" (§4.8, §8.4, §12) —
   not an existing component; the Decision Provider concept remains, but without a tie
   to a name or a vendor.
2. **Stage 2**: `decision.evaluate` + `workflow.options` as operations with a result
   contract, calibration and fallback rules; a test for each fallback trigger.
3. **Stage 5**: `vp-mode` uses `decision.evaluate` only where tag search
   is ambiguous; then — LLM selection, agent formation from the fixed reference and
   the flow level per the methodology profile; the owner of the execution graph remains
   untouched.
4. **Stage 6**: findings dedup candidates — through `decision.evaluate`; the rule of
   research §8.4 applies: **a high score is insufficient** — confirmation of
   equivalence is required (reproduction, context, evidence).
5. **The Runtime's own selection does not change:** `resolveInstructionActivation`
   remains deterministic; VP speeds things up only where semantics is needed.
6. **No tie to a vendor API** and no payment on the part of VP: an external
   provider — host configuration.

# Options considered

| Option | Essence | Conclusion |
|---|---|---|
| (a) Provider-neutral interface | Contract + two implementations + mandatory fallback | **Accepted** |
| (b) A specific external provider | A single external decision model | Rejected: VP becomes dependent on external availability and a vendor |
| (c) Choose a specific "Jeff" | Tie to a name/vendor | Rejected: there is no such component in the code; research contains no technical contract for it |
| (d) VP proposes the next action/performer | VP determines the execution route | Rejected: routing in VP is LLM selection, agent formation and the flow level; the owner of the execution graph remains VIDA Core/Mastra (Runtime) or the host (Standalone) |

# Impact on other decisions

- D7, D8 do not change.
- D3: `decision.evaluate` is implemented in VP (catalog scripts), in bundled mode —
  by the same code; no separate runtime request is needed.

# Authority

Decision of the repository owner dated 2026-10-19, recorded in the current conversation.
