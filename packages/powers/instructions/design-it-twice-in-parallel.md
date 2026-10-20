---
instruction_id: design-it-twice-in-parallel
title: Design it twice in parallel
summary: "Explore alternative interfaces by spawning parallel designers with different constraints, compare them on depth, locality and seam placement, and give an opinionated recommendation."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: The first interface idea for a deepening candidate may not be the best.
conditions_does_not_apply_when: One interface is already settled.
artifact_contract_output_type: design-comparison
artifact_contract_required_data:
  - candidate interfaces
  - comparison axes
  - recommendation
artifact_contract_verified_by: each candidate is scored on the same axes and a recommendation is stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/codebase-design/DESIGN-IT-TWICE.md
status: active
revision: 1
---

# Design it twice in parallel
When the user wants to explore alternative interfaces for a chosen deepening candidate, use this parallel sub-agent pattern. Based on "Design It Twice" (Ousterhout): your first idea is unlikely to be the best.
## Process
### 1. Frame the problem space
Before spawning sub-agents, write a user-facing explanation of the problem space for the chosen candidate:
- The constraints any new interface would need to satisfy
- The dependencies it would rely on, and which category they fall into
- A rough illustrative code sketch to ground the constraints, not a proposal, just a way to make the constraints concrete
Show this to the user, then immediately proceed to Step 2. The user reads and thinks while the sub-agents work in parallel.
### 2. Spawn sub-agents
Spawn 3+ sub-agents in parallel. Each must produce a **radically different** interface for the deepened module.
Prompt each sub-agent with a separate technical brief (file paths, coupling details, dependency category, what sits behind the seam). The brief is independent of the user-facing problem-space explanation in Step 1. Give each agent a different design constraint:
- Agent 1: "Minimize the interface: aim for 1–3 entry points max. Maximise leverage per entry point."
- Agent 2: "Maximise flexibility: support many use cases and extension."
- Agent 3: "Optimise for the most common caller: make the default case trivial."
- Agent 4 (if applicable): "Design around ports & adapters for cross-seam dependencies."
Each sub-agent outputs:
1. Interface (types, methods, params, plus invariants, ordering, error modes)
2. Usage example showing how callers use it
3. What the implementation hides behind the seam
4. Dependency strategy and adapters
5. Trade-offs: where leverage is high, where it's thin
### 3. Present and compare
Present designs sequentially so the user can absorb each one, then compare them in prose. Contrast by **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**.
After comparing, give your own recommendation: which design you think is strongest and why. If elements from different designs would combine well, propose a hybrid. Be opinionated: the user wants a strong read, not a menu.
