---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-source-audit-md-30a48d7c-c01"
title: "gsd-core: gsd-core/references/planner-source-audit.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/references/planner-source-audit.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-source-audit.md\"}"
atom_ids:
  - audit-every-source-type-before-you-finalize-the-plans
  - audit-the-plan-set-against-every-source-artifact
  - do-not-flag-a-deferred-or-out-of-scope-item-as-a-gap
  - plan-a-feature-unless-a-constraint-blocks-it
atom_count: 4
atoms: "[{\"atom_id\":\"audit-every-source-type-before-you-finalize-the-plans\",\"file_sha256\":\"f83b95a61223161014e8b05c2587f3b2032d2e1d90636a3a50e7f05277e16ae2\",\"content_sha256\":\"ba95d6f1dc2ac161ae0bbc9af8021c6f3bce0b54d9c5fbad5159a7b971d50ae6\",\"file_bytes\":1802,\"body_bytes\":694},{\"atom_id\":\"audit-the-plan-set-against-every-source-artifact\",\"file_sha256\":\"451e7e69bf3dc651fbf3b6379a2702fa9cf6e521ed3d6adba764a34169174e77\",\"content_sha256\":\"1b1b378fe58f00f1951c8b8bf66aa216998cafe945ec3fc48ec3ba905ec61205\",\"file_bytes\":1632,\"body_bytes\":448},{\"atom_id\":\"do-not-flag-a-deferred-or-out-of-scope-item-as-a-gap\",\"file_sha256\":\"89f3de97cc10bf30067be8a1b57c83433e4b36947de401b7e2758dbf57a0f710\",\"content_sha256\":\"ccf89b54221c5b95e35cac90a76f13d159aefe4de59b2ee926e4149e8e941745\",\"file_bytes\":1419,\"body_bytes\":343},{\"atom_id\":\"plan-a-feature-unless-a-constraint-blocks-it\",\"file_sha256\":\"6a8e443e6aff746c0781affd648d6df1f886f15421492f1dbc4b9e93dd47dd77\",\"content_sha256\":\"ef3f5d606b11aac720990381545f01867da4c2d6e488420c2c3c6a4ad2a5bd25\",\"file_bytes\":2157,\"body_bytes\":909}]"
carrier_sha256: 69b50af8c8faacdbe48c63bfe83dd5dd14eb3ad146e92873807f41e5da51ce57
carrier_bytes: 7635
revision: 1
status: active
---
<!-- vpmodule:atom:begin audit-every-source-type-before-you-finalize-the-plans -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-source-audit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
  - operations
---

# Audit every source type before you finalize the plans
Before finalizing plans, produce a **source audit** covering ALL four artifact types
1. **GOAL** — The `goal:` field from ROADMAP.md for this phase. The primary success condition
2. **REQ** — Every REQ-ID in `phase_req_ids`. Cross-reference REQUIREMENTS.md for descriptions
3. **RESEARCH** — Technical approaches, discovered constraints, and features identified in RESEARCH.md. Exclude items explicitly marked "out of scope" or "future work" by the researcher
4. **CONTEXT** — Every D-XX decision from CONTEXT.md `<decisions>` section
If ANY row is `⚠ MISSING`, do NOT finalize the plan set silently. Return to the orchestrator
<!-- vpmodule:atom:end audit-every-source-type-before-you-finalize-the-plans -->
<!-- vpmodule:atom:begin audit-the-plan-set-against-every-source-artifact -->
---
instruction_id: audit-the-plan-set-against-every-source-artifact
title: Audit the plan set against every source artifact
summary: "Before the plan set is final, every artifact the phase draws on is audited; an item that no plan covers stops the finalization and goes back to the owner with the options."
capability_tags:
  - plan-implementation
pattern_tags:
  - dimension-sweep
conditions_applies_when: The plan set is about to be finalized.
conditions_does_not_apply_when: The phase has no source artifacts to audit against.
artifact_contract_output_type: source-audit
artifact_contract_required_data:
  - the audit row of every source artifact
  - the status of each row
  - the options put to the owner for an uncovered item
artifact_contract_verified_by: every source item is covered or the plan set was not finalized silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-source-audit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Audit the plan set against every source artifact
Before finalizing plans, produce a **source audit** covering every artifact type the phase draws on.
If ANY row is ⚠ MISSING, do NOT finalize the plan set silently. Return to the orchestrator:
Options: A) Add a plan to cover this item B) Split phase: move to a sub-phase C) Defer explicitly: add to backlog with developer confirmation
→ Awaiting developer decision before finalizing plan set.
<!-- vpmodule:atom:end audit-the-plan-set-against-every-source-artifact -->
<!-- vpmodule:atom:begin do-not-flag-a-deferred-or-out-of-scope-item-as-a-gap -->
---
instruction_id: do-not-flag-a-deferred-or-out-of-scope-item-as-a-gap
title: Do not flag a deferred or out-of-scope item as a gap
summary: "An item the developer deferred, an item owned by another phase and an item the researcher marked out of scope are not gaps."
capability_tags:
  - plan-implementation
pattern_tags:
  - scope-routing
conditions_applies_when: A source audit classifies an item as covered or missing.
conditions_does_not_apply_when: The item is in scope and no plan covers it.
artifact_contract_output_type: gap-classification
artifact_contract_required_data:
  - the item
  - the reason it is not a gap
artifact_contract_verified_by: "no deferred, out-of-scope or other-phase item is reported as missing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-source-audit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not flag a deferred or out-of-scope item as a gap
Do not flag these as MISSING:
- Items in `## Deferred Ideas` in CONTEXT.md — developer chose to defer these
- Items scoped to a different phase via `phase_req_ids` — not assigned to this phase
- Items in RESEARCH.md explicitly marked "out of scope" or "future work" by the researcher
<!-- vpmodule:atom:end do-not-flag-a-deferred-or-out-of-scope-item-as-a-gap -->
<!-- vpmodule:atom:begin plan-a-feature-unless-a-constraint-blocks-it -->
---
instruction_id: plan-a-feature-unless-a-constraint-blocks-it
title: Plan a feature unless a constraint blocks it
summary: "A feature is split or flagged only for a constraint - context cost, missing information or a dependency conflict - and a judgement about difficulty is not a reason to leave it out."
capability_tags:
  - plan-implementation
  - disagree-with-reasons
pattern_tags:
  - implementation-planning
  - reasoned-disagreement
conditions_applies_when: "A feature is about to be split, deferred or left out of the plan."
conditions_does_not_apply_when: A constraint already blocks the feature.
artifact_contract_output_type: planning-decision
artifact_contract_required_data:
  - the constraint that blocks the feature
  - the feature that is planned
artifact_contract_verified_by: every feature without a constraint is in the plan and every exclusion names a constraint
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-source-audit.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Plan a feature unless a constraint blocks it
### Authority Limits — Constraint Examples

The planner's only legitimate reasons to split or flag a feature are **constraints**, not judgments about difficulty:

**Valid (constraints):**
- ✓ "This task touches 9 files and would consume ~45% context — split into two tasks"
- ✓ "No API key or endpoint is defined in any source artifact — need developer input"
- ✓ "This feature depends on the auth system built in Phase 03, which is not yet complete"

**Invalid (difficulty judgments):**
- ✗ "This is complex and would be difficult to implement correctly"
- ✗ "Integrating with an external service could take a long time"
- ✗ "This is a challenging feature that might be better left to a future phase"

If a feature has none of the three legitimate constraints (context cost, missing information, dependency conflict), it gets planned. Period.
<!-- vpmodule:atom:end plan-a-feature-unless-a-constraint-blocks-it -->