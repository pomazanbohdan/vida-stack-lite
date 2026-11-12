---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-enable-concurrent-chunked-planning-md-1f7947bc-c01"
title: "gsd-core: docs/how-to/enable-concurrent-chunked-planning.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/enable-concurrent-chunked-planning.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/enable-concurrent-chunked-planning.md\"}"
atom_ids:
  - a-setting-whose-host-cannot-run-it-stays-inert
  - concurrency-changes-the-commit-order-not-the-commit-granularity
atom_count: 2
atoms: "[{\"atom_id\":\"a-setting-whose-host-cannot-run-it-stays-inert\",\"file_sha256\":\"a3f72861b7bd03cfcaf874507e0a0e188422efc2d5c00cb06a84b7137b55d5ad\",\"content_sha256\":\"a0b467c84d26ddb53fdf39c459749d753ccd2ab14e54b609a9cc0ed7fd855c8b\",\"file_bytes\":1329,\"body_bytes\":175},{\"atom_id\":\"concurrency-changes-the-commit-order-not-the-commit-granularity\",\"file_sha256\":\"121bb676c369dd015bbf1e01a2f8ed72d88b85d785c433e31fa8e31fae745e8d\",\"content_sha256\":\"ff347c8fd2479282dfec6dba5212123ad8e37a31221594d352e82cf5670cb2fc\",\"file_bytes\":1431,\"body_bytes\":255}]"
carrier_sha256: 9ea3de8fa2e306d234d1df927613572b3ce0ef47b1a461dd86b230be9ca52b64
carrier_bytes: 3093
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-setting-whose-host-cannot-run-it-stays-inert -->
---
instruction_id: a-setting-whose-host-cannot-run-it-stays-inert
title: A setting whose host cannot run it stays inert
summary: "When the host does not meet the condition the setting needs, the setting simply does not fire; that is the design, not a bug to work around."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - safe-defaults
conditions_applies_when: A setting is enabled but the host does not satisfy its precondition.
conditions_does_not_apply_when: The host satisfies the precondition.
artifact_contract_output_type: inert-setting-record
artifact_contract_required_data:
  - the setting
  - the precondition the host does not meet
  - what happens instead
artifact_contract_verified_by: the setting does nothing and the behaviour is the same as before it was enabled
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/enable-concurrent-chunked-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# A setting whose host cannot run it stays inert
This is not a bug to work around: it means the setting never fires concurrent dispatch on a host that cannot usefully run it.
<!-- vpmodule:atom:end a-setting-whose-host-cannot-run-it-stays-inert -->
<!-- vpmodule:atom:begin concurrency-changes-the-commit-order-not-the-commit-granularity -->
---
instruction_id: concurrency-changes-the-commit-order-not-the-commit-granularity
title: "Concurrency changes the commit order, not the commit granularity"
summary: "Running the units in parallel makes them commit in completion order, but each unit still gets its own commit and they are never combined into one."
capability_tags:
  - integrate-branch
pattern_tags:
  - parallel-execution
conditions_applies_when: Independent units of work are executed at the same time.
conditions_does_not_apply_when: The units are executed one after another.
artifact_contract_output_type: commit-granularity-record
artifact_contract_required_data:
  - the units
  - the commit each one got
  - the order they landed in
artifact_contract_verified_by: every unit has its own commit and no commit carries more than one unit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/enable-concurrent-chunked-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Concurrency changes the commit order, not the commit granularity
With concurrent dispatch, whichever plans in a batch finish first commit first — still one commit per plan, never a combined commit, but not necessarily in outline order within a batch.
<!-- vpmodule:atom:end concurrency-changes-the-commit-order-not-the-commit-granularity -->