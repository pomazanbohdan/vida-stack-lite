---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-framework-selector-compact-md-03637e9b-c01"
title: "gsd-core: agents/gsd-framework-selector.compact.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:agents/gsd-framework-selector.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-framework-selector.compact.md\"}"
atom_ids:
  - apply-the-hard-constraints-before-you-score-the-options
  - scan-the-codebase-for-existing-signals-before-you-ask-the-user
atom_count: 2
atoms: "[{\"atom_id\":\"apply-the-hard-constraints-before-you-score-the-options\",\"file_sha256\":\"c7acecc4b9ef7fd873bc56585877e1e5abe3acb79871c66dd81ec86bf8350a23\",\"content_sha256\":\"c640f13b9b502532f23ea6f04346d6658c7d3e230a71753c94d09f2dde089f01\",\"file_bytes\":1562,\"body_bytes\":217},{\"atom_id\":\"scan-the-codebase-for-existing-signals-before-you-ask-the-user\",\"file_sha256\":\"2c56b539f41c3488ad7a96be66be8de8c796eb9e323318c35a32128d2b883d97\",\"content_sha256\":\"5d3e136b01e77db30e0e39c6e610019497e2e055ad1e73e999a8afc9c0456256\",\"file_bytes\":1574,\"body_bytes\":318}]"
carrier_sha256: 9ca6bbdd39ba05f2ab64744fcd3aac4a31ec144fe636415ed7ae82ac33a790e1
carrier_bytes: 3485
revision: 1
status: active
---
<!-- vpmodule:atom:begin apply-the-hard-constraints-before-you-score-the-options -->
---
instruction_id: apply-the-hard-constraints-before-you-score-the-options
title: Apply the hard constraints before you score the options
summary: An option that breaks a hard constraint is dropped first; only the survivors are scored and only the recommendation is shown.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Options are scored against a set of constraints and a priority.
conditions_does_not_apply_when: There is a single option.
artifact_contract_output_type: recommendation
artifact_contract_required_data:
  - the eliminated options
  - the recommendation
artifact_contract_verified_by: the constraints were applied first and the scoring table is not shown
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-framework-selector.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-framework-selector.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives a clear framework-scoring sequence, but neither it nor its applicability conditions identify the framework subject area; no supported domain can be grounded."
---

# Apply the hard constraints before you score the options
Eliminate frameworks failing any hard constraint
Produce ranked top 3 — show only the recommendation, not the scoring table
Weight by user's stated priority
<!-- vpmodule:atom:end apply-the-hard-constraints-before-you-score-the-options -->
<!-- vpmodule:atom:begin scan-the-codebase-for-existing-signals-before-you-ask-the-user -->
---
instruction_id: scan-the-codebase-for-existing-signals-before-you-ask-the-user
title: Scan the codebase for existing signals before you ask the user
summary: What the repository already answers is not asked; the interview is cut down to what only the user knows.
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - project-conventions-first
conditions_applies_when: A decision needs information that the repository may already hold.
conditions_does_not_apply_when: The question is about preference and has no answer in the repository.
artifact_contract_output_type: interview
artifact_contract_required_data:
  - the detected signals
  - the questions asked
artifact_contract_verified_by: the codebase was scanned and the question count stayed within the bound
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-framework-selector.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-framework-selector.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Scan the codebase for existing signals before you ask the user
Scan for existing technology signals before the interview:
This prevents recommending a framework the team has already rejected.
Use a single AskUserQuestion call with ≤ 6 questions. Skip what the codebase scan or upstream CONTEXT.md already answers.
<!-- vpmodule:atom:end scan-the-codebase-for-existing-signals-before-you-ask-the-user -->