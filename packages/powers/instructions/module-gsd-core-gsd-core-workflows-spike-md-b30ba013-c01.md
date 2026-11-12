---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-spike-md-b30ba013-c01"
title: "gsd-core: gsd-core/workflows/spike.md module"
summary: "Carrier for 7 atomic instructions from gsd-core:gsd-core/workflows/spike.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/spike.md\"}"
atom_ids:
  - build-a-forensic-log-layer-when-the-run-needs-observability
  - follow-the-established-stack-and-say-when-you-deviate
  - frame-the-experiment-as-a-given-when-then-question
  - give-the-human-something-they-can-experience
  - keep-one-idea-per-key-and-never-mix-requirements
  - re-ground-on-the-shared-record-before-each-step
  - skip-the-question-you-have-already-answered
atom_count: 7
atoms: "[{\"atom_id\":\"build-a-forensic-log-layer-when-the-run-needs-observability\",\"file_sha256\":\"4b9537bd63322498e11c7c51861cd6f2234734b0bc795c6b0cb98c03987bb46a\",\"content_sha256\":\"98e8bae92788486025dd4d3ed8b82247d3dbeb97e00582d7d2d45bc1247ce7ba\",\"file_bytes\":1513,\"body_bytes\":364},{\"atom_id\":\"follow-the-established-stack-and-say-when-you-deviate\",\"file_sha256\":\"15bdda6f9a82673b7752a86f91b9d0da1baa479e9db1ac6ad6a68891373c4030\",\"content_sha256\":\"e739e094affb8da5cbf30a2a0819c697116efe4c09878f1eedd0252d1b2dfc67\",\"file_bytes\":1626,\"body_bytes\":479},{\"atom_id\":\"frame-the-experiment-as-a-given-when-then-question\",\"file_sha256\":\"df332e9d62ac09fa7210831b68b7a1052994e3f189cf122e9dfe87438b9dffd7\",\"content_sha256\":\"7ecc9f2d71afae6cb928e7547b44e975fd481f77ca1ded51b6626e4dfeea3ec8\",\"file_bytes\":1391,\"body_bytes\":270},{\"atom_id\":\"give-the-human-something-they-can-experience\",\"file_sha256\":\"e9c183ee9a3db72d6be884b2d9b210970997f1bbea03e03b841023fbcbe2ebad\",\"content_sha256\":\"c3505d6ac86426ab5512965cf52e8a23bc571004874b21c913789ebfa3fb69ac\",\"file_bytes\":1938,\"body_bytes\":691},{\"atom_id\":\"keep-one-idea-per-key-and-never-mix-requirements\",\"file_sha256\":\"3ac882b125833d0a3fc339b259e13b4f9f4d90b406dc19349c322ae41976702e\",\"content_sha256\":\"6c9d718f690d67b70367fae2deea121c236512d386fefc53a4cfa392ac93096c\",\"file_bytes\":1755,\"body_bytes\":608},{\"atom_id\":\"re-ground-on-the-shared-record-before-each-step\",\"file_sha256\":\"58880539323effc977691e4c2eee360022e155022b49c28490503f81653a8ad0\",\"content_sha256\":\"42f8b2630e6cbaa05037bd712a1974c6c7099d0224808dc5ab1312276f76a97e\",\"file_bytes\":1490,\"body_bytes\":350},{\"atom_id\":\"skip-the-question-you-have-already-answered\",\"file_sha256\":\"04f5e105a27d26e4712e837e0f8c5804430f54428ec7fe348b10a915b9ebff27\",\"content_sha256\":\"6c90dca65a9f28018e16addff7edda21237f6767da45ebaf9572a40ccbf7b12c\",\"file_bytes\":1601,\"body_bytes\":430}]"
carrier_sha256: cf60bcfb8d33cf22f2c5d121be01397c508b783094c6b1405314ca6f737c3974
carrier_bytes: 12407
revision: 1
status: active
---
<!-- vpmodule:atom:begin build-a-forensic-log-layer-when-the-run-needs-observability -->
---
instruction_id: build-a-forensic-log-layer-when-the-run-needs-observability
title: Build a forensic log layer when the run needs observability
summary: "When an experiment needs to be observed while it runs, it gets a log layer with timestamps, categories, an export path and a summary."
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: An experiment has to be watched while it runs to explain what happened.
conditions_does_not_apply_when: The behaviour is fully visible without any instrumentation.
artifact_contract_output_type: forensic-log
artifact_contract_required_data:
  - the event log
  - the export mechanism
  - the summary
artifact_contract_verified_by: the run can be reconstructed afterwards from the exported log
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Build a forensic log layer when the run needs observability
**If the spike needs runtime observability,** build a forensic log layer:
Event log array with ISO timestamps and category tags
Export mechanism (server: GET endpoint, CLI: JSON file, browser: Export button)
Log summary (event counts, duration, errors, metadata)
Analysis helpers if volume warrants it
<!-- vpmodule:atom:end build-a-forensic-log-layer-when-the-run-needs-observability -->
<!-- vpmodule:atom:begin follow-the-established-stack-and-say-when-you-deviate -->
---
instruction_id: follow-the-established-stack-and-say-when-you-deviate
title: Follow the established stack and say when you deviate
summary: The stack and patterns the project already settled on are used by default; the heavy infrastructure that would slow the work down is left out.
capability_tags:
  - consult-guidance
pattern_tags:
  - project-conventions-first
conditions_applies_when: Work starts in a project that already has an established stack and conventions.
conditions_does_not_apply_when: The project has no stack and none is expected.
artifact_contract_output_type: stack-decision
artifact_contract_required_data:
  - the conventions that were followed
  - the stack that was used
  - the deviations
artifact_contract_verified_by: the established stack was used and every deviation was said out loud
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Follow the established stack and say when you deviate
**Check conventions first.**
follow its stack and patterns — these represent validated choices the user expects to see continued.
Use the project's language/framework by default.
Avoid unless the spike specifically requires it:
Complex package management beyond `npm install` or `pip install`
Build tools, bundlers, or transpilers
Docker, containers, or infrastructure
Env files or config systems — hardcode everything
<!-- vpmodule:atom:end follow-the-established-stack-and-say-when-you-deviate -->
<!-- vpmodule:atom:begin frame-the-experiment-as-a-given-when-then-question -->
---
instruction_id: frame-the-experiment-as-a-given-when-then-question
title: Frame the experiment as a given-when-then question
summary: "An idea is broken into a few independent feasibility questions, each framed as a given-when-then condition with an observable outcome."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: An idea has to be turned into experiments that can answer something.
conditions_does_not_apply_when: The question is already framed and observable.
artifact_contract_output_type: experiment-set
artifact_contract_required_data:
  - the questions
  - the given-when-then framing
  - the observable outcome
artifact_contract_verified_by: "every question is narrow, framed as a condition and ends in an observable outcome"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Frame the experiment as a given-when-then question
Break the idea into 2-5 independent questions. Frame each as Given/When/Then.
Good spikes: specific feasibility questions with observable output.
Bad spikes: too broad, no observable output, or just reading/planning.
<!-- vpmodule:atom:end frame-the-experiment-as-a-given-when-then-question -->
<!-- vpmodule:atom:begin give-the-human-something-they-can-experience -->
---
instruction_id: give-the-human-something-they-can-experience
title: Give the human something they can experience
summary: The default artifact of an experiment is something a person can drive and feel; falling back to printed output is allowed only when the question is about a fact rather than a feeling.
capability_tags:
  - design-experiments
pattern_tags:
  - named-protagonist-journey
conditions_applies_when: An experiment is about to be built and its result has to be experienced by somebody.
conditions_does_not_apply_when: The experiment answers a pure fact that only a measurement can settle.
artifact_contract_output_type: experiential-artifact
artifact_contract_required_data:
  - the artifact
  - what the person can do with it
  - the fallback when it is a fact question
artifact_contract_verified_by: the person can drive the artifact unless the question is genuinely about a fact
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Give the human something they can experience
Default to giving the user something they can experience.
The bias should be toward building a simple UI or interactive demo
The user wants to *feel* the spike working, not just be told it works.
**Only fall back to stdout/CLI verification when the spike is genuinely about a fact, not a feeling:**
Pure data transformation where the answer is "yes it parses correctly"
Binary yes/no questions (does this API authenticate? does this library exist?)
Benchmark numbers (how fast is X? how much memory does Y use?)
When in doubt, build the UI. It takes a few extra minutes but produces a spike the user can actually demo and feel confident about.
<!-- vpmodule:atom:end give-the-human-something-they-can-experience -->
<!-- vpmodule:atom:begin keep-one-idea-per-key-and-never-mix-requirements -->
---
instruction_id: keep-one-idea-per-key-and-never-mix-requirements
title: Keep one idea per key and never mix requirements
summary: "Every piece of work carries one stable key; a continuation reuses its key, a new idea mints a new one, and the requirements of one idea never leak into another."
capability_tags:
  - model-domain-language
pattern_tags:
  - stable-identity
conditions_applies_when: Work is indexed under keys so that it can be found again later.
conditions_does_not_apply_when: The work is a one-off that will never be continued.
artifact_contract_output_type: keyed-requirements
artifact_contract_required_data:
  - the key
  - the idea it stands for
  - the requirements listed under it
artifact_contract_verified_by: "each key stands for exactly one idea and carries only that idea's requirements"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Keep one idea per key and never mix requirements
Reuse the exact same idea key for every spike in this session and any later session that continues the same idea.
Only mint a new idea key when the current idea is not a continuation of one already indexed in MANIFEST.md — never reuse an existing idea key for an unrelated idea, and never merge two different ideas under one key.
Never copy or merge requirements from a different idea key into this list.
When the user expresses a preference during spiking, add it to the current idea's Requirements list immediately — never to a different idea's list.
<!-- vpmodule:atom:end keep-one-idea-per-key-and-never-mix-requirements -->
<!-- vpmodule:atom:begin re-ground-on-the-shared-record-before-each-step -->
---
instruction_id: re-ground-on-the-shared-record-before-each-step
title: Re-ground on the shared record before each step
summary: "Before every step of a long session the shared record is read again, so the step cannot drift away from what the earlier steps established."
capability_tags:
  - curate-context
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A long session runs many steps against one shared record.
conditions_does_not_apply_when: The session is short enough that nothing can drift.
artifact_contract_output_type: re-grounding-check
artifact_contract_required_data:
  - the record that was re-read
  - the requirements it holds
  - the contradiction check
artifact_contract_verified_by: the record was re-read before the step and the step contradicts none of its requirements
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Re-ground on the shared record before each step
Before starting each spike (not just the first), re-read the manifest and the conventions to prevent drift within long sessions.
Check the current idea's Requirements list — make sure the spike doesn't contradict any established requirement for this idea. Do not apply another idea's requirements.
<!-- vpmodule:atom:end re-ground-on-the-shared-record-before-each-step -->
<!-- vpmodule:atom:begin skip-the-question-you-have-already-answered -->
---
instruction_id: skip-the-question-you-have-already-answered
title: Skip the question you have already answered
summary: "Before new work starts, the earlier results are read: answered questions are skipped, failed approaches are not repeated, and the prior findings are carried forward."
capability_tags:
  - curate-context
pattern_tags:
  - source-hierarchy
conditions_applies_when: New work starts in a space that earlier work already touched.
conditions_does_not_apply_when: Nothing relevant has been done before.
artifact_contract_output_type: prior-work-reuse
artifact_contract_required_data:
  - the questions already answered
  - the findings carried forward
  - the deviations from the conventions
artifact_contract_verified_by: no already-answered question was asked again and the prior findings were carried forward
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
  - operations
---

# Skip the question you have already answered
**Skip already-validated questions.** Note the prior spike number and move on.
**Build on prior findings.** Don't repeat failed approaches. Use their Research and Results sections.
**Reuse prior research.** Carry findings forward rather than re-researching.
**Follow established conventions.** Mention any deviation.
**Call out relevant prior art** when presenting the decomposition.
<!-- vpmodule:atom:end skip-the-question-you-have-already-answered -->