---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-refactoring-patterns-skill-md-80f7a952-c01"
title: "wondelai-skills: skills/refactoring-patterns/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/refactoring-patterns/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/refactoring-patterns/SKILL.md\"}"
atom_ids:
  - refactoring-common-mistakes
  - refactoring-compose-methods
  - refactoring-diagnostic
  - refactoring-map-smells
  - refactoring-move-features
  - refactoring-organize-data
  - refactoring-safe-workflow
  - refactoring-score-structure
atom_count: 8
atoms: "[{\"atom_id\":\"refactoring-common-mistakes\",\"file_sha256\":\"a31f981ae2d0922ba375f7ab0a52362d9e5f3dc64d5be26934f424bd4a3ceb79\",\"content_sha256\":\"6e5394c516b69db134549432a9ecf2fc3b9b307944d697f9a1d51d2200c2ab60\",\"file_bytes\":1453,\"body_bytes\":309},{\"atom_id\":\"refactoring-compose-methods\",\"file_sha256\":\"6356d3199dd0547caefd0159894d4744df340453bbe38b4f4496ae7abed794da\",\"content_sha256\":\"f56bd95fd5cb3572fb64c6f490cf9e15ecf626058c2a81b98b8deb3d54995c6a\",\"file_bytes\":1481,\"body_bytes\":330},{\"atom_id\":\"refactoring-diagnostic\",\"file_sha256\":\"b8ce7e6351a558514578ac9f7eb81af6ecc98f0640046f200ccea5800e0414fb\",\"content_sha256\":\"901c485668af585a820c4f274b5574b620e43cb23c6d9723129f3578fe297050\",\"file_bytes\":1400,\"body_bytes\":273},{\"atom_id\":\"refactoring-map-smells\",\"file_sha256\":\"8a2dd2c98423491316a143c7465a3dd1a2cc151807f2b54e36d388fdf0e0ab2f\",\"content_sha256\":\"c229c3280101aaa75106b4768a3436ec1325d4e7716570b197a67044f07e7d54\",\"file_bytes\":1398,\"body_bytes\":302},{\"atom_id\":\"refactoring-move-features\",\"file_sha256\":\"62e9436cf65015ce13d7bcd83a60cadb3f942861815bc9a91aa5eec0b376c56e\",\"content_sha256\":\"083c52b2c5ad06ccc2d3181ac83fd94ac88f9b8193c67ace90f2ce2e72bcdca7\",\"file_bytes\":1501,\"body_bytes\":315},{\"atom_id\":\"refactoring-organize-data\",\"file_sha256\":\"e5c24eb7f03dd4ed472a0b142d8b927a709266257fc486ffa7fed5cbbe34d815\",\"content_sha256\":\"2eaf047b3f880aabe9fbcfed788b2165ca524a7de43dfd3a6bf6d2ec24292098\",\"file_bytes\":1530,\"body_bytes\":309},{\"atom_id\":\"refactoring-safe-workflow\",\"file_sha256\":\"4ce903fa15de9e13867117a373eadd9fcfbc93a223999a01b70d368a897a19e4\",\"content_sha256\":\"8f874e3349290fc92213bb795c80c978934d616c709e820f6922f8be6af1f823\",\"file_bytes\":1707,\"body_bytes\":510},{\"atom_id\":\"refactoring-score-structure\",\"file_sha256\":\"3b3fdb635147521ba939b4b518fb959c9e8172bf092fbad40e48e9a8d30a7768\",\"content_sha256\":\"14902f6e3d56b6682ebfe02e48e727ee927f9190387778dd71f3bd81e4a528ae\",\"file_bytes\":1549,\"body_bytes\":335}]"
carrier_sha256: fcd70572067f4ee1958453dd0e246d93f6c85d4d2b36798b427f527b9e3a11a1
carrier_bytes: 12882
revision: 1
status: active
---
<!-- vpmodule:atom:begin refactoring-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-common-mistakes
title: Avoid common refactoring mistakes
summary: "Avoid refactoring without tests, big-bang rewrites, mixed feature work, stale caller references, unclear micro-methods, ignored smells, doomed polish and optimization during refactoring."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a refactoring for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the corrective practice.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L176-L188"
status: active
revision: 1
---

# Avoid common refactoring mistakes

Avoid refactoring without tests, big-bang rewrites, mixing refactoring with feature work, stale caller references after renames, unclear micro-methods, ignoring smells, polishing doomed code, and optimizing during refactoring; use the table's stated corrective practices.
<!-- vpmodule:atom:end refactoring-common-mistakes -->
<!-- vpmodule:atom:begin refactoring-compose-methods -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-compose-methods
title: Compose methods into intention-revealing steps
summary: "Extract meaningful blocks, inline needless indirection and split temporaries or method objects when the code calls for it."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: "A method is too long, unclear or carries temporary state."
conditions_does_not_apply_when: A method that is already small and intention-revealing.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The resulting methods reveal intention and remove indirection that added no value.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L57-L80"
status: active
revision: 1
---

# Compose methods into intention-revealing steps

Compose methods into smaller, intention-revealing steps. Prefer Extract Method for meaningful blocks; inline methods or variables when indirection adds no value or a temporary is used once; use query, split-temporary, or method-object transformations under the stated conditions.
<!-- vpmodule:atom:end refactoring-compose-methods -->
<!-- vpmodule:atom:begin refactoring-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-diagnostic
title: Run the refactoring diagnostic
summary: "Check test status, smell identification, method and class responsibilities, duplication, conditional polymorphism, per-step commits and readability."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review before or after refactoring.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L189-L201"
status: active
revision: 1
---

# Run the refactoring diagnostic

Use the eight diagnostic questions to check test status, smell identification, method and class responsibilities, duplication, conditional polymorphism, per-step commits, and readability; apply the corresponding action when a check fails.
<!-- vpmodule:atom:end refactoring-diagnostic -->
<!-- vpmodule:atom:begin refactoring-map-smells -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-map-smells
title: Map code smells to named refactorings
summary: Use the five smell families as structural signals and map each smell to a candidate named refactoring.
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Identifying structural problems before choosing a refactoring.
conditions_does_not_apply_when: A bug diagnosis with no structural signal.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The selected refactoring addresses the named smell rather than a symptom.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L33-L56"
status: active
revision: 1
---

# Map code smells to named refactorings

Use code smells as signals of structural problems and map them to named refactorings. The section identifies five smell families and gives examples mapping long methods, scattered changes, repeated parameters, and duplicated logic to candidate transformations.
<!-- vpmodule:atom:end refactoring-map-smells -->
<!-- vpmodule:atom:begin refactoring-move-features -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-move-features
title: Move features to the object that owns the data
summary: "Move methods or fields toward their data, balance extract versus inline class, and resolve delegate or middle-man tradeoffs case by case."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: "A method or field belongs with another object's data or behavior."
conditions_does_not_apply_when: A deliberate boundary fixed by an external contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The moved feature sits with the data and behavior it depends on, without unnecessary delegation."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L81-L103"
status: active
revision: 1
---

# Move features to the object that owns the data

Move a method or field when it belongs with another object's data or behavior; extract or inline classes according to responsibility balance. Hide delegates for unstable chains and remove a middle man when it only forwards calls; resolve the tradeoff case by case.
<!-- vpmodule:atom:end refactoring-move-features -->
<!-- vpmodule:atom:begin refactoring-organize-data -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-organize-data
title: Replace primitives and exposed data with named values
summary: "Encapsulate mutable data, use subclasses or Strategy for behavior-affecting type codes, and convert value to reference only when shared identity is required."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: "Raw primitives, exposed mutable data or type codes carry domain meaning."
conditions_does_not_apply_when: A value whose primitive form is fixed by an external format.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The named value or encapsulated behavior expresses the domain rule and preserves behavior.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L104-L127"
status: active
revision: 1
---

# Replace primitives and exposed data with named values

Replace raw primitives or exposed mutable data with named values and encapsulated behavior. Use subclasses for behavior-affecting type codes, Strategy when subclassing is impractical, and value-to-reference conversion when shared identity is required.
<!-- vpmodule:atom:end refactoring-organize-data -->
<!-- vpmodule:atom:begin refactoring-safe-workflow -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-safe-workflow
title: Follow the safe refactoring workflow
summary: "Run tests green, make one small transformation, rerun tests and commit; revert a red step, and use Branch by Abstraction or Parallel Change for large changes."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Performing a refactoring in production code.
conditions_does_not_apply_when: A throwaway prototype or code that will be deleted.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each small step has a green test result and a commit, and a red step is reverted rather than debugged in place."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L152-L175"
status: active
revision: 1
---

# Follow the safe refactoring workflow

For safe refactoring, run tests green, make one small structural transformation, rerun tests, and commit; if tests turn red, revert rather than debug a broken refactoring. Apply the Rule of Three, preparatory and comprehension refactoring as described; do not refactor when rewriting is easier, tests cannot feasibly be added, or deletion is near. Optimize only after clarity and profiling, and use Branch by Abstraction or Parallel Change for large production changes.
<!-- vpmodule:atom:end refactoring-safe-workflow -->
<!-- vpmodule:atom:begin refactoring-score-structure -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-score-structure
title: Score structural quality against the refactoring diagnostic
summary: "Score the eight diagnostic rows, lower the score for a severe smell, and report the score, smells and specific refactorings needed."
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing structural quality before or after refactoring.
conditions_does_not_apply_when: A narrow behavior review that does not assess structure.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - smells
  - refactorings
artifact_contract_verified_by: "The report states the score, the smells lowering it and the refactorings needed for 10/10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L20-L28"
status: active
revision: 1
---

# Score structural quality against the refactoring diagnostic

Score structural quality by the eight Quick Diagnostic rows using round(passed / 8 × 10), lowering the score for a severe smell. State the score, the smells lowering it, and the specific refactorings needed for 10/10; the listed score bands describe expected conditions.
<!-- vpmodule:atom:end refactoring-score-structure -->