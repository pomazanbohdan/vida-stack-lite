---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-clean-code-skill-md-e42b8800-c02"
title: "wondelai-skills: skills/clean-code/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/clean-code/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/clean-code/SKILL.md\"}"
atom_ids:
  - clean-code-smell-refactoring
  - clean-code-tests-first-class
atom_count: 2
atoms: "[{\"atom_id\":\"clean-code-smell-refactoring\",\"file_sha256\":\"b9d70cca36408ae9ec9e258c368edbfcfd8ffe254413197e096b8be79cec2cc9\",\"content_sha256\":\"00714259971c081e0bdb3e8b00cfa7ce1cde138872cf74149739d4bf20c7ea7b\",\"file_bytes\":1389,\"body_bytes\":271},{\"atom_id\":\"clean-code-tests-first-class\",\"file_sha256\":\"ee7c974f9f272f5eb708ac63a4b55dbc883ad3e9ce2f99c464590617f24b2c05\",\"content_sha256\":\"158890507e96e409910b94cabf5eb31580028a803508900059de72c9d07c2fde\",\"file_bytes\":1384,\"body_bytes\":280}]"
carrier_sha256: af374b5f497fddc341a4ad555cdaefeb00fd35771a2ffa068f94e4b08bef13b7
carrier_bytes: 3000
revision: 1
status: active
---
<!-- vpmodule:atom:begin clean-code-smell-refactoring -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-smell-refactoring
title: Use code smells as refactoring clues
summary: "Treat smells as clues, refactor in small tested steps and do not combine refactoring with feature work."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Refactoring code with test coverage and identifiable smells.
conditions_does_not_apply_when: "Feature work, or refactoring without tests; use the legacy-code instruction."
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each refactoring step preserves behavior and keeps tests green.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L156-L180"
status: active
revision: 1
---

# Use code smells as refactoring clues

Treat code smells as clues to design problems and use targeted refactoring. Address function, general and test smells; refactor in small tested steps and do not combine refactoring with feature work; leave code cleaner than found.
<!-- vpmodule:atom:end clean-code-smell-refactoring -->
<!-- vpmodule:atom:begin clean-code-tests-first-class -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-tests-first-class
title: Treat tests as first-class code
summary: "Follow TDD, test one concept per test, keep tests fast and independent, and refactor test code."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: Writing or reviewing tests and production code under TDD.
conditions_does_not_apply_when: Characterization tests that only pin legacy behavior; use the legacy-code instruction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Tests are readable, isolated and refactored with production code."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L132-L155"
status: active
revision: 1
---

# Treat tests as first-class code

Treat tests as first-class code and keep them clean. Follow the three TDD laws, test one concept per test, keep tests fast, independent, repeatable, self-validating and timely, use readable test helpers, and refactor tests with production code.
<!-- vpmodule:atom:end clean-code-tests-first-class -->