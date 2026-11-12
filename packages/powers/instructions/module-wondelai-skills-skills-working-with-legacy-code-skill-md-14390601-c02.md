---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-working-with-legacy-code-skill-md-14390601-c02"
title: "wondelai-skills: skills/working-with-legacy-code/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/working-with-legacy-code/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/working-with-legacy-code/SKILL.md\"}"
atom_ids:
  - legacy-code-treat-as-untested
  - legacy-code-understand-and-untangle
atom_count: 2
atoms: "[{\"atom_id\":\"legacy-code-treat-as-untested\",\"file_sha256\":\"1c643e6bca0acf59fccbda54bc9e6f90b9c1b4ad022a438853cf73f905ae1a8b\",\"content_sha256\":\"c244d3d00c5b150d6c9026323df0f1472ac2e50dffed3a3213c566b93a6fc070\",\"file_bytes\":1437,\"body_bytes\":254},{\"atom_id\":\"legacy-code-understand-and-untangle\",\"file_sha256\":\"6e636303ed7373e8420d8ed70a2f7eb42028b921fe4aa5fa3f981231feea70ee\",\"content_sha256\":\"2c6e056b903dcf623572a133234c784361a08b7c384022422f29c14c7534cdcf\",\"file_bytes\":1736,\"body_bytes\":512}]"
carrier_sha256: a3667c220da6aee682626eaf5ff3b680939d19f94d0f07f6e88b6998f1445a8c
carrier_bytes: 3416
revision: 1
status: active
---
<!-- vpmodule:atom:begin legacy-code-treat-as-untested -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-treat-as-untested
title: Treat legacy code as code without tests
summary: "Break dependencies only enough to establish tests, then cover and modify rather than editing without feedback."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Changing code that has no reliable tests, regardless of its age."
conditions_does_not_apply_when: Code with a trustworthy test suite that already covers the change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The change starts from tests that cover the modified behavior, or the dependency work needed to add them."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L14-L17"
status: active
revision: 1
---

# Treat legacy code as code without tests

Treat legacy code as code without tests, regardless of age or appearance. Before changing it, break dependencies only as much as needed to establish tests; cover and modify rather than editing without feedback.
<!-- vpmodule:atom:end legacy-code-treat-as-untested -->
<!-- vpmodule:atom:begin legacy-code-understand-and-untangle -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-understand-and-untangle
title: Understand unfamiliar code before changing it
summary: "Use effect and feature sketches, reverted scratch refactoring and a plain-language story to find pinch points, golden masters and natural boundaries."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: Changing unfamiliar or tangled code.
conditions_does_not_apply_when: A local change in code whose behavior is already understood and covered.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Tests sit at a pinch point that covers upstream effects, and understanding artifacts are not left as production changes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L147-L170"
status: active
revision: 1
---

# Understand unfamiliar code before changing it

Before changing unfamiliar code, use effect sketches, feature sketches, scratch refactoring that is later reverted, and a plain-language system story to find pinch points for tests. Test at a pinch point where it covers upstream effects; use golden-master testing and a method object for monster methods, and extract god-class features along natural boundaries. When time is limited, sprout or wrap a spot changed once and add tests when that spot changes again.
<!-- vpmodule:atom:end legacy-code-understand-and-untangle -->