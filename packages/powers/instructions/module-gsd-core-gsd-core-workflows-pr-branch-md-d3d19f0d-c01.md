---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-pr-branch-md-d3d19f0d-c01"
title: "gsd-core: gsd-core/workflows/pr-branch.md module"
summary: "Carrier for 6 atomic instructions from gsd-core:gsd-core/workflows/pr-branch.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/pr-branch.md\"}"
atom_ids:
  - classify-each-commit-by-what-it-touches
  - keep-the-internal-planning-out-of-the-public-branch
  - prove-the-branch-lost-nothing
  - require-a-clean-tree-and-a-fitting-branch
  - restore-the-base-state-for-every-filtered-path
  - unwind-the-partial-branch-before-you-stop
atom_count: 6
atoms: "[{\"atom_id\":\"classify-each-commit-by-what-it-touches\",\"file_sha256\":\"d56a71ac5dd37f7388dfb534046a4a9049b7321e053fc5e544b04bcb14736a10\",\"content_sha256\":\"32ced68cac3e05d36afe86dca595e2c0f7b5f3243db4731b2c06234c610da7a9\",\"file_bytes\":2050,\"body_bytes\":875},{\"atom_id\":\"keep-the-internal-planning-out-of-the-public-branch\",\"file_sha256\":\"73c26b4ef1678a3fcf348f202d6677c10dbcf76f8d31c80ba4436ae223c1dd4d\",\"content_sha256\":\"4e13e50a2b6115b3fc8eefda1b3911d5bf09c1a028ada94e933c3e9c869240d7\",\"file_bytes\":1421,\"body_bytes\":279},{\"atom_id\":\"prove-the-branch-lost-nothing\",\"file_sha256\":\"e64792668a57732cf130a353916ea0da511da775b110478200e86bf0311efc71\",\"content_sha256\":\"d4476353d4723d0a75ce6acc06c0accac968bf0dccd898e723be5572b43266e0\",\"file_bytes\":1184,\"body_bytes\":204},{\"atom_id\":\"require-a-clean-tree-and-a-fitting-branch\",\"file_sha256\":\"8addd4da1bb73c7f054330bc33df978631aeba0378ab0acfac71267a0cbcb54b\",\"content_sha256\":\"2d5e605f581f169b6eb97827a81f0db82627067bdfb887c81d1639331b6f50c2\",\"file_bytes\":2412,\"body_bytes\":995},{\"atom_id\":\"restore-the-base-state-for-every-filtered-path\",\"file_sha256\":\"8ce1749831877323f9657e1c666cd683f92d86648ace6fc6c9974cee3ad7fe6f\",\"content_sha256\":\"e35439cb89c286d694b8e34e600c1e30f2fd0cbf830c0d047f840de6373fa9e5\",\"file_bytes\":1398,\"body_bytes\":314},{\"atom_id\":\"unwind-the-partial-branch-before-you-stop\",\"file_sha256\":\"59bec9b3e57b52eeb3911981eb9bbae29862dbd8099b9208a2e495aa91b29876\",\"content_sha256\":\"113dc8e135bb7f6867902603cef2c77b647e8ea6a4f28460a9a6b65f6ed66a2a\",\"file_bytes\":1481,\"body_bytes\":423}]"
carrier_sha256: 331d1f75cf461427cb266f99b2d30edea0620a2d9047804fee68cd95943800c8
carrier_bytes: 10787
revision: 1
status: active
---
<!-- vpmodule:atom:begin classify-each-commit-by-what-it-touches -->
---
instruction_id: classify-each-commit-by-what-it-touches
title: Classify each commit by what it touches
summary: "Every commit is classified by the files it touches, and each classification arm is a condition that can be computed, so the decision is never a reading of the situation."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
  - exhaustive-path-enumeration
conditions_applies_when: A set of commits is filtered before it is republished.
conditions_does_not_apply_when: The commits are published as they are.
artifact_contract_output_type: commit-classification
artifact_contract_required_data:
  - the counts of the files each commit touches
  - the class of each commit
artifact_contract_verified_by: every commit carries a class and every class was decided by a computable condition
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pr-branch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Classify each commit by what it touches
Classify, using `NON_PLANNING`, `STRUCTURAL`, and `PLANNING_COUNT` computed above — every arm's condition is explicit and computable so no reading of it is ambiguous:

- **Code commits**: `NON_PLANNING > 0` and `PLANNING_COUNT == 0` → INCLUDE (both modes)
- **Mixed code+planning commits**: `NON_PLANNING > 0` and `PLANNING_COUNT > 0` → INCLUDE (both modes; the planning paths are filtered out by `create_pr_branch`, not the commit)
- **Structural-only planning commits**: `NON_PLANNING == 0` and `STRUCTURAL == PLANNING_COUNT` and `PLANNING_COUNT > 0` (every `.planning/` file touched is structural) → INCLUDE in **default** mode; **EXCLUDE** in strict mode, which has no structural carve-out
- **Transient-only planning commits**: `NON_PLANNING == 0` and `STRUCTURAL == 0` and `PLANNING_COUNT > 0` → EXCLUDE (both modes)
<!-- vpmodule:atom:end classify-each-commit-by-what-it-touches -->
<!-- vpmodule:atom:begin keep-the-internal-planning-out-of-the-public-branch -->
---
instruction_id: keep-the-internal-planning-out-of-the-public-branch
title: Keep the internal planning out of the public branch
summary: The published branch carries the code and the structural state; the transient planning artifacts stay out and the count of what leaked must be zero.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A branch is prepared for publication.
conditions_does_not_apply_when: The branch is internal and never published.
artifact_contract_output_type: publish-filter
artifact_contract_required_data:
  - the mode the filter ran in
  - the number of forbidden paths in the diff
  - the deletion count
artifact_contract_verified_by: the forbidden-path count and the deletion count are both zero before the branch is published
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pr-branch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the internal planning out of the public branch
the PR branch contains code changes and structural planning state.
is the pass/fail number — it must be `0`.
A non-zero value means the filter did not do what this mode promised; report it and do not tell the user to push.
<!-- vpmodule:atom:end keep-the-internal-planning-out-of-the-public-branch -->
<!-- vpmodule:atom:begin prove-the-branch-lost-nothing -->
---
instruction_id: prove-the-branch-lost-nothing
title: Prove the branch lost nothing
summary: The published branch is checked for deleted paths and for commits that were dropped on the way.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A branch was rebuilt by replaying commits.
conditions_does_not_apply_when: The branch was created in one step.
artifact_contract_output_type: branch-integrity-report
artifact_contract_required_data:
  - the deletion count
  - the number of commits that landed
artifact_contract_verified_by: the deletion count is zero and every included commit landed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pr-branch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prove the branch lost nothing
That is data loss, not filtering — report it, do not tell the user to push, and rebuild the branch.
Every included commit landed — none dropped by a failed cherry-pick
<!-- vpmodule:atom:end prove-the-branch-lost-nothing -->
<!-- vpmodule:atom:begin require-a-clean-tree-and-a-fitting-branch -->
---
instruction_id: require-a-clean-tree-and-a-fitting-branch
title: Require a clean tree and a fitting branch
summary: "Before the work starts, the working tree is clean and the branch fits the intent; the destination and the tooling that reaches it are available; otherwise the run stops."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: The work is about to change files in a version-controlled tree.
conditions_does_not_apply_when: "Version control is unavailable, so there is no tree to check."
artifact_contract_output_type: preflight-check
artifact_contract_required_data:
  - the tree state
  - the branch
  - the intent the branch must fit
artifact_contract_verified_by: the tree was clean and the branch matched the intent before the first change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pr-branch.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ship.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Require a clean tree and a fitting branch
If version control is unavailable, skip this check. Otherwise require a clean working tree, a branch that fits the intent, and writable repository metadata.
For Git, run `git add --refresh -- .`, then confirm the tree is still clean; on failure or change, HALT with status `blocked` and blocking condition `version-control metadata not writable`.
For a ticket from the tree, judge the branch against the epic, not the story.
HALT on a dirty tree or obvious branch mismatch.
Working tree has uncommitted changes — commit or stash them first:
git cherry-pick refuses to run against a dirty tree anyway — so fail here, where the message is legible, rather than midway through the cherry-pick loop.
If uncommitted changes exist: ask user to commit or stash first.
If `IS_PROTECTED` is `true`: warn — should be on a feature branch.
If no remote: error — can't create PR.
If `gh` not found or not authenticated: provide setup instructions and exit.
<!-- vpmodule:atom:end require-a-clean-tree-and-a-fitting-branch -->
<!-- vpmodule:atom:begin restore-the-base-state-for-every-filtered-path -->
---
instruction_id: restore-the-base-state-for-every-filtered-path
title: Restore the base state for every filtered path
summary: "A path that was filtered out is put back to exactly what the branch already had, in the index and in the working tree."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A path was filtered out of a commit that is being replayed.
conditions_does_not_apply_when: No path was filtered out.
artifact_contract_output_type: filtered-path-state
artifact_contract_required_data:
  - the restored state of each filtered path
  - the index and the working tree
artifact_contract_verified_by: no filtered path is left behind and none was turned into a deletion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pr-branch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Restore the base state for every filtered path
The filter forces every filtered path back to exactly what the PR branch's HEAD already has, in both the index and the working tree.
Without this, un-staging a path the target branch already tracks records a DELETION
and every remaining commit is silently dropped.
<!-- vpmodule:atom:end restore-the-base-state-for-every-filtered-path -->
<!-- vpmodule:atom:begin unwind-the-partial-branch-before-you-stop -->
---
instruction_id: unwind-the-partial-branch-before-you-stop
title: Unwind the partial branch before you stop
summary: "A conflict that is not covered by the filter stops the run, and the checkout is put back before it stops."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A conflict appeared while the commits were replayed.
conditions_does_not_apply_when: Every commit was replayed without a conflict.
artifact_contract_output_type: unwind-record
artifact_contract_required_data:
  - the conflict
  - the state the checkout was put back to
artifact_contract_verified_by: the checkout was restored and the run did not claim a restore that did not happen
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pr-branch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Unwind the partial branch before you stop
Anything still unmerged is a REAL conflict, outside the filter.
improvise a resolution and do not continue, which would drop the rest of the queue.
Unwind first: this loop runs in the user's own checkout, so exiting mid-sequence
would strand them on a half-built branch with cherry-pick state still live.
Never claim a restore that did not happen — say exactly where they are.
<!-- vpmodule:atom:end unwind-the-partial-branch-before-you-stop -->