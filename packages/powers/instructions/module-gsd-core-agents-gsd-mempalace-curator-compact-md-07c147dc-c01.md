---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-mempalace-curator-compact-md-07c147dc-c01"
title: "gsd-core: agents/gsd-mempalace-curator.compact.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:agents/gsd-mempalace-curator.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-mempalace-curator.compact.md\"}"
atom_ids:
  - keep-the-curation-idempotent-scoped-and-non-destructive
  - key-the-fact-so-a-rerun-does-not-duplicate-it
atom_count: 2
atoms: "[{\"atom_id\":\"keep-the-curation-idempotent-scoped-and-non-destructive\",\"file_sha256\":\"2a63170bb0464366f99bf505e0b753c9aabd89909dcec044f265832e14336169\",\"content_sha256\":\"24b1bdb57cdc52a1ac32508cc7983b732362b8065611c1bb63a5de08df6dcf7c\",\"file_bytes\":1727,\"body_bytes\":512},{\"atom_id\":\"key-the-fact-so-a-rerun-does-not-duplicate-it\",\"file_sha256\":\"682a03b3f9cc86263324023087b76ca1f4c8b5cac0a0f35028f5d9261422313a\",\"content_sha256\":\"bc4c070a86cd28c65360caab58262e46c442b3976fab0f32bd272208c6a296fc\",\"file_bytes\":1494,\"body_bytes\":303}]"
carrier_sha256: 511a02fc9e9322d907a8d94dd4c1ffc982f94af3d853655919926c4649d20d44
carrier_bytes: 3536
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-curation-idempotent-scoped-and-non-destructive -->
---
instruction_id: keep-the-curation-idempotent-scoped-and-non-destructive
title: "Keep the curation idempotent, scoped and non-destructive"
summary: "The memory write never fails the run, never leaves the project's own scope, never duplicates and never destroys history."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: A memory store is written at the end of a piece of work.
conditions_does_not_apply_when: The write is the deliverable itself.
artifact_contract_output_type: curation-report
artifact_contract_required_data:
  - what was written
  - what was skipped
artifact_contract_verified_by: a rerun would not duplicate anything and nothing outside the scope was touched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-mempalace-curator.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-mempalace-curator.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the curation idempotent, scoped and non-destructive
If neither is reachable, report unavailability and stop — do not error.
Best-effort only: catch and report every memory-store failure; never propagate an error that would fail the ship step.
Wing-scoped only: never read, write, or prune outside this project's wing.
Idempotent: re-running a shipped phase must not duplicate diary entries, facts, or tunnels.
Verbatim preservation: invalidate superseded facts (set `valid_to`); do not destroy history.
<!-- vpmodule:atom:end keep-the-curation-idempotent-scoped-and-non-destructive -->
<!-- vpmodule:atom:begin key-the-fact-so-a-rerun-does-not-duplicate-it -->
---
instruction_id: key-the-fact-so-a-rerun-does-not-duplicate-it
title: Key the fact so a rerun does not duplicate it
summary: Every written fact and every link carries a natural key that is looked up before it is written.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - stable-identity
conditions_applies_when: Facts or links are written into a store that can be written twice.
conditions_does_not_apply_when: The store is written exactly once by construction.
artifact_contract_output_type: curation-report
artifact_contract_required_data:
  - the key
  - the write decision
artifact_contract_verified_by: the key was looked up before the write and an existing entry was updated instead of appended
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-mempalace-curator.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-mempalace-curator.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Key the fact so a rerun does not duplicate it
the triple `(subject, predicate, object)` is the natural key
so reruns don't fork duplicate facts
check the `find_tunnels` result first and skip creation if a tunnel with that `(source-wing, target-wing, label)` already exists
Do not mass-create tunnels.
<!-- vpmodule:atom:end key-the-fact-so-a-rerun-does-not-duplicate-it -->