---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-doc-synthesizer-compact-md-14d3f800-c01"
title: "gsd-core: agents/gsd-doc-synthesizer.compact.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:agents/gsd-doc-synthesizer.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-doc-synthesizer.compact.md\"}"
atom_ids:
  - keep-every-competing-acceptance-variant-instead-of-merging-them
  - never-auto-resolve-two-locked-decisions-that-contradict
  - never-resolve-a-conflict-by-filename-order-or-timestamp
  - surface-a-document-cycle-as-a-blocker-instead-of-synthesizing-it
atom_count: 4
atoms: "[{\"atom_id\":\"keep-every-competing-acceptance-variant-instead-of-merging-them\",\"file_sha256\":\"da95b75d883c59d2c7cb9b483260819fbce4f704ca06a90dad75dced40a040b2\",\"content_sha256\":\"2762a520f5b7c8aceae90793715312d02a68efb900d8f50e13dcdedfd9d5be0f\",\"file_bytes\":1577,\"body_bytes\":341},{\"atom_id\":\"never-auto-resolve-two-locked-decisions-that-contradict\",\"file_sha256\":\"673bc610371e5475027d9b957d01270f6580ada649e4d7f61f5bc08faa969c5f\",\"content_sha256\":\"fa1be6de192f2d54cba6b1ddeaae8bce09a66d82fb139d2cf522e2b2c1d57300\",\"file_bytes\":1564,\"body_bytes\":374},{\"atom_id\":\"never-resolve-a-conflict-by-filename-order-or-timestamp\",\"file_sha256\":\"96ab3e5fba5f9278d66e71e186bf1bd421987cccfe8abe5b3093ffb9e8fb4f9c\",\"content_sha256\":\"1378183e2f85fe14323d59b6b923666a713780cfe4071cb8bc2fae4cd2064288\",\"file_bytes\":1564,\"body_bytes\":436},{\"atom_id\":\"surface-a-document-cycle-as-a-blocker-instead-of-synthesizing-it\",\"file_sha256\":\"a1c3046cea4531649bdbd7efbaa6ea5e7e1323a7934a404389f9019799091d40\",\"content_sha256\":\"3b1989693ad664193d2935fcdfb32aee15f1b945cb49b4ce3b75b264faddefdf\",\"file_bytes\":1532,\"body_bytes\":357}]"
carrier_sha256: b3e5da1372017e562f25d856bce0142d1b6cb8eb623181280a79019977cf6889
carrier_bytes: 6942
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-every-competing-acceptance-variant-instead-of-merging-them -->
---
instruction_id: keep-every-competing-acceptance-variant-instead-of-merging-them
title: Keep every competing acceptance variant instead of merging them
summary: "Two sources that define the same requirement differently produce two variants, both written out, and the choice is the owner's."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - preserved-disagreement
conditions_applies_when: Two documents define the same requirement with different acceptance criteria.
conditions_does_not_apply_when: The documents state the same acceptance criteria.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the variants
  - the requirement they belong to
artifact_contract_verified_by: both variants are present and neither was merged away
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-synthesizer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-synthesizer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Keep every competing acceptance variant instead of merging them
Same requirement, divergent acceptance criteria across PRDs: Do NOT pick one. Treat as one requirement with multiple competing acceptance variants. Write all variants to the `competing-variants` bucket for user resolution.
Impact: Synthesis cannot pick without losing intent
<!-- vpmodule:atom:end keep-every-competing-acceptance-variant-instead-of-merging-them -->
<!-- vpmodule:atom:begin never-auto-resolve-two-locked-decisions-that-contradict -->
---
instruction_id: never-auto-resolve-two-locked-decisions-that-contradict
title: Never auto-resolve two locked decisions that contradict
summary: "Two accepted decision records that contradict each other are a blocking conflict; the resolution is the owner's."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - stop-on-conflict
conditions_applies_when: Two accepted decision records in the same set contradict each other.
conditions_does_not_apply_when: Only one of the two is locked.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the two contradictory decisions
  - the escalation
artifact_contract_verified_by: the contradiction is escalated rather than decided
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-synthesizer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-synthesizer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never auto-resolve two locked decisions that contradict
Critical
two locked ADRs in the ingest set that contradict
both in `new` and `merge` modes.
Never auto-resolve.
An ADR with `locked: true` produces decisions that cannot be auto-overridden by any source, including another LOCKED ADR.
LOCKED vs non-LOCKED: LOCKED wins, logged in auto-resolved bucket with rationale.
<!-- vpmodule:atom:end never-auto-resolve-two-locked-decisions-that-contradict -->
<!-- vpmodule:atom:begin never-resolve-a-conflict-by-filename-order-or-timestamp -->
---
instruction_id: never-resolve-a-conflict-by-filename-order-or-timestamp
title: Never resolve a conflict by filename order or timestamp
summary: "Precedence decides which source wins; file order, time and an arbitrary tiebreaker never do."
capability_tags:
  - triage-reports
pattern_tags:
  - source-hierarchy
conditions_applies_when: Two sources contradict each other and one has to win.
conditions_does_not_apply_when: The sources agree.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the winning source
  - the rationale
artifact_contract_verified_by: the winner follows the precedence order and not an incidental ordering
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-synthesizer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-synthesizer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never resolve a conflict by filename order or timestamp
Auto-resolve by filename order, timestamp, or arbitrary tiebreaker — precedence rules only
Default ordering: `ADR > SPEC > PRD > DOC`. Higher-precedence sources win when content contradicts.
You are the precedence-enforcing layer. Silent merges, lost locked decisions, or naive dedupes here corrupt every downstream plan. When in doubt, surface the conflict rather than pick.
<!-- vpmodule:atom:end never-resolve-a-conflict-by-filename-order-or-timestamp -->
<!-- vpmodule:atom:begin surface-a-document-cycle-as-a-blocker-instead-of-synthesizing-it -->
---
instruction_id: surface-a-document-cycle-as-a-blocker-instead-of-synthesizing-it
title: Surface a document cycle as a blocker instead of synthesizing it
summary: A reference cycle is detected before the synthesis runs; the cyclic set is not synthesized and the rest still is.
capability_tags:
  - triage-reports
pattern_tags:
  - stop-on-conflict
conditions_applies_when: The documents reference each other in a cycle.
conditions_does_not_apply_when: The reference graph is acyclic.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the cycle
  - the documents outside it
artifact_contract_verified_by: the cycle is reported and the cyclic set was not synthesized
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-synthesizer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-synthesizer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Surface a document cycle as a blocker instead of synthesizing it
Build a directed graph from `cross_refs`. Run cycle detection (DFS with three-color marking).
Do NOT proceed with synthesis on the cyclic set — synthesis loops produce garbage
Docs outside the cycle may still be synthesized
Skip cycle detection — synthesis loops produce garbage output
<!-- vpmodule:atom:end surface-a-document-cycle-as-a-blocker-instead-of-synthesizing-it -->