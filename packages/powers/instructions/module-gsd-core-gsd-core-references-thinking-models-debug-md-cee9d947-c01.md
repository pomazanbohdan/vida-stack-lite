---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-thinking-models-debug-md-cee9d947-c01"
title: "gsd-core: gsd-core/references/thinking-models-debug.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/references/thinking-models-debug.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/thinking-models-debug.md\"}"
atom_ids:
  - build-the-fault-tree-before-you-test-a-hypothesis
  - rule-out-the-simple-causes-first
  - test-the-counterfactual-and-keep-the-cause-only-if-it-holds
  - treat-an-unexpected-result-as-new-evidence
atom_count: 4
atoms: "[{\"atom_id\":\"build-the-fault-tree-before-you-test-a-hypothesis\",\"file_sha256\":\"7677d8487599dbe5f2d52d9f353fdec2701273714b00141d93149a181a6b72bd\",\"content_sha256\":\"85492eb57e26d546c132218dd3325a29c6ae8a98b49f2450c72ac942e18f65ea\",\"file_bytes\":1683,\"body_bytes\":588},{\"atom_id\":\"rule-out-the-simple-causes-first\",\"file_sha256\":\"7c4922fcab11755c7a165a3a06fea5f25908ef724e6626d3ddb168526863701f\",\"content_sha256\":\"f599875057442b7d6529696a185254e5b05fd20cdbcc57c624e9829ebcf5986a\",\"file_bytes\":1657,\"body_bytes\":552},{\"atom_id\":\"test-the-counterfactual-and-keep-the-cause-only-if-it-holds\",\"file_sha256\":\"5ad77fcc10be4807cccf77989bf2eca53e7728961b349420c467c947a118d87a\",\"content_sha256\":\"8267cb7a53d66365cef11c9b2303bf5d3bde1ea28cb6a74fdf236adf6153c922\",\"file_bytes\":1689,\"body_bytes\":546},{\"atom_id\":\"treat-an-unexpected-result-as-new-evidence\",\"file_sha256\":\"bf58c19b92bbf3d152e3b28f4cec9ed9a0410adeb4a355abf6153f54ddf49c13\",\"content_sha256\":\"afb5565c1f8feb9f66d1a045154fbc7599ca907f4173c3f38724f5df961c90fa\",\"file_bytes\":1440,\"body_bytes\":365}]"
carrier_sha256: 405d788a1b7ce0c8e3ff561c3847a5fa01e0de9a671c4a82677144b9a85820f4
carrier_bytes: 7064
revision: 1
status: active
---
<!-- vpmodule:atom:begin build-the-fault-tree-before-you-test-a-hypothesis -->
---
instruction_id: build-the-fault-tree-before-you-test-a-hypothesis
title: Build the fault tree before you test a hypothesis
summary: "The possible causes are mapped as a tree before any hypothesis is tested, and unlikely branches are not pruned when they are cheap to test."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: Several causes could explain the observed symptom.
conditions_does_not_apply_when: "The error message names the exact file, line and cause."
artifact_contract_output_type: fault-tree
artifact_contract_required_data:
  - the root node
  - the branches
  - the order they are tested in
artifact_contract_verified_by: the tree exists before the first hypothesis is tested
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Build the fault tree before you test a hypothesis
Before testing any hypothesis, build a fault tree: start with the observed symptom as the root node, then branch into all possible causes at each level (hardware, software, configuration, data, environment). Use AND/OR gates -- some failures require multiple conditions (AND), others have independent triggers (OR). This tree becomes your investigation roadmap. Prioritize branches by likelihood and testability, but do NOT prune branches just because they seem unlikely -- unlikely causes that are easy to test should be tested early.
<!-- vpmodule:atom:end build-the-fault-tree-before-you-test-a-hypothesis -->
<!-- vpmodule:atom:begin rule-out-the-simple-causes-first -->
---
instruction_id: rule-out-the-simple-causes-first
title: Rule out the simple causes first
summary: The boring explanations are checked before a complex one is entertained; a hypothesis that needs three things to fail at once is set aside.
capability_tags:
  - debug-root-cause
pattern_tags:
  - failure-first-analysis
conditions_applies_when: "A complex interaction, a race condition or a framework-level issue is suspected."
conditions_does_not_apply_when: The cause is already identified.
artifact_contract_output_type: simple-cause-check
artifact_contract_required_data:
  - the simple explanations that were checked
  - the result of each
artifact_contract_verified_by: the simple explanations were ruled out before the complex hypothesis was taken up
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Rule out the simple causes first
Before investigating complex multi-component interaction bugs, race conditions, or framework-level issues, verify the simple explanations first: typo in variable name, wrong file path, missing import, incorrect config value, stale cache, wrong environment variable. These "boring" causes account for the majority of bugs. Only escalate to complex hypotheses AFTER the simple ones are eliminated. If your current hypothesis requires 3+ things to go wrong simultaneously, step back and look for a single-point failure.
<!-- vpmodule:atom:end rule-out-the-simple-causes-first -->
<!-- vpmodule:atom:begin test-the-counterfactual-and-keep-the-cause-only-if-it-holds -->
---
instruction_id: test-the-counterfactual-and-keep-the-cause-only-if-it-holds
title: Test the counterfactual and keep the cause only if it holds
summary: "The suspected cause is tested by changing one thing; if the symptom survives the change, the cause is wrong."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A hypothesis about the root cause is in hand.
conditions_does_not_apply_when: The cause is already confirmed by a failing reproduction.
artifact_contract_output_type: counterfactual-result
artifact_contract_required_data:
  - the single variable changed
  - the result
  - the verdict on the hypothesis
artifact_contract_verified_by: the counterfactual was executed and the hypothesis kept or dropped on its result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Test the counterfactual and keep the cause only if it holds
When you have a hypothesis about the root cause, construct a counterfactual: "If I change ONLY this one variable/config/line, the bug should disappear (or appear)." Execute the counterfactual test. If the bug persists after your targeted change, your hypothesis is wrong -- the cause is elsewhere. If the bug disappears, you have strong causal evidence. This is more powerful than correlation ("the bug appeared after deploy X") because it tests the mechanism, not just the timeline.
<!-- vpmodule:atom:end test-the-counterfactual-and-keep-the-cause-only-if-it-holds -->
<!-- vpmodule:atom:begin treat-an-unexpected-result-as-new-evidence -->
---
instruction_id: treat-an-unexpected-result-as-new-evidence
title: Treat an unexpected result as new evidence
summary: "A result that matches nothing the hypothesis predicted is evidence, not a failed hypothesis."
capability_tags:
  - debug-root-cause
pattern_tags:
  - evidence-analysis
conditions_applies_when: A test produced a result the hypothesis did not predict.
conditions_does_not_apply_when: The result confirmed or refuted the prediction.
artifact_contract_output_type: hypothesis-outcome
artifact_contract_required_data:
  - the prediction
  - the observed result
  - the outcome class
artifact_contract_verified_by: the outcome was classified and an unexpected result was carried forward as evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Treat an unexpected result as new evidence
CONCLUDE (matched = SUPPORTED, failed = ELIMINATED, unexpected = new evidence)
Never skip the PREDICT step -- without a prediction, you cannot distinguish a meaningful result from noise
Never change more than one variable per test -- if you change two things and the bug disappears, you don't know which change fixed it
<!-- vpmodule:atom:end treat-an-unexpected-result-as-new-evidence -->