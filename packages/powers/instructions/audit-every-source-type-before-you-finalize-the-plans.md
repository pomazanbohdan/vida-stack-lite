---
instruction_id: audit-every-source-type-before-you-finalize-the-plans
title: Audit every source type before you finalize the plans
summary: "Before the plans are final, every goal, requirement, research item and decision is audited against the plans that cover it."
capability_tags:
  - plan-implementation
pattern_tags:
  - dimension-sweep
conditions_applies_when: The plans of a phase are about to be finalized.
conditions_does_not_apply_when: The phase has no source artifacts to audit.
artifact_contract_output_type: source-audit
artifact_contract_required_data:
  - the four source types
  - the plan that covers each item
  - the uncovered items
artifact_contract_verified_by: every source item is marked covered or is reported as unplanned
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-source-audit.md
status: active
revision: 1
---

# Audit every source type before you finalize the plans
Before finalizing plans, produce a **source audit** covering ALL four artifact types
1. **GOAL** — The `goal:` field from ROADMAP.md for this phase. The primary success condition
2. **REQ** — Every REQ-ID in `phase_req_ids`. Cross-reference REQUIREMENTS.md for descriptions
3. **RESEARCH** — Technical approaches, discovered constraints, and features identified in RESEARCH.md. Exclude items explicitly marked "out of scope" or "future work" by the researcher
4. **CONTEXT** — Every D-XX decision from CONTEXT.md `<decisions>` section
If ANY row is `⚠ MISSING`, do NOT finalize the plan set silently. Return to the orchestrator
