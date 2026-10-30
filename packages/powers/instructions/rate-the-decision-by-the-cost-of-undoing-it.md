---
instruction_id: rate-the-decision-by-the-cost-of-undoing-it
title: Rate the decision by the cost of undoing it
summary: "A decision is rated reversible, costly or one-way by what undoing it would cost, and a one-way decision earns a decision gate before the task that implements it unless the human already settled it."
capability_tags:
  - keep-decision-trail
  - plan-implementation
pattern_tags:
  - prepared-reversal
conditions_applies_when: A plan implements a decision whose undo cost is above the cheap end.
conditions_does_not_apply_when: The decision is local and cheap to undo.
artifact_contract_output_type: reversibility-rating
artifact_contract_required_data:
  - the rating
  - the undo cost that justifies it
  - the gate inserted for a one-way decision
artifact_contract_verified_by: "the rating names the concrete migration or broken contract, and a one-way decision is gated before the task that implements it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-reversibility.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Rate the decision by the cost of undoing it
Rate the **decision**, not the task's difficulty. The question is always: *if this turns out wrong three phases from now, what does undoing it cost?*
For each significant decision in this plan, ask what undoing it would cost three phases from now, and rate it `reversible` (local and cheap to change), `costly` (undo touches many call sites or needs a coordinated change), or `one-way` (undo requires a migration, breaks a published contract, or is impossible). Spend analysis time proportional to the rating.
| Rating | Undo cost | Planner behavior |
|---|---|---|
| `reversible` | Local and cheap — one file, one function, an implementation swapped behind a stable interface. | `reversible` decisions get no checkpoint and no flag; the task proceeds normally. |
| `costly` | Undo touches many call sites or needs a coordinated change — a shared interface shape, a cross-module contract, a dependency major bump. | `costly` decisions are flagged in the plan so the reader sees the weight, but this does not block execution. |
| `one-way` | Undo requires a data migration, breaks a published contract, or cannot be done at all — on-disk/wire format, public API shape, external-service lock-in, a schema other systems already read. | The planner inserts a `checkpoint:decision` **before** the dependent task, so the human confirms the door before the agent walks through it — unless the human already settled that decision (see *Already settled*). |
**When unsure, rate it `reversible`.** The value of this feature is *discrimination*. A planner that rates everything `one-way` produces checkpoint fatigue, and a plan nobody reads gates nothing. If you cannot name the concrete migration or the concrete broken contract, it is not `one-way`.
For a `one-way` rating, emit **two** things:
1. A `checkpoint:decision` task immediately before the dependent task, framing the door as options with pros and cons
The `<decision>` names the one-way choice; the `<context>` states what the undo would cost.
2. The `<reversibility rating="one-way">` element on the dependent task itself, so the signal survives in the plan after the checkpoint is resolved.
Any plan containing a checkpoint must set `autonomous: false` in frontmatter — inserting a reversibility gate flips a previously-autonomous plan, so update the frontmatter in the same pass.
Only a **newly surfaced** `one-way` decision — one nothing above records — earns a fresh checkpoint before the implementing task. If you cannot point at the record, treat the decision as newly surfaced.
The better move, when available, is to *make the decision reversible* — put the format behind a writer seam, version the contract, keep the vendor call behind an adapter. Prefer removing the irreversibility over gating it.
