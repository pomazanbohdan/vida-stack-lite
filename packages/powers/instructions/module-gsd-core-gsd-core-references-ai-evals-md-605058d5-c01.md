---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-ai-evals-md-605058d5-c01"
title: "gsd-core: gsd-core/references/ai-evals.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/ai-evals.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/ai-evals.md\"}"
atom_ids:
  - choose-the-guardrail-or-the-flywheel
  - start-the-reference-set-with-ten-to-twenty-good-examples
  - write-a-rubric-before-you-trust-a-judge
atom_count: 3
atoms: "[{\"atom_id\":\"choose-the-guardrail-or-the-flywheel\",\"file_sha256\":\"832391b6b5087f5bf45cfeee640dde281f9ca4620449f059a6528013a20eb6aa\",\"content_sha256\":\"ca03da165d1a797e143b1224ce3c0af6d5123336fb74c417f4d667cbbdaa3c56\",\"file_bytes\":1438,\"body_bytes\":345},{\"atom_id\":\"start-the-reference-set-with-ten-to-twenty-good-examples\",\"file_sha256\":\"28ab731991c17ed5b52fb187a59e5eacfbb4141a418d0f18620a6f94f8eb5885\",\"content_sha256\":\"7ce8a39efa618c67a4fc0074f2bb53c296277d40c9a394400a9f7b69a44a5757\",\"file_bytes\":1508,\"body_bytes\":383},{\"atom_id\":\"write-a-rubric-before-you-trust-a-judge\",\"file_sha256\":\"af3cc301e82c9ef39fd8dfd5b20cb66e8cae896138aaa245b8afd87db0576d5e\",\"content_sha256\":\"1e60c9d478bf9743c200fae95ffce185c3c245370993d051c62bddb013551224\",\"file_bytes\":1583,\"body_bytes\":466}]"
carrier_sha256: e304dbc35cd3a105191f94821c300e53b621268e58f18fa03061f8da819c257f
carrier_bytes: 4964
revision: 1
status: active
---
<!-- vpmodule:atom:begin choose-the-guardrail-or-the-flywheel -->
---
instruction_id: choose-the-guardrail-or-the-flywheel
title: Choose the guardrail or the flywheel
summary: A behaviour whose failure would be catastrophic is guarded online and immediately; the rest is measured offline in batches.
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A behaviour is monitored in a running system.
conditions_does_not_apply_when: The behaviour is verified before release only.
artifact_contract_output_type: monitoring-mode
artifact_contract_required_data:
  - the question that decided the mode
  - the mode
  - what the mode does when the behaviour breaks
artifact_contract_verified_by: the mode follows from the stated consequence of the failure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/ai-evals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - business
  - operations
---

# Choose the guardrail or the flywheel
Ask: "If this behavior goes wrong, would it be catastrophic for my business?"
Yes → Guardrail — run online, real-time, with immediate intervention (block, escalate, hand off). Be selective: guardrails add latency.
No → Flywheel — run offline as batch analysis feeding system refinements over time.
<!-- vpmodule:atom:end choose-the-guardrail-or-the-flywheel -->
<!-- vpmodule:atom:begin start-the-reference-set-with-ten-to-twenty-good-examples -->
---
instruction_id: start-the-reference-set-with-ten-to-twenty-good-examples
title: Start the reference set with ten to twenty good examples
summary: "The first reference set is small and labelled by domain experts, and it grows from what production shows rather than from imagined coverage."
capability_tags:
  - build-verification-harness
pattern_tags:
  - test-design
conditions_applies_when: A reference set for a behaviour is built.
conditions_does_not_apply_when: The reference set exists and grows from production.
artifact_contract_output_type: reference-set
artifact_contract_required_data:
  - the number of examples
  - who labelled them
  - the cases they cover
  - the growth source
artifact_contract_verified_by: "the set is small, expert-labelled and grew from observed failures"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/ai-evals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Start the reference set with ten to twenty good examples
Start with **10-20 high-quality examples** — not 200 mediocre ones
Have domain experts label the examples (not just engineers)
Expand based on what you learn in production — don't build for hypothetical coverage
Building comprehensive coverage on day one — start small (10-20 examples), expand from real failure modes
<!-- vpmodule:atom:end start-the-reference-set-with-ten-to-twenty-good-examples -->
<!-- vpmodule:atom:begin write-a-rubric-before-you-trust-a-judge -->
---
instruction_id: write-a-rubric-before-you-trust-a-judge
title: Write a rubric before you trust a judge
summary: "A rubric names the dimension, the scores and the domain examples; a judge that was never calibrated against human judgement produces noise."
capability_tags:
  - define-quality-bar
pattern_tags:
  - quality-bar-contract
conditions_applies_when: "A model, or a person, judges the quality of an output."
conditions_does_not_apply_when: The judgement is a deterministic check.
artifact_contract_output_type: rubric
artifact_contract_required_data:
  - the dimension
  - the scores and what they mean
  - the domain examples
  - the calibration against human judgement
artifact_contract_verified_by: the rubric is complete and the judge was calibrated before it was trusted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/ai-evals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Write a rubric before you trust a judge
A rubric must define:
The dimension being measured
What scores 1, 3, and 5 on a 5-point scale (or pass/fail criteria)
Domain-specific examples of acceptable vs. unacceptable behavior
Without rubrics, LLM judges produce noise rather than signal.
Trusting uncalibrated LLM judges — validate against human judgment before relying on them
Calibrate LLM judges against human scores (target ≥ 0.7 correlation before trusting)
<!-- vpmodule:atom:end write-a-rubric-before-you-trust-a-judge -->