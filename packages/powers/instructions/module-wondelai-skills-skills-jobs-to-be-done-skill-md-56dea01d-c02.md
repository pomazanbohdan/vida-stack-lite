---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-jobs-to-be-done-skill-md-56dea01d-c02"
title: "wondelai-skills: skills/jobs-to-be-done/SKILL.md module"
summary: "Carrier for 3 atomic instructions from wondelai-skills:skills/jobs-to-be-done/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/jobs-to-be-done/SKILL.md\"}"
atom_ids:
  - jtbd-purchase-timeline
  - jtbd-score
  - jtbd-three-dimensions
atom_count: 3
atoms: "[{\"atom_id\":\"jtbd-purchase-timeline\",\"file_sha256\":\"279090068d3207c17573dbff1b4e2e56d83e8ac6e4fab2b7d5997b6abe013764\",\"content_sha256\":\"4f41270590d38c2951d3d336a345eb457a67cabfb117a2df118ef80dd1bdc9e8\",\"file_bytes\":1311,\"body_bytes\":205},{\"atom_id\":\"jtbd-score\",\"file_sha256\":\"36d3bc1037c59bfb1749db035b9d356aa8a795c2d97b99c72e0e659fc8781975\",\"content_sha256\":\"269d4409ebb6242d13775594b2bffbdef0177b3a6921c812c8cef65df5936a9b\",\"file_bytes\":1824,\"body_bytes\":691},{\"atom_id\":\"jtbd-three-dimensions\",\"file_sha256\":\"b5f653daeb436693e1bfb4fdad7db175745a509b6e2e800d3a6f3e44e7edc61e\",\"content_sha256\":\"a828ed0c0c6db856ab174e2b4ef4de995a6722a579eb2ca0e48ed63891656a6f\",\"file_bytes\":1237,\"body_bytes\":150}]"
carrier_sha256: 263e628f897b1e56891477958f859889f97ed411ef5f00e57f1edcf2235f96c0
carrier_bytes: 4651
revision: 1
status: active
---
<!-- vpmodule:atom:begin jtbd-purchase-timeline -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-purchase-timeline
title: Reconstruct the purchase timeline
summary: "Interview for the first thought, search, purchase and usage timeline rather than asking customers what they need."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Researching why a customer bought or adopted a product.
conditions_does_not_apply_when: A survey that collects opinions or predictions.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interview reconstructs specific past events across the purchase timeline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L143-L169"
status: active
revision: 1
---

# Reconstruct the purchase timeline

Don't ask customers "what do you need" -- they don't know. Instead, reconstruct the purchase timeline (first thought, search, purchase, usage) to uncover the real job.
<!-- vpmodule:atom:end jtbd-purchase-timeline -->
<!-- vpmodule:atom:begin jtbd-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-score
title: Score the job definition
summary: "Score the seven diagnostic rows plus depth for all three dimensions, product-free wording and non-consumption, and report the rows to fix."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a jobs-to-be-done analysis.
conditions_does_not_apply_when: A narrow feature review that does not assess the job.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: The report states the current score and the specific diagnostic rows to fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L23-L26"
status: active
revision: 1
---

# Score the job definition

Goal: 10/10. Score 1 point per satisfied row in the Quick Diagnostic (7 rows) plus up to 3 points for depth: +1 if all three job dimensions are evidenced, +1 if the job statement avoids any product/solution name, +1 if competition includes non-consumption. Bands: 9-10 = job stated without the product, all four forces mapped, three dimensions evidenced, non-obvious competition and Little Hire tracked; 5-6 = job named but one or two diagnostic rows fail (usually missing forces or emotional/social dimensions); <=3 = product-first framing, demographic segmentation, or Pull-only thinking. Always state the current score and the specific diagnostic rows to fix.
<!-- vpmodule:atom:end jtbd-score -->
<!-- vpmodule:atom:begin jtbd-three-dimensions -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-three-dimensions
title: "Cover functional, emotional and social dimensions"
summary: "Treat the functional, emotional and social dimensions of a job as inseparable and evidence all three."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - working-backwards
conditions_applies_when: Analyzing a customer job.
conditions_does_not_apply_when: A purely functional task with no emotional or social meaning.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The job analysis evidences functional, emotional and social dimensions."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L27-L36"
status: active
revision: 1
---

# Cover functional, emotional and social dimensions

Every job has inseparable functional, emotional, and social dimensions; omitting one is failure.
<!-- vpmodule:atom:end jtbd-three-dimensions -->