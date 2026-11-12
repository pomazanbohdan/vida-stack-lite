---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-project-md-31496872-c01"
title: "gsd-core: gsd-core/templates/project.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/templates/project.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/project.md\"}"
atom_ids:
  - give-every-constraint-its-reason
  - name-the-one-thing-that-must-work
  - split-requirements-into-validated-active-and-out-of-scope
  - track-the-outcome-of-a-decision-when-it-becomes-known
atom_count: 4
atoms: "[{\"atom_id\":\"give-every-constraint-its-reason\",\"file_sha256\":\"197ee12f4b44b4f03c24134c5f1b820fe9dfd137ab5284031b40098a39d84fad\",\"content_sha256\":\"ee166c42cb1b097ff114fb7e016af0357268f341bb25f5b0f115e41a7e9f61b6\",\"file_bytes\":1256,\"body_bytes\":133},{\"atom_id\":\"name-the-one-thing-that-must-work\",\"file_sha256\":\"20dfeb53217eb93f6b65f970e50e9c17e6dd0c46e3bbc21942683413f56124c1\",\"content_sha256\":\"9c1e33264901488ddb901792ea2d45c6f4d7f8ce2fe5ab83472388ff12c82116\",\"file_bytes\":1205,\"body_bytes\":245},{\"atom_id\":\"split-requirements-into-validated-active-and-out-of-scope\",\"file_sha256\":\"9357d336869da5fe5b74831dafc9e5fba1ea2409d07da466f589221cac299c0c\",\"content_sha256\":\"ae7f5b8e60542834d514708d6fc7f7ee365d2984ac778a60ed8aded9da8b4779\",\"file_bytes\":1730,\"body_bytes\":578},{\"atom_id\":\"track-the-outcome-of-a-decision-when-it-becomes-known\",\"file_sha256\":\"63d01c701065b21bb05c9283f545f76efd0e7846f613751063046ba4ce904afa\",\"content_sha256\":\"249ac6c5c5eac3403756712226c003938252d588b2bfdca82e9213f8357eb0ed\",\"file_bytes\":1222,\"body_bytes\":212}]"
carrier_sha256: c306e7eb7c1053b646372d8a245b5acbcd42160e0c3aa1d744eb22e3d1e9cd9d
carrier_bytes: 5994
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-every-constraint-its-reason -->
---
instruction_id: give-every-constraint-its-reason
title: Give every constraint its reason
summary: "A constraint states the why, because a constraint without a rationale gets questioned later."
capability_tags:
  - clarify-requirements
pattern_tags:
  - decision-trail
conditions_applies_when: A constraint is written down.
conditions_does_not_apply_when: The constraint is already recorded with its reason.
artifact_contract_output_type: constraint-list
artifact_contract_required_data:
  - each constraint
  - the reason it exists
artifact_contract_verified_by: every constraint carries the reason it exists
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives a generic Type/What/Why notation for any written constraint and says reasons prevent challenges; it does not identify a supported domain, so domain assignment would rely on missing context."
---

# Give every constraint its reason
- **[Type]**: [What] — [Why]
Include the "why" — constraints without rationale get questioned
<!-- vpmodule:atom:end give-every-constraint-its-reason -->
<!-- vpmodule:atom:begin name-the-one-thing-that-must-work -->
---
instruction_id: name-the-one-thing-that-must-work
title: Name the one thing that must work
summary: The single value that decides the prioritisation is written in one sentence.
capability_tags:
  - clarify-requirements
pattern_tags:
  - working-backwards
conditions_applies_when: The core value of a project is stated.
conditions_does_not_apply_when: The core value was already stated and has not changed.
artifact_contract_output_type: core-value-statement
artifact_contract_required_data:
  - the one thing that must work
artifact_contract_verified_by: the statement names the one thing that must work if everything else fails
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
---

# Name the one thing that must work
[The ONE thing that matters most. If everything else fails, this must work. One sentence that drives prioritization when tradeoffs arise.]
The single most important thing
Everything else can fail; this cannot
<!-- vpmodule:atom:end name-the-one-thing-that-must-work -->
<!-- vpmodule:atom:begin split-requirements-into-validated-active-and-out-of-scope -->
---
instruction_id: split-requirements-into-validated-active-and-out-of-scope
title: "Split the requirements into validated, active and out of scope"
summary: "The requirements are split by how far they have got, and the out-of-scope list carries the reason so it is not re-added."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The requirement set of a project is written or revised.
conditions_does_not_apply_when: The requirement set is unchanged.
artifact_contract_output_type: requirement-tiers
artifact_contract_required_data:
  - the validated requirements
  - the active requirements
  - the excluded ones with their reasons
artifact_contract_verified_by: each requirement sits in exactly one of the three tiers and the exclusions carry a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# Split the requirements into validated, active and out of scope
**Requirements — Validated:** - Requirements that shipped and proved valuable - Format: `- ✓ [Requirement] — [version/phase]` - These are locked — changing them requires explicit discussion
**Requirements — Active:** - Current scope being built toward - These are hypotheses until shipped and validated - Move to Validated when shipped, Out of Scope if invalidated
**Requirements — Out of Scope:** - Explicit boundaries on what we're not building - Always include reasoning (prevents re-adding later)
<!-- vpmodule:atom:end split-requirements-into-validated-active-and-out-of-scope -->
<!-- vpmodule:atom:begin track-the-outcome-of-a-decision-when-it-becomes-known -->
---
instruction_id: track-the-outcome-of-a-decision-when-it-becomes-known
title: Track the outcome of a decision when it becomes known
summary: "A recorded decision carries its outcome: proved correct, to be revisited, or too early to evaluate."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A decision is recorded and time passes.
conditions_does_not_apply_when: The decision has not been made yet.
artifact_contract_output_type: decision-outcome
artifact_contract_required_data:
  - the outcome of the decision
  - the state the outcome is in
artifact_contract_verified_by: the decision carries one of the three outcomes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Track the outcome of a decision when it becomes known
- Track outcome when known:
✓ Good — decision proved correct
⚠️ Revisit — decision may need reconsideration
— Pending — too early to evaluate
<!-- vpmodule:atom:end track-the-outcome-of-a-decision-when-it-becomes-known -->