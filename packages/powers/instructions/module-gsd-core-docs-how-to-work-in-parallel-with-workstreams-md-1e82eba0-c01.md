---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-work-in-parallel-with-workstreams-md-1e82eba0-c01"
title: "gsd-core: docs/how-to/work-in-parallel-with-workstreams.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/work-in-parallel-with-workstreams.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/work-in-parallel-with-workstreams.md\"}"
atom_ids:
  - choose-the-isolation-level-that-matches-the-work
  - separate-the-planning-state-when-the-code-is-shared
atom_count: 2
atoms: "[{\"atom_id\":\"choose-the-isolation-level-that-matches-the-work\",\"file_sha256\":\"c8646b84de87b8d9fa4e41cb7aa04edf2f9807d71aa31648346f09a423b68682\",\"content_sha256\":\"6525f4ec28dca44a2498b97ce2d91c99e14f80bd52406f64392492ff6283eb62\",\"file_bytes\":1481,\"body_bytes\":355},{\"atom_id\":\"separate-the-planning-state-when-the-code-is-shared\",\"file_sha256\":\"5abc66d46975e523f681b4bc21262d6bbcab9fac9116af50560bfd6ce4c1383a\",\"content_sha256\":\"1d769f6dfa6d596222212701942a8377fa3427c686206272b6c975c36c01449d\",\"file_bytes\":1497,\"body_bytes\":226}]"
carrier_sha256: 05bf920d8802d626e58fe95df1a5781923edbfd69b5e6b56bfe72fab0fe2c427
carrier_bytes: 3291
revision: 1
status: active
---
<!-- vpmodule:atom:begin choose-the-isolation-level-that-matches-the-work -->
---
instruction_id: choose-the-isolation-level-that-matches-the-work
title: Choose the isolation level that matches the work
summary: The shared repository with separate planning state and the separate worktree with independent branches are two different answers to two different questions.
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A choice of isolation is made for parallel work.
conditions_does_not_apply_when: Only one area of work is in flight.
artifact_contract_output_type: isolation-choice
artifact_contract_required_data:
  - the reason for the chosen level
  - what the other level would have given
artifact_contract_verified_by: the chosen level is named with the reason that decided it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/work-in-parallel-with-workstreams.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Choose the isolation level that matches the work
All the work lives in the **same repository** and shares the same git history
You need the isolation of a **separate git worktree** or clone per feature — fully independent branches, lock files, and build artefacts
The overhead of creating full git worktrees is not justified by the isolation you need
<!-- vpmodule:atom:end choose-the-isolation-level-that-matches-the-work -->
<!-- vpmodule:atom:begin separate-the-planning-state-when-the-code-is-shared -->
---
instruction_id: separate-the-planning-state-when-the-code-is-shared
title: Separate the planning state when the code is shared
summary: "Concurrent areas get separate planning state while the source tree, the history and the branches stay shared."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Two areas of the same codebase are worked on at the same time.
conditions_does_not_apply_when: The work is in two separate repositories.
artifact_contract_output_type: workstream-isolation
artifact_contract_required_data:
  - the isolated planning area
  - the shared code and history
artifact_contract_verified_by: the two areas have separate planning state and the code is still shared
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/work-in-parallel-with-workstreams.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body only defines a workstream and shared code/history/branches; it contains no judgment guidance, obligation, conditional choice, ordered actions, or independent checks supporting an instruction form."
---

# Separate the planning state when the code is shared
A workstream is an isolated planning context within a single codebase.
The codebase itself — source code, git history, and branches — is shared across all workstreams.
<!-- vpmodule:atom:end separate-the-planning-state-when-the-code-is-shared -->