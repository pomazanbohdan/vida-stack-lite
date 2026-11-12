---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-jobs-to-be-done-skill-md-56dea01d-c01"
title: "wondelai-skills: skills/jobs-to-be-done/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/jobs-to-be-done/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/jobs-to-be-done/SKILL.md\"}"
atom_ids:
  - jtbd-big-and-little-hire
  - jtbd-common-mistakes
  - jtbd-competitive-landscape
  - jtbd-design-for-the-job
  - jtbd-diagnostic
  - jtbd-four-forces
  - jtbd-job-as-progress
  - jtbd-job-statement
atom_count: 8
atoms: "[{\"atom_id\":\"jtbd-big-and-little-hire\",\"file_sha256\":\"6b12bfcd1d611f635b422be553844c4b6519e916d5d805e0ee2973a4aa6c779f\",\"content_sha256\":\"05649e507fde0c3f7169541fe47f00d0dcf549f693ad0b2ff990355cce66c96a\",\"file_bytes\":1365,\"body_bytes\":250},{\"atom_id\":\"jtbd-common-mistakes\",\"file_sha256\":\"275f20b055dff369e51f9c6c6f314e73e0aacdc85418c44fde3f9e346ebe7055\",\"content_sha256\":\"02ea9ba98e8b7c5719f94cceeac6f896775dddb6b27c74eef083864c44f2722a\",\"file_bytes\":1532,\"body_bytes\":348},{\"atom_id\":\"jtbd-competitive-landscape\",\"file_sha256\":\"049bab068c091b8817427f4f857c1753f5e6406f092aaeb463547d7a5c4124d3\",\"content_sha256\":\"8b73494c69c987c5a5c35fdb236483e3c2c747ec0e4cf68cd2437dd0c5a7826a\",\"file_bytes\":1325,\"body_bytes\":213},{\"atom_id\":\"jtbd-design-for-the-job\",\"file_sha256\":\"44087c4fbefc39a29c339d4516e2389140565c767e02f7fcfd2ffcb770913fd1\",\"content_sha256\":\"c7acaf3307832855f9546970206f3eb652a711abd79268cfe69207587885df21\",\"file_bytes\":1339,\"body_bytes\":211},{\"atom_id\":\"jtbd-diagnostic\",\"file_sha256\":\"1fa6bd87daed2fb417d9857badc8c3bf89070bca6ac77121c3c19ed0722c3973\",\"content_sha256\":\"48d9ef5840c6f639feed8a1806d69869cc8e77e400fa90f0b5ed353a43866f15\",\"file_bytes\":1457,\"body_bytes\":286},{\"atom_id\":\"jtbd-four-forces\",\"file_sha256\":\"b921cbb0ffbfd8ecdcea3280de7ef665900a4871804433eae1851b64da9eceac\",\"content_sha256\":\"076e4176bfc321d15c32cc7eaedb4fb1c31f8fc8514fcf06b9f77d6f1aba8f0e\",\"file_bytes\":1403,\"body_bytes\":314},{\"atom_id\":\"jtbd-job-as-progress\",\"file_sha256\":\"a56192dfceb94b3309f7559b7282529ff8a152d5ca39efbfe82e8e010ca3d6da\",\"content_sha256\":\"fe91f1025fde02ca103e080d8149a8138e15f7986007444cc561ed7db02d9e84\",\"file_bytes\":1320,\"body_bytes\":181},{\"atom_id\":\"jtbd-job-statement\",\"file_sha256\":\"1c4925a758aeabcf69ff02f5fdc4ffb03354ee5090c4a7826347fd0f80c4ea41\",\"content_sha256\":\"94679b085efe888a67a68669ed3ced01270694059681468f423cf3adb084daf4\",\"file_bytes\":1319,\"body_bytes\":202}]"
carrier_sha256: 4019a899f64781d71e91bad67604999432fac73fa99793903029060f97067cb7
carrier_bytes: 11847
revision: 1
status: active
---
<!-- vpmodule:atom:begin jtbd-big-and-little-hire -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-big-and-little-hire
title: Measure the Big Hire and the Little Hire
summary: "Distinguish the one-time purchase decision from the repeated decision to use, and measure both."
capability_tags:
  - design-experiments
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Choosing product metrics for acquisition and ongoing use.
conditions_does_not_apply_when: A one-off transaction with no repeated use decision.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - big_hire
  - little_hire
artifact_contract_verified_by: The design measures purchase and repeated use as separate decisions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L92-L117"
status: active
revision: 1
---

# Measure the Big Hire and the Little Hire

Two distinct decision moments: the Big Hire (purchase/signup, happens once) and the Little Hire (decision to use in the moment, happens repeatedly). Winning the Big Hire does not guarantee the Little Hire.
<!-- vpmodule:atom:end jtbd-big-and-little-hire -->
<!-- vpmodule:atom:begin jtbd-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-common-mistakes
title: Avoid common jobs-to-be-done mistakes
summary: "Avoid product-defined jobs, missing emotional or social dimensions, jobs confused with goals, Pull-only thinking, ignored Little Hire, hypothetical interviews and category-only competition."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Reviewing a jobs-to-be-done analysis for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the customer-framed correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L196-L207"
status: active
revision: 1
---

# Avoid common jobs-to-be-done mistakes

Avoid product-defined jobs, omission of emotional/social dimensions, confusing jobs with goals/tasks, focusing only on Pull, ignoring Little Hire, hypothetical interviews, and category-only competition; use customer-framed jobs, all forces and dimensions, timeline interviews, and full alternative mapping.
<!-- vpmodule:atom:end jtbd-common-mistakes -->
<!-- vpmodule:atom:begin jtbd-competitive-landscape -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-competitive-landscape
title: Map competition by the job
summary: "Treat everything a customer can hire for the same job, including non-consumption, as competition regardless of industry category."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - working-backwards
conditions_applies_when: Defining competitors or alternatives for a product.
conditions_does_not_apply_when: A market defined only by industry classification.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The competitive map includes non-obvious alternatives and non-consumption.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L118-L142"
status: active
revision: 1
---

# Map competition by the job

True competition is everything a customer can "hire" for the same job, often from completely different categories. Competitors are defined by the job, not by industry classification.
<!-- vpmodule:atom:end jtbd-competitive-landscape -->
<!-- vpmodule:atom:begin jtbd-design-for-the-job -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-design-for-the-job
title: Design the whole experience for the job
summary: "Align features, metrics and organization around helping the customer accomplish the job rather than internal capabilities or feature parity."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Designing a product experience or operating model around a customer job.
conditions_does_not_apply_when: A component change with no customer-job effect.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Features, metrics and organization trace to the customer job."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L170-L195"
status: active
revision: 1
---

# Design the whole experience for the job

Build the entire experience -- features, metrics, organization -- around helping the customer accomplish their job, not around internal capabilities or feature parity.
<!-- vpmodule:atom:end jtbd-design-for-the-job -->
<!-- vpmodule:atom:begin jtbd-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-diagnostic
title: Run the jobs-to-be-done diagnostic
summary: "Check product-free wording, all four forces, emotional and social dimensions, non-obvious competition, Big and Little Hire measures, feature traceability and timeline interviews."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A quick diagnostic review of a jobs-to-be-done analysis.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L208-L221"
status: active
revision: 1
---

# Run the jobs-to-be-done diagnostic

Check product-free job statement, all four forces, emotional/social dimensions, non-obvious competition, separate Big/Little Hire measures, feature-to-job trace, and purchase-timeline interviews; use the listed follow-up action when a check fails.
<!-- vpmodule:atom:end jtbd-diagnostic -->
<!-- vpmodule:atom:begin jtbd-four-forces -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-four-forces
title: Map the four forces of progress
summary: "Explain change through Push, Pull, Anxiety and Habit, and test whether Push plus Pull exceeds Habit plus Anxiety."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - working-backwards
conditions_applies_when: Explaining why a customer changes behavior or adopts a product.
conditions_does_not_apply_when: A decision with no meaningful switching behavior.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: All four forces are mapped and the change condition is stated.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L66-L91"
status: active
revision: 1
---

# Map the four forces of progress

The decision to "hire" a new product results from four forces: Push (frustration with the current situation), Pull (attraction of the new solution), Anxiety (fear of the new), and Habit (comfort with the current behavior). Change happens only when Push + Pull > Habit + Anxiety.
<!-- vpmodule:atom:end jtbd-four-forces -->
<!-- vpmodule:atom:begin jtbd-job-as-progress -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-job-as-progress
title: Define the job as progress in context
summary: "Frame a job as the progress a customer seeks in particular circumstances, where context rather than demographics determines the choice."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - working-backwards
conditions_applies_when: Defining a customer job or segmenting a market.
conditions_does_not_apply_when: A demographic segment with no specific progress or circumstance.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The job names the progress and circumstance rather than a product or demographic.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L14-L22"
status: active
revision: 1
---

# Define the job as progress in context

Define a job as progress sought in particular circumstances; context, not demographics, determines it, and hiring is active product choice.
<!-- vpmodule:atom:end jtbd-job-as-progress -->
<!-- vpmodule:atom:begin jtbd-job-statement -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-job-statement
title: Write a structured job statement
summary: "Separate the context, desired progress and expected outcome in a job statement."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: Documenting a customer job for product decisions.
conditions_does_not_apply_when: A solution description that names the product instead of the job.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - context
  - progress
  - outcome
artifact_contract_verified_by: "The statement separates context, progress and outcome without naming a product."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L39-L65"
status: active
revision: 1
---

# Write a structured job statement

A job statement captures the progress a customer seeks in a specific circumstance, in a structured format separating context, desired progress, and expected outcome.
<!-- vpmodule:atom:end jtbd-job-statement -->