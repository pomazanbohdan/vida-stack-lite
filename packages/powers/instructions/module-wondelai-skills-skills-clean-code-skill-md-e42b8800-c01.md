---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-clean-code-skill-md-e42b8800-c01"
title: "wondelai-skills: skills/clean-code/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/clean-code/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/clean-code/SKILL.md\"}"
atom_ids:
  - clean-code-comment-discipline
  - clean-code-common-mistakes
  - clean-code-diagnostic
  - clean-code-error-handling
  - clean-code-meaningful-names
  - clean-code-reader-first
  - clean-code-score-quality
  - clean-code-small-functions
atom_count: 8
atoms: "[{\"atom_id\":\"clean-code-comment-discipline\",\"file_sha256\":\"3dd15256f544fd8580e7b9b9e51f845adc5bb9c30271b522a2f2900404b475d3\",\"content_sha256\":\"23ba9aa08771c7be9943d2107fa27553a7eb8b1693fd1959a3a01ef5dc246921\",\"file_bytes\":1438,\"body_bytes\":349},{\"atom_id\":\"clean-code-common-mistakes\",\"file_sha256\":\"3f558d21358dc39addea8f3bec7269d55cd1882e9658981dffb3466d7212d6ce\",\"content_sha256\":\"f40f89008476aba189ba21d1c944dfb3503a5ba73ca3b288bfced7ea063a96ca\",\"file_bytes\":1370,\"body_bytes\":329},{\"atom_id\":\"clean-code-diagnostic\",\"file_sha256\":\"0d8eb359048245c0aa975a049740a92213e279e4bedaa373c550c0d24daa055a\",\"content_sha256\":\"be91ca24aad882eb7f220eb2673b8b0c910a827c4ec4308ce6cd2709fa8804b3\",\"file_bytes\":1312,\"body_bytes\":288},{\"atom_id\":\"clean-code-error-handling\",\"file_sha256\":\"6aad347e4b14928d0af068d180c68336c57135c91a91a5687c9aced22f8ac3be\",\"content_sha256\":\"0c4477aab8c3aea24348b3dc55585493aeebbabefe008c17b680ec6594cb9adc\",\"file_bytes\":1423,\"body_bytes\":345},{\"atom_id\":\"clean-code-meaningful-names\",\"file_sha256\":\"a546135b1d10ac5263802ec6505c84257740fc6b735b7d7a59e795ab733b1e76\",\"content_sha256\":\"0c80d239797b3755ee1f1b4f7df8c3e7199d7d012bd0b73cd035b1e64dfa4f68\",\"file_bytes\":1397,\"body_bytes\":334},{\"atom_id\":\"clean-code-reader-first\",\"file_sha256\":\"cf311dc233a55f39905e1b66902075f84c10f6b39e3a28f6515d15fe74080698\",\"content_sha256\":\"9ccee77585813c739d644a9895d53047554bdd8f35c5cf301c96a807e29858b4\",\"file_bytes\":1309,\"body_bytes\":212},{\"atom_id\":\"clean-code-score-quality\",\"file_sha256\":\"9d51dfd279a107a3fbfb128a69d209c5418f89b2d911fffdc36e1f01bb1fa081\",\"content_sha256\":\"ea686194d0726f37d30e4df345c55c5c1e86a49a9e6c474c1abc5fd7d4f86ce7\",\"file_bytes\":1271,\"body_bytes\":202},{\"atom_id\":\"clean-code-small-functions\",\"file_sha256\":\"614b477e848bbce6eba17efe9a957d7764e8764ed16a080356dd6f30c2ee7947\",\"content_sha256\":\"4aa6315e2f751bd300cbc3631df406c1f7e242fc14ece1c7fe3856b772f53c9c\",\"file_bytes\":1419,\"body_bytes\":321}]"
carrier_sha256: 5f94317e2ae7e3e2cf87ccf5328a78a9e2c05cd5aab44739efbe904fdfde0f30
carrier_bytes: 11804
revision: 1
status: active
---
<!-- vpmodule:atom:begin clean-code-comment-discipline -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-comment-discipline
title: "Use comments for why, not what"
summary: "Keep useful rationale, legal notices, TODOs and API documentation; delete stale comments and format for scanability."
capability_tags:
  - simplify-code
pattern_tags:
  - quality-bar-contract
conditions_applies_when: "Writing, reviewing or removing comments and formatting code."
conditions_does_not_apply_when: Generated or vendored code that must not be edited.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Comments explain intent or constraints rather than restating code.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L83-L106"
status: active
revision: 1
---

# Use comments for why, not what

Use comments to explain why, not what; prefer clear names and extracted functions. Keep only useful comments such as legal notices, TODOs, public API documentation and genuine rationale; remove commented-out code and journal comments. Format for scanability, group related concepts, and keep declarations near use.
<!-- vpmodule:atom:end clean-code-comment-discipline -->
<!-- vpmodule:atom:begin clean-code-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-common-mistakes
title: Avoid common clean-code mistakes
summary: "Use descriptive names, specific exceptions, error-path tests, measured optimization and tests before refactoring."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing code for common quality mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the issue.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the applied correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L181-L195"
status: active
revision: 1
---

# Avoid common clean-code mistakes

Avoid the listed mistakes by using descriptive names, readable steps, refactoring instead of explanatory comments, specific exception handling, error-path tests, measured optimization, single-responsibility classes, tests before refactoring, consistent conventions, and non-null alternatives.
<!-- vpmodule:atom:end clean-code-common-mistakes -->
<!-- vpmodule:atom:begin clean-code-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-diagnostic
title: Run the clean-code diagnostic
summary: Use the diagnostic questions to find gaps and apply the corresponding actions.
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of a codebase or change.
conditions_does_not_apply_when: A full audit or a scored review; use the score instruction.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report lists findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L196-L210"
status: active
revision: 1
---

# Run the clean-code diagnostic

Use the diagnostic questions to identify code-quality gaps and follow the corresponding actions, including renaming, extraction, removing commented-out code, separating error handling, testing public methods, and addressing duplication and magic numbers.
<!-- vpmodule:atom:end clean-code-diagnostic -->
<!-- vpmodule:atom:begin clean-code-error-handling -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-error-handling
title: Separate error handling from business logic
summary: "Prefer exceptions with context, avoid returning or passing null, and use explicit alternatives."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: "Designing or reviewing error paths, exceptions and null handling."
conditions_does_not_apply_when: An external error contract that cannot change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Error paths are explicit and business logic is not mixed with handling.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L107-L131"
status: active
revision: 1
---

# Separate error handling from business logic

Separate error handling from business logic; prefer exceptions to return codes, include contextual information, and avoid returning or passing null. Prefer unchecked exceptions, define exception types around caller needs, and use empty values, Optional, exceptions or a Null Object as appropriate.
<!-- vpmodule:atom:end clean-code-error-handling -->
<!-- vpmodule:atom:begin clean-code-meaningful-names -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-meaningful-names
title: Use meaningful names
summary: "Name by intent, avoid disinformation and encodings, and make names more descriptive as scope grows."
capability_tags:
  - simplify-code
pattern_tags:
  - structural-design
conditions_applies_when: "Naming modules, classes, functions, variables or tests."
conditions_does_not_apply_when: Names fixed by an external API or language convention that cannot change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: A reader can infer intent from the name without a comment.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L32-L56"
status: active
revision: 1
---

# Use meaningful names

Choose names that reveal intent and avoid disinformation; do not rely on comments to explain a name. Use consistent terminology, omit type encodings and prefixes, use single letters only for tiny-scope loop counters, name classes as nouns and methods as verbs, and use more descriptive names for wider scopes.
<!-- vpmodule:atom:end clean-code-meaningful-names -->
<!-- vpmodule:atom:begin clean-code-reader-first -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-reader-first
title: Optimize code for readers
summary: "Choose names, function boundaries and formatting for the reader, and leave code cleaner than found."
capability_tags:
  - simplify-code
pattern_tags:
  - quality-bar-contract
conditions_applies_when: "Writing, reviewing or refactoring code where readability and maintainability matter."
conditions_does_not_apply_when: Generated code or throwaway scripts that will not be maintained.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The change makes names, boundaries or formatting easier to follow."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L14-L17"
status: active
revision: 1
---

# Optimize code for readers

Optimize code for readers: use clear names, purposeful function boundaries and consistent formatting because code is read much more often than written; leave code cleaner than found.
<!-- vpmodule:atom:end clean-code-reader-first -->
<!-- vpmodule:atom:begin clean-code-score-quality -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-score-quality
title: Score code quality against the clean-code principles
summary: Give a 0-10 score and report the specific improvements needed to reach 10.
capability_tags:
  - review-code
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a codebase or change against the clean-code principles.
conditions_does_not_apply_when: No score or improvement report is requested.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - improvements
artifact_contract_verified_by: The report states the score and concrete improvements.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score code quality against the clean-code principles

When assessing code against the stated principles, give a 0–10 score and report the current score and specific improvements needed to reach 10.
<!-- vpmodule:atom:end clean-code-score-quality -->
<!-- vpmodule:atom:begin clean-code-small-functions -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-small-functions
title: Keep functions small and single-purpose
summary: "Keep one abstraction level, prefer zero to two arguments, avoid flag arguments and hidden side effects, and extract named steps."
capability_tags:
  - simplify-code
pattern_tags:
  - structural-design
conditions_applies_when: Writing or refactoring functions and methods.
conditions_does_not_apply_when: Generated code or callbacks whose signature is fixed by a framework.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each function has one purpose and a clear level of abstraction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L57-L82"
status: active
revision: 1
---

# Keep functions small and single-purpose

Keep functions small, single-purpose and at one abstraction level; prefer zero to two arguments and justify three or more. Avoid flag arguments and hidden side effects, separate state changes from returned queries, structure code top-down, and extract named steps where useful.
<!-- vpmodule:atom:end clean-code-small-functions -->