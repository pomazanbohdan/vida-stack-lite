---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-thinking-models-planning-md-84b3844c-c01"
title: "gsd-core: gsd-core/references/thinking-models-planning.md module"
summary: "Carrier for 6 atomic instructions from gsd-core:gsd-core/references/thinking-models-planning.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/thinking-models-planning.md\"}"
atom_ids:
  - check-the-task-breakdown-is-mece-at-the-requirement-level
  - resolve-every-low-confidence-item-or-document-why-it-is-acceptable
  - scale-the-reasoning-depth-to-what-the-situation-needs
  - schedule-the-hardest-constraint-first
  - take-the-sufficient-option-in-order
  - target-the-root-cause-category-in-a-gap-closure-plan
atom_count: 6
atoms: "[{\"atom_id\":\"check-the-task-breakdown-is-mece-at-the-requirement-level\",\"file_sha256\":\"f744b7d1264e43b6274dd50a5280413d70dfad44f4fa867211b5a62768da7d9c\",\"content_sha256\":\"31245f8cee858025f782cdee4f2026a2853bcaa8aa9baf52166ae707213d2854\",\"file_bytes\":1522,\"body_bytes\":383},{\"atom_id\":\"resolve-every-low-confidence-item-or-document-why-it-is-acceptable\",\"file_sha256\":\"069a0b4ef59a6986c21fcad363a3538529af768774cdf79828f1dd436091d14d\",\"content_sha256\":\"738e3769c78ced4c8e32db81100989f936b998852937d4aecd1c98e96887e030\",\"file_bytes\":1535,\"body_bytes\":412},{\"atom_id\":\"scale-the-reasoning-depth-to-what-the-situation-needs\",\"file_sha256\":\"96cd045242ffdd34ed73483cc824f77c5ee23598f157d38ad8d085c0e982d475\",\"content_sha256\":\"f2dcc6de71a08078e57b35ea800dd32ebfc6cd86639eb36d3a4f5513e27f0f11\",\"file_bytes\":1667,\"body_bytes\":653},{\"atom_id\":\"schedule-the-hardest-constraint-first\",\"file_sha256\":\"57eb4ade6ff3d7a1b7958e427cbf0bbd10a07ab14fa428c055d79f67eff4d158\",\"content_sha256\":\"dcedf4d91fac906bf1d0231e369bfbfafb53b557981b4d3183865fcc46919f0a\",\"file_bytes\":1422,\"body_bytes\":352},{\"atom_id\":\"take-the-sufficient-option-in-order\",\"file_sha256\":\"9494922188a6ffce1f80ef02f6cb204bd3ec30d0763e791bd26da2f998c758e1\",\"content_sha256\":\"c5faeee1406bf07d366b27f7103e652ef976e2ae3c40601d4e61508cd54d1762\",\"file_bytes\":1710,\"body_bytes\":629},{\"atom_id\":\"target-the-root-cause-category-in-a-gap-closure-plan\",\"file_sha256\":\"337b75421b1d6af78712f61604d62235e852258fba6d0ac57b000bce5551012b\",\"content_sha256\":\"bcae59c250da4fa1dbce974220e14b380ec834ab36106f65f4a7640b96fabb35\",\"file_bytes\":1463,\"body_bytes\":358}]"
carrier_sha256: be0f1981c4483f8d1c61e58c1b9e572fc183be822ed7d65f6fe4e7b4e138c897
carrier_bytes: 10266
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-the-task-breakdown-is-mece-at-the-requirement-level -->
---
instruction_id: check-the-task-breakdown-is-mece-at-the-requirement-level
title: Check the task breakdown is MECE at the requirement level
summary: "Every requirement maps to exactly one task, two tasks on one file serve different requirements, and no requirement is uncovered."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: The task breakdown of a phase is complete.
conditions_does_not_apply_when: The phase has a single requirement and a single obvious task.
artifact_contract_output_type: requirement-coverage
artifact_contract_required_data:
  - the requirements
  - the task each maps to
  - the uncovered requirements
artifact_contract_verified_by: every requirement maps to exactly one task and no requirement is uncovered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Check the task breakdown is MECE at the requirement level
Verify this task breakdown is MECE at the REQUIREMENT level: (1) list every requirement from the phase goal, (2) confirm each maps to exactly one task's `<done>`, (3) if two tasks modify the same file, confirm they modify DIFFERENT sections or serve DIFFERENT requirements, (4) flag any requirement not covered by any task
<!-- vpmodule:atom:end check-the-task-breakdown-is-mece-at-the-requirement-level -->
<!-- vpmodule:atom:begin resolve-every-low-confidence-item-or-document-why-it-is-acceptable -->
---
instruction_id: resolve-every-low-confidence-item-or-document-why-it-is-acceptable
title: Resolve every low-confidence item or document why it is acceptable
summary: Every unresolved decision item and every low-confidence recommendation becomes a decision task or a written acceptance of the risk.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The plan is about to be finalized and the research carries open items.
conditions_does_not_apply_when: The research carries no open items.
artifact_contract_output_type: open-item-disposition
artifact_contract_required_data:
  - the open item
  - the decision task or the documented acceptance
artifact_contract_verified_by: no open item was silently accepted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Resolve every low-confidence item or document why it is acceptable
Before finalizing the plan, read ALL `[NEEDS DECISION]` items and LOW-confidence recommendations from SUMMARY.md. For each: either (a) create a `checkpoint:decision` task to resolve it, or (b) document why the risk is acceptable in the plan's deviation notes. LOW-confidence items that are silently accepted become undocumented technical debt
<!-- vpmodule:atom:end resolve-every-low-confidence-item-or-document-why-it-is-acceptable -->
<!-- vpmodule:atom:begin scale-the-reasoning-depth-to-what-the-situation-needs -->
---
instruction_id: scale-the-reasoning-depth-to-what-the-situation-needs
title: Scale the reasoning depth to what the situation needs
summary: The structured reasoning models are skipped where the situation cannot benefit from them.
capability_tags:
  - plan-implementation
pattern_tags:
  - stakes-calibrated-rigor
conditions_applies_when: A decision point is reached.
conditions_does_not_apply_when: The situation is ambiguous or the research is unresolved.
artifact_contract_output_type: reasoning-scope
artifact_contract_required_data:
  - the situation
  - the models that were applied
artifact_contract_verified_by: the applied models match the situation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Scale the reasoning depth to what the situation needs
Skip structured reasoning models when the situation does not benefit from them
**Single-task plans** -- If the phase has one clear requirement and one obvious task, do not run Pre-Mortem or MECE analysis. Write the task directly
**Revision iterations** -- When revising a plan based on checker feedback, focus on fixing the flagged issues. Do not re-run the full model suite on every revision pass -- apply only the model relevant to the specific issue
**Boilerplate plans** -- Configuration changes, version bumps, documentation updates. These do not have failure modes worth pre-mortem analysis
<!-- vpmodule:atom:end scale-the-reasoning-depth-to-what-the-situation-needs -->
<!-- vpmodule:atom:begin schedule-the-hardest-constraint-first -->
---
instruction_id: schedule-the-hardest-constraint-first
title: Schedule the hardest constraint first
summary: "The one constraint that makes everything else irrelevant is scheduled first, and an unfamiliar dependency gets a spike before the implementation."
capability_tags:
  - plan-implementation
pattern_tags:
  - risk-first-ordering
conditions_applies_when: The tasks of a phase are ordered.
conditions_does_not_apply_when: The phase has no constraint that dominates the rest.
artifact_contract_output_type: constraint-order
artifact_contract_required_data:
  - the hardest constraint
  - the task it was scheduled into
artifact_contract_verified_by: the hardest constraint is in the first two tasks
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Schedule the hardest constraint first
Identify the single hardest constraint in this phase -- the one thing that, if it doesn't work, makes everything else irrelevant. Schedule that constraint as Task 1 or 2, not last. If the constraint involves an external API or unfamiliar library, add a spike/proof-of-concept task before the main implementation
<!-- vpmodule:atom:end schedule-the-hardest-constraint-first -->
<!-- vpmodule:atom:begin take-the-sufficient-option-in-order -->
---
instruction_id: take-the-sufficient-option-in-order
title: Take the sufficient option in order
summary: The options are tried in a fixed order and the first demonstrably sufficient one is taken — without shrinking the requested scope.
capability_tags:
  - plan-implementation
pattern_tags:
  - code-minimization
conditions_applies_when: Several ways of implementing the task are available.
conditions_does_not_apply_when: The task is already fixed by a locked decision.
artifact_contract_output_type: sufficiency-order
artifact_contract_required_data:
  - the rung taken
  - why the earlier rungs did not suffice
artifact_contract_verified_by: the option taken is the first sufficient one and the requested scope is unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Take the sufficient option in order
After preserving locked user decisions and complete requirement coverage, choose the first option that is demonstrably sufficient for the task's `<done>` condition:
1. Existing project behavior, helper, or established pattern
2. Standard-library capability
3. Native platform capability
4. Already-installed dependency
5. Minimum new implementation
This ordering is a sufficiency check, not permission to make the task smaller. It must never reduce requested scope or override locked user decisions, requirement coverage, security, validation, accessibility, error handling, or verification
<!-- vpmodule:atom:end take-the-sufficient-option-in-order -->
<!-- vpmodule:atom:begin target-the-root-cause-category-in-a-gap-closure-plan -->
---
instruction_id: target-the-root-cause-category-in-a-gap-closure-plan
title: Target the root-cause category in a gap-closure plan
summary: "The fix plan names the category the gap came from — a plan deficiency, an execution miss or a changed assumption — and targets that, not the symptom."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A gap-closure plan is written for a reported gap.
conditions_does_not_apply_when: The gap has no known cause yet.
artifact_contract_output_type: root-cause-plan
artifact_contract_required_data:
  - the root-cause category
  - the fix that targets it
artifact_contract_verified_by: the fix targets the named category and not only the symptom
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Target the root-cause category in a gap-closure plan
Before writing the fix plan, apply a single "why" round: Why did this gap occur? Was it a plan deficiency (wrong task), an execution miss (correct task, wrong implementation), or a changed assumption (environment/dependency shift)? The fix plan must target the root cause category, not just the symptom
<!-- vpmodule:atom:end target-the-root-cause-category-in-a-gap-closure-plan -->