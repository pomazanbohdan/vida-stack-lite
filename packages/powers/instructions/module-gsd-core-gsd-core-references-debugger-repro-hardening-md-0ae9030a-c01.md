---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-debugger-repro-hardening-md-0ae9030a-c01"
title: "gsd-core: gsd-core/references/debugger-repro-hardening.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/debugger-repro-hardening.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/debugger-repro-hardening.md\"}"
atom_ids:
  - add-the-neighbours-of-the-fixed-defect
  - name-the-oracle-before-writing-the-assertion
atom_count: 2
atoms: "[{\"atom_id\":\"add-the-neighbours-of-the-fixed-defect\",\"file_sha256\":\"43d5ea0fd14ab0b1182f26f1231bd43003ec4c38ce8c524902450d37a6791f8d\",\"content_sha256\":\"503cb33b0842dafa650462c88cd740284c7e55292652fef63535f2e15cd17386\",\"file_bytes\":1710,\"body_bytes\":593},{\"atom_id\":\"name-the-oracle-before-writing-the-assertion\",\"file_sha256\":\"c00ebb26ad2d8091929fe826297d2eef8f75a3f5796cb46aa9b747c9c969c1a7\",\"content_sha256\":\"715b017c2a98337f3ff0344c344d4dc7ff3e173ada5998f1f9fa19260f3ce2dc\",\"file_bytes\":1893,\"body_bytes\":775}]"
carrier_sha256: a5e14824e7527ba6f2b5a5cddad59d2969ed13729986e023bfe28a10e5c7a285
carrier_bytes: 3882
revision: 1
status: active
---
<!-- vpmodule:atom:begin add-the-neighbours-of-the-fixed-defect -->
---
instruction_id: add-the-neighbours-of-the-fixed-defect
title: Add the neighbours of the fixed defect
summary: "Cases are generated around the equivalence class the fix draws, so the adjacent off-by-one is caught as well."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A defect was fixed and the regression test is being written.
conditions_does_not_apply_when: "The defect had no equivalence class, only an open end."
artifact_contract_output_type: boundary-neighbour-cases
artifact_contract_required_data:
  - the equivalence class the fix draws
  - the neighbour cases
  - the boundary they sit at
artifact_contract_verified_by: the cases sit just outside the fixed class and the seed alone is not the whole check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-repro-hardening.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Add the neighbours of the fixed defect
After the fix, generate boundary-adjacent cases **around the fixed defect's equivalence class** — the single reported value misses the adjacent off-by-one:
Off-by-one — `N-1`, `N`, `N+1` around the boundary the fix touched.
Min/max — `0`, `length`, empty range, the max representable value.
Empty / singleton — `[]`, `[x]`, `""`, `"c"`.
First identify the equivalence class the fix's predicate draws
the neighbors are the elements just outside that class boundary.
They catch the adjacent off-by-one that a single-value regression seed misses.
<!-- vpmodule:atom:end add-the-neighbours-of-the-fixed-defect -->
<!-- vpmodule:atom:begin name-the-oracle-before-writing-the-assertion -->
---
instruction_id: name-the-oracle-before-writing-the-assertion
title: Name the oracle before you write the assertion
summary: The kind of oracle the test uses is stated before the assertion is written; a crash-only oracle is never used silently.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A regression assertion is about to be written.
conditions_does_not_apply_when: The assertion already exists and only its result is read.
artifact_contract_output_type: oracle-statement
artifact_contract_required_data:
  - the oracle type
  - what the oracle checks
  - the reason when it is the weakest one
artifact_contract_verified_by: the oracle is named before the assertion exists and a crash-only oracle is justified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-repro-hardening.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the oracle before you write the assertion
Before writing the regression assertion, **state which oracle the test uses**.
Specified — the spec/contract states the expected behavior directly
Derived (contract/model) — derived from a contract or a reference model
Metamorphic — no precise oracle exists (renderers, optimizers, ML); check a *relation* between related inputs
Implicit (crash) — the only oracle is "doesn't crash / terminates / no exception thrown."
**This is the weakest oracle.** It proves almost nothing about correctness.
Never default to it silently — if implicit is the best available, state it explicitly and justify why no stronger oracle is possible.
The discipline's point: forcing the choice surfaces a weak oracle before the fix lands
<!-- vpmodule:atom:end name-the-oracle-before-writing-the-assertion -->