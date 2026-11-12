---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-run-md-981730f6-c01"
title: "bmad-method: skills/bmad-deep-recon/references/run.md module"
summary: "Carrier for 6 atomic instructions from bmad-method:skills/bmad-deep-recon/references/run.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/run.md\"}"
atom_ids:
  - gate-the-research-plan-on-one-approval
  - match-the-fan-out-shape-to-the-question
  - research-from-primary-sources
  - search-broad-first-then-narrow-as-the-shape-emerges
  - stop-a-dimension-on-coverage-or-novelty-exhaustion
  - stop-and-publish-what-you-have-when-the-run-overruns
atom_count: 6
atoms: "[{\"atom_id\":\"gate-the-research-plan-on-one-approval\",\"file_sha256\":\"6f0b03296c49da3e8aedbe3885eebb3a9488c087fb40526642d2bfb28c44ae67\",\"content_sha256\":\"baacf1872faaf717a0e5e5b359fd0b0a5d7b49d63bda22196e273a8ac5d3e9e6\",\"file_bytes\":1475,\"body_bytes\":374},{\"atom_id\":\"match-the-fan-out-shape-to-the-question\",\"file_sha256\":\"7dc7e5b8c69d0f8e5d1aed6c462162123d390911dd3c36e650d5464f067a797d\",\"content_sha256\":\"4cd6e2385d81dcfdc2a1ce8aeabafe417f267319895b7207ad5025f628198c1e\",\"file_bytes\":1656,\"body_bytes\":548},{\"atom_id\":\"research-from-primary-sources\",\"file_sha256\":\"37fb565b0ccf12d6ade68a29e3c9f62e135944aa3544dee07d52849f384961f0\",\"content_sha256\":\"697c69aa9cb8607cc31f51f0b53388f93bc3bc3e028a8204cae24a2c1a5241a6\",\"file_bytes\":2655,\"body_bytes\":1448},{\"atom_id\":\"search-broad-first-then-narrow-as-the-shape-emerges\",\"file_sha256\":\"ce9e59594b76b735e42e5a82f111dca7d0fbfccab135b80413692d3e516a1bfb\",\"content_sha256\":\"6e04f65d76dc3a026b48d0c7ba589c423eb1c7aa1d1d7afb843991be791db4b8\",\"file_bytes\":1720,\"body_bytes\":568},{\"atom_id\":\"stop-a-dimension-on-coverage-or-novelty-exhaustion\",\"file_sha256\":\"6cdcf83ccabf6035baed8bfbb35690e07092f565d73ef51434929dfaa2dce3f9\",\"content_sha256\":\"211e05ddb3aa5d791d636dc711104d834faaa31332741ae62c1fd06960d7374c\",\"file_bytes\":1557,\"body_bytes\":444},{\"atom_id\":\"stop-and-publish-what-you-have-when-the-run-overruns\",\"file_sha256\":\"57da7730212729ae8374268c3a6993e1ca37ebf834ea06f24bb356585cf3a91c\",\"content_sha256\":\"984f55e7aedde4efde0b03c8e1b14238ddbd023b4154f8b4b745820c52e21c72\",\"file_bytes\":1673,\"body_bytes\":507}]"
carrier_sha256: fee30c23241dfb56c7a6e042fdbe5b8f00584531943552fb377c80ca8d36bcf4
carrier_bytes: 11601
revision: 1
status: active
---
<!-- vpmodule:atom:begin gate-the-research-plan-on-one-approval -->
---
instruction_id: gate-the-research-plan-on-one-approval
title: Gate the research plan on one approval
summary: "One hard stop presents the plan as a short checklist — the decision, the dimensions, the knobs, the surfaces, the estimate — and waits for approval before any acquisition."
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A wide acquisition is about to start.
conditions_does_not_apply_when: The plan was already approved in this conversation.
artifact_contract_output_type: research-plan-gate
artifact_contract_required_data:
  - the checklist presented
  - the approval
  - the estimate given
artifact_contract_verified_by: no acquisition started before the checklist was approved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Gate the research plan on one approval
The one hard stop, kept light.
Present as a compact checklist, get approval, then:
- decision, type and pack-derived dimensions pruned to it
- shape
- knobs in force and where each came from
- which search surfaces exist
- an honest time estimate (a standard run is minutes; deep runs are tens of minutes and many times the tokens).
<!-- vpmodule:atom:end gate-the-research-plan-on-one-approval -->
<!-- vpmodule:atom:begin match-the-fan-out-shape-to-the-question -->
---
instruction_id: match-the-fan-out-shape-to-the-question
title: Match the fan-out shape to the question
summary: "Breadth-first splits the dimensions, depth-first splits the perspectives on one question, and a focused ask gets one worker — never more than it needs."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several workers could be started for a round.
conditions_does_not_apply_when: The round is a single focused lookup.
artifact_contract_output_type: fan-out-shape
artifact_contract_required_data:
  - the topology chosen
  - the split rule
  - the reason
artifact_contract_verified_by: the shape matches the shape of the question and no fan-out exceeds what the question needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# Match the fan-out shape to the question
Fan out researcher assistants for the round — concurrency per the resolved `subagents` level, split by the plan’s **topology**: breadth-first gives each assistant independent sub-questions; depth-first gives each a distinct perspective or methodology on the *same* question; straightforward is one assistant with a small budget — never fan out what one focused assistant answers.
- straightforward (a focused ask: one assistant, a handful of calls, no fan-out — never overinvest in a simple query)
<!-- vpmodule:atom:end match-the-fan-out-shape-to-the-question -->
<!-- vpmodule:atom:begin research-from-primary-sources -->
---
instruction_id: research-from-primary-sources
title: Research from primary sources
summary: "Investigate a question against primary sources, follow every claim back to the source that owns it, and record cited findings in one file."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A question needs facts that only the owning sources can supply.
conditions_does_not_apply_when: The answer is already known or a secondary summary suffices.
artifact_contract_output_type: cited-research
artifact_contract_required_data:
  - question
  - primary sources
  - cited findings
artifact_contract_verified_by: each claim carries its source and no claim rests on a secondary write-up
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/research/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Research from primary sources
Spin up a **background agent** with a fresh context window to do the research, so you keep working while it reads.
Its job:
1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.
Prefer **primary sources** — filings, regulator text, official documentation, original papers, a company’s own reported numbers — over aggregators and secondary reporting.
Red flags that downgrade confidence on sight: speculative language ("could", "may", projections in future tense presented as findings), marketing register, passive voice with unnamed sources, cherry-picked or unsourced numbers, and aggregators recycling a single upstream report (that’s one publisher, however many domains echo it).
Answer engines are aggregators too, however good the synthesis: chase their citations and cite those, never the engine.
- the source policy — the preferred sources named as sources to prefer, the banned sources as sources never to cite
Conflicts resolve by recency, consistency with adjacent established facts, and publisher quality — never by averaging.
<!-- vpmodule:atom:end research-from-primary-sources -->
<!-- vpmodule:atom:begin search-broad-first-then-narrow-as-the-shape-emerges -->
---
instruction_id: search-broad-first-then-narrow-as-the-shape-emerges
title: "Search broad first, then narrow as the shape emerges"
summary: "The first round maps the territory with short wide queries; afterwards broaden when results are sparse and narrow when they are abundant, and never repeat a query."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A round of acquisition is about to start.
conditions_does_not_apply_when: The exact source is already known and named.
artifact_contract_output_type: query-craft
artifact_contract_required_data:
  - the query form
  - the pause after each result
  - the next query
artifact_contract_verified_by: "queries broaden when results are sparse and narrow when they are abundant, and no query repeats"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Search broad first, then narrow as the shape emerges
Round 1 pursues the plan’s questions **broad-first**: short, wide queries to map what exists, narrowing as the shape emerges — not long specific queries that return nothing.
- short queries (roughly five words or fewer) beat hyper-specific ones that return nothing; broaden when results are sparse, narrow when abundant; never repeat an identical query on the same tool; after every tool result, pause and evaluate — what did this add, what gap remains, what’s the best next query — before firing again
<!-- vpmodule:atom:end search-broad-first-then-narrow-as-the-shape-emerges -->
<!-- vpmodule:atom:begin stop-a-dimension-on-coverage-or-novelty-exhaustion -->
---
instruction_id: stop-a-dimension-on-coverage-or-novelty-exhaustion
title: Stop a dimension on coverage or novelty exhaustion
summary: "A dimension ends when its questions are answered or when a full round brings nothing new, and the reason for stopping is stated."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A dimension has been worked through round by round.
conditions_does_not_apply_when: The dimension has not reached its round cap yet.
artifact_contract_output_type: stop-reason
artifact_contract_required_data:
  - the reason the dimension stopped
  - the open questions left
artifact_contract_verified_by: the stopping reason is named and no open question is dropped silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# Stop a dimension on coverage or novelty exhaustion
A dimension stops before its round cap when either holds:
- **Coverage** — its plan questions are answered, with the critical claims confirmed per the resolved `validation` level.
- **Novelty exhaustion** — a full round surfaced no new load-bearing claim or lead.
Say which one ended it. Hitting the round cap with open questions is reported as an open question, never silently dropped.
<!-- vpmodule:atom:end stop-a-dimension-on-coverage-or-novelty-exhaustion -->
<!-- vpmodule:atom:begin stop-and-publish-what-you-have-when-the-run-overruns -->
---
instruction_id: stop-and-publish-what-you-have-when-the-run-overruns
title: Stop and publish what you have when the run overruns
summary: "When the run drags past the estimate, the spawning stops and the report is written from the material already on disk, with the remainder reported as open questions."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: The run has overrun the estimate the gate gave.
conditions_does_not_apply_when: The run is inside its estimate.
artifact_contract_output_type: partial-report
artifact_contract_required_data:
  - the material the report was written from
  - the remainder and its route
artifact_contract_verified_by: the report was written from material on disk and the remainder is reported as open questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Stop and publish what you have when the run overruns
**Stop-and-write valve.** If the run is dragging well past the plan gate’s estimate — rounds queuing, budgets mostly spent — stop spawning, synthesize from the digests already on disk, and report the remainder as open questions with a route (a Deepen later, or a drafted prompt for the user’s own tool). A shorter honest report beats a longer stale one.
- the report grows as material lands: the user watches the document build, not a spinner.
<!-- vpmodule:atom:end stop-and-publish-what-you-have-when-the-run-overruns -->