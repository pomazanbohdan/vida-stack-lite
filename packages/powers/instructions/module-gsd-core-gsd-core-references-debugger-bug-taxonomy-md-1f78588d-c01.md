---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-debugger-bug-taxonomy-md-1f78588d-c01"
title: "gsd-core: gsd-core/references/debugger-bug-taxonomy.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/debugger-bug-taxonomy.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/debugger-bug-taxonomy.md\"}"
atom_ids:
  - classify-the-failure-then-route-the-investigation
  - run-the-concurrency-checklist-before-the-general-techniques
atom_count: 2
atoms: "[{\"atom_id\":\"classify-the-failure-then-route-the-investigation\",\"file_sha256\":\"1fe71d0496d88f3ed2287ef72d44be799a7e950f263e63d94fec11e80520fa8b\",\"content_sha256\":\"a3cae5f22ff80b8d8c389cde8d89f703f20842963616bbfef605856dc83fc6b1\",\"file_bytes\":2128,\"body_bytes\":942},{\"atom_id\":\"run-the-concurrency-checklist-before-the-general-techniques\",\"file_sha256\":\"e47f7ff0fea5886e99f0f1434f8856eee95573719525b95115f35451b7a48360\",\"content_sha256\":\"2240552800a0dcce0ffc7ff4803a03fa4ca8009c17a412c7f40d64ba7b53d0c3\",\"file_bytes\":1707,\"body_bytes\":590}]"
carrier_sha256: b769c5012b3e9cb33516c1aa62bb6372da1584bda140197c0519a2de1f5a176f
carrier_bytes: 4166
revision: 1
status: active
---
<!-- vpmodule:atom:begin classify-the-failure-then-route-the-investigation -->
---
instruction_id: classify-the-failure-then-route-the-investigation
title: "Classify the failure, then route the investigation"
summary: "The failure is classified as deterministic, transient or concurrent in one sentence, and the class decides which investigation technique comes first."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A failure is about to be investigated and the technique has to be chosen.
conditions_does_not_apply_when: The cause is already known and only the fix is left.
artifact_contract_output_type: failure-class
artifact_contract_required_data:
  - the class of the failure
  - the route the class selects
  - the evidence the class rests on
artifact_contract_verified_by: the chosen class and strategy are written down so the decision is inspectable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-bug-taxonomy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Classify the failure, then route the investigation
Classification takes one sentence and routes the rest.
Bohrbug — solid, deterministic, always reproduces under the same inputs
Heisenbug / Mandelbug — transient, non-deterministic, changes under observation
Mandelbug specifically covers aging-related failures (resource exhaustion, uptime-dependent state, slow accumulation) whose cause is tangled with the system rather than purely timing.
Concurrency — atomicity-violation, order-violation, or deadlock (the Lu et al. 2008 classification) arising from interleaved execution.
If the class is genuinely unclear after one observation, gather one more piece of evidence (does it reproduce on immediate retry? does it depend on uptime?) rather than forcing a guess
Where a class route and a situation-based hunch disagree, the class route wins
The chosen class and strategy are written to the debug file so the decision is inspectable.
<!-- vpmodule:atom:end classify-the-failure-then-route-the-investigation -->
<!-- vpmodule:atom:begin run-the-concurrency-checklist-before-the-general-techniques -->
---
instruction_id: run-the-concurrency-checklist-before-the-general-techniques
title: Run the concurrency checklist before the general techniques
summary: "When interleaved execution is suspected, atomicity, order and deadlock are checked before any general technique."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: The failure was classified as concurrent.
conditions_does_not_apply_when: The failure is deterministic and reproduces on every run.
artifact_contract_output_type: concurrency-check
artifact_contract_required_data:
  - the atomicity finding
  - the order finding
  - the deadlock finding
  - the leading hypothesis
artifact_contract_verified_by: the three checks were run and their outcome recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-bug-taxonomy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Run the concurrency checklist before the general techniques
Run this BEFORE general techniques:
Atomicity — is a read-modify-write non-atomic? (check-then-act without a lock, missing compare-and-swap, a "get then set" across an await/yield)
Order — can two operations legally interleave to produce the bad state? (missing happens-before / synchronization; publish-before-init; init order across async boundaries)
Deadlock — circular wait on locks/resources? (hold-and-wait, no preemption, mutual blocking on shared resources)
If any branch hits, that becomes the leading hypothesis
<!-- vpmodule:atom:end run-the-concurrency-checklist-before-the-general-techniques -->