---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-eval-planner-compact-md-4478f624-c01"
title: "gsd-core: agents/gsd-eval-planner.compact.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:agents/gsd-eval-planner.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-eval-planner.compact.md\"}"
atom_ids:
  - classify-each-guardrail-as-online-or-offline
  - detect-the-existing-tooling-before-you-default
  - write-the-rubric-from-the-domain-ingredients-not-from-generic-dimensions
atom_count: 3
atoms: "[{\"atom_id\":\"classify-each-guardrail-as-online-or-offline\",\"file_sha256\":\"09e819113a4a08350a044247023caa52a49bed7b544e58bcc6c3dbc209257e1e\",\"content_sha256\":\"2a499cf69c812d1dfae4da3262091b4d9eaee69059864fa8eb515ea3d91fa3e1\",\"file_bytes\":1407,\"body_bytes\":253},{\"atom_id\":\"detect-the-existing-tooling-before-you-default\",\"file_sha256\":\"b964bd26d3281b97d1aaf6bdc26076e52561b3da2035df20860139d41123f0e9\",\"content_sha256\":\"caa999e31c888a9eb367121665e6d3d768c695eeef3316882df069ceeb52205b\",\"file_bytes\":1412,\"body_bytes\":202},{\"atom_id\":\"write-the-rubric-from-the-domain-ingredients-not-from-generic-dimensions\",\"file_sha256\":\"9175a0cb534ed94c2a4936c81b663d599e4f88d44f6a19f8ee4c7dd8cdd554a0\",\"content_sha256\":\"04a601aa790d59c8921340db1160e5ac93b34f6c3dfa8897d3b1e8f674e471a7\",\"file_bytes\":1643,\"body_bytes\":415}]"
carrier_sha256: 0d29644354fec94e73bd0cb296225a8eb3ca912b1f71de59b9f38544cfdd1212
carrier_bytes: 4959
revision: 1
status: active
---
<!-- vpmodule:atom:begin classify-each-guardrail-as-online-or-offline -->
---
instruction_id: classify-each-guardrail-as-online-or-offline
title: Classify each guardrail as online or offline
summary: "A catastrophic guardrail runs on every request; a quality signal is sampled in a batch, and the set stays small because each one costs latency."
capability_tags:
  - define-quality-bar
pattern_tags:
  - control-tiering
conditions_applies_when: Guardrails are defined for a system.
conditions_does_not_apply_when: The system has no guardrails.
artifact_contract_output_type: guardrail-set
artifact_contract_required_data:
  - the online guardrails
  - the offline signals
artifact_contract_verified_by: every guardrail is classified and the number of guardrails is minimal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-eval-planner.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-eval-planner.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Classify each guardrail as online or offline
Online guardrail (catastrophic) → runs on every request, real-time, must be fast
Offline flywheel (quality signal) → sampled batch, feeds improvement loop
Keep guardrails minimal — each adds latency.
<!-- vpmodule:atom:end classify-each-guardrail-as-online-or-offline -->
<!-- vpmodule:atom:begin detect-the-existing-tooling-before-you-default -->
---
instruction_id: detect-the-existing-tooling-before-you-default
title: Detect the existing tooling before you default
summary: What the project already uses is found first and kept; the opinionated default is only the fallback.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - project-conventions-first
conditions_applies_when: A tool has to be chosen for a task.
conditions_does_not_apply_when: The task names the tool.
artifact_contract_output_type: tooling-decision
artifact_contract_required_data:
  - the detected tooling
  - the choice
artifact_contract_verified_by: the existing tooling was checked and the choice follows from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-eval-planner.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-eval-planner.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body says to find existing tools before applying defaults but does not name the task subject, so no listed domain is supported."
---

# Detect the existing tooling before you default
Detect first — scan for existing tools before defaulting:
If detected: use it as the tracing default.
If nothing detected, apply opinionated defaults:
<!-- vpmodule:atom:end detect-the-existing-tooling-before-you-default -->
<!-- vpmodule:atom:begin write-the-rubric-from-the-domain-ingredients-not-from-generic-dimensions -->
---
instruction_id: write-the-rubric-from-the-domain-ingredients-not-from-generic-dimensions
title: "Write the rubric from the domain ingredients, not from generic dimensions"
summary: The evaluation criteria start from what the domain experts wrote and only fall back to generic dimensions when those are thin.
capability_tags:
  - define-quality-bar
pattern_tags:
  - testable-criteria
conditions_applies_when: Evaluation criteria are written for a system.
conditions_does_not_apply_when: No domain criteria were produced upstream.
artifact_contract_output_type: rubric
artifact_contract_required_data:
  - the pass criterion
  - the fail criterion
  - the measurement approach
artifact_contract_verified_by: "every dimension carries a pass, a fail and a measurement approach"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-eval-planner.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-eval-planner.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Write the rubric from the domain ingredients, not from generic dimensions
Start from domain rubric ingredients in Section 1b — these are your rubric starting points, not generic dimensions.
PASS: {specific acceptable behavior in domain language}
FAIL: {specific unacceptable behavior in domain language}
Measurement: Code / LLM Judge / Human
Each dimension has a measurement approach (Code / LLM Judge / Human)
<!-- vpmodule:atom:end write-the-rubric-from-the-domain-ingredients-not-from-generic-dimensions -->