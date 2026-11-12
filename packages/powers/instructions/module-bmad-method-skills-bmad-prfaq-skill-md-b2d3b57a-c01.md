---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-prfaq-skill-md-b2d3b57a-c01"
title: "bmad-method: skills/bmad-prfaq/SKILL.md module"
summary: "Carrier for 7 atomic instructions from bmad-method:skills/bmad-prfaq/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-prfaq/SKILL.md\"}"
atom_ids:
  - calibrate-the-questions-to-the-concept-type
  - capture-the-decisions-in-a-canonical-log
  - challenge-hard-and-offer-a-way-forward
  - delegate-the-input-scanning-and-merge-the-findings
  - ground-the-market-claims-in-current-data
  - run-without-asking-and-record-the-gaps
  - start-from-the-customer-not-the-solution
atom_count: 7
atoms: "[{\"atom_id\":\"calibrate-the-questions-to-the-concept-type\",\"file_sha256\":\"89348ea1f7c7fa296ee9843158fb14f22acbaa4fdd0efcb6aba4b019922bb526\",\"content_sha256\":\"9e83bf2c67a6fd032710deef078a8f9b2ebb219d54f649897e55bae2e5d8d853\",\"file_bytes\":2928,\"body_bytes\":1239},{\"atom_id\":\"capture-the-decisions-in-a-canonical-log\",\"file_sha256\":\"3f1c1ea9987f409b4d7c0eb8c41661a49886641f902044ff68d33f97bde39e43\",\"content_sha256\":\"097727efa96a4d6596b90ccc0bf3a82c9d98f7e11c7e0527755b6c7ef48ffe49\",\"file_bytes\":2410,\"body_bytes\":812},{\"atom_id\":\"challenge-hard-and-offer-a-way-forward\",\"file_sha256\":\"14cf769eab624b1583f3bbb9ab59b717570090a73e6c4d8f4bcaedd2c836b87f\",\"content_sha256\":\"82644a99bf8030cea643e25100a3707108ff380a051d5f174cf5910ae0f608d5\",\"file_bytes\":2024,\"body_bytes\":692},{\"atom_id\":\"delegate-the-input-scanning-and-merge-the-findings\",\"file_sha256\":\"b5102d7cae7da6e54993fd7479d54556669880269c8b05bd805e58511408203a\",\"content_sha256\":\"e26fbd2c17d6e613be2feab8c90d988fb43ce998005a49470bf7a5d57d0801d7\",\"file_bytes\":2365,\"body_bytes\":1071},{\"atom_id\":\"ground-the-market-claims-in-current-data\",\"file_sha256\":\"02b7047f224dda404399f904c16c46ec0c122ec7ab8d89bd426649a9c9898c46\",\"content_sha256\":\"bcd2a1007589f0d9a351e6270fee92fbbc77df8daf0a6ff74fcdccb05fa2337a\",\"file_bytes\":2102,\"body_bytes\":760},{\"atom_id\":\"run-without-asking-and-record-the-gaps\",\"file_sha256\":\"6d7661045feaf5f007781fff9077586951b477e2cef309de476f2e4c064ca293\",\"content_sha256\":\"50c972f3d14552f2dae1592ba795ea55378b4d154de1081cbeef70c60c82dfbf\",\"file_bytes\":4271,\"body_bytes\":2159},{\"atom_id\":\"start-from-the-customer-not-the-solution\",\"file_sha256\":\"846ab70c8eff6ff9af537253d376aba22fd8740995234ea15f733884aa9d297c\",\"content_sha256\":\"ef494c069f8d0d9f8a045a7f4c3cba65f438c49138262fd290e34c05e94cf2dd\",\"file_bytes\":2318,\"body_bytes\":1085}]"
carrier_sha256: 284f2ec65dd1cd7c6487f8707d59dcca9be438910cd9e25a7d1ad6a976d6753f
carrier_bytes: 19401
revision: 1
status: active
---
<!-- vpmodule:atom:begin calibrate-the-questions-to-the-concept-type -->
---
instruction_id: calibrate-the-questions-to-the-concept-type
title: Calibrate the questions to the concept type and the context
summary: "Detect whether the concept is a commercial product, an internal tool, an open-source project or a community initiative and frame the questions for that kind of thing; the structure stays, the language shifts."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The questions to ask depend on what kind of thing is being built and who is building it.
conditions_does_not_apply_when: The concept type and the context are already fixed and known.
artifact_contract_output_type: calibrated-question-set
artifact_contract_required_data:
  - the detected concept type
  - the substituted framing
artifact_contract_verified_by: no question asks for unit economics of a non-commercial project or for board alignment of a weekend project
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/press-release.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/customer-faq.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/internal-faq.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - business
---

# Calibrate the questions to the concept type and the context
Concept type detection: Early in the conversation, identify whether this is a commercial product, internal tool, open-source project, or community/nonprofit initiative.
Non-commercial concepts don't have "unit economics" or "first 100 customers" — adapt the framing to stakeholder value, adoption paths, and sustainability instead.
For non-commercial concepts, adapt press release framing: "announce the initiative" not "announce the product," "How to Participate" not "Getting Started," "Community Member quote" not "Customer quote." The structure stays — the language shifts to match the audience.
Calibrate to concept type. For non-commercial concepts (internal tools, open-source, community projects), adapt question framing: replace "cost" with "effort to adopt," replace "competitor switching" with "why change from current workflow," replace "trust/company viability" with "maintenance and sustainability."
Calibrate questions to context. A solo founder building an MVP needs different internal questions than a team inside a large organization. Don't ask about "board alignment" for a weekend project. Don't ask about "weekend viability" for an enterprise product.
<!-- vpmodule:atom:end calibrate-the-questions-to-the-concept-type -->
<!-- vpmodule:atom:begin capture-the-decisions-in-a-canonical-log -->
---
instruction_id: capture-the-decisions-in-a-canonical-log
title: Capture the decisions in a canonical log
summary: Capture; do not author. Every decision and every piece of context that does not fit the deliverable is appended to a canonical log that is never hand-edited; a resume reloads it and the document is distilled from it.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The work outlives one context window and the deliverable is distilled at the end.
conditions_does_not_apply_when: The work fits in a single exchange and the deliverable is written once.
artifact_contract_output_type: capture-log
artifact_contract_required_data:
  - the decisions and their kind
  - the out-of-band context
artifact_contract_verified_by: "the log holds every decision, was never hand-edited, and the deliverable is distilled from it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/press-release.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/verdict.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Capture the decisions in a canonical log
Capture; do not author.
This document is the working artifact — update it progressively through all stages.
The spines are distilled at Finalize toward the memlog.
Decisions → `.memlog.md` (canonical)
— never hand-edited; a resume reloads it.
Throughout the process, you captured context beyond what fits in the deliverable.
Before moving on, append a brief block to the output document capturing key contextual observations from this stage: rejected headline framings, competitive positioning discussed, differentiators explored but not used, and any out-of-scope details the user mentioned (technical constraints, timeline, team context).
These notes survive context compaction
Offer to resume rather than starting over.
Surface conflicts with prior decisions.
<!-- vpmodule:atom:end capture-the-decisions-in-a-canonical-log -->
<!-- vpmodule:atom:begin challenge-hard-and-offer-a-way-forward -->
---
instruction_id: challenge-hard-and-offer-a-way-forward
title: Challenge hard and offer a way forward
summary: "Coach the concept directly: the questions are hard and vague answers get challenged, but a stuck person gets concrete suggestions and alternatives to react to. The goal is to strengthen the concept, not to gatekeep it."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - requirements-clarification
conditions_applies_when: The concept is being stress-tested with the person who owns it.
conditions_does_not_apply_when: The exchange is a mechanical step with no judgement to exercise.
artifact_contract_output_type: coaching-exchange
artifact_contract_required_data:
  - the challenge raised
  - the concrete alternatives offered
artifact_contract_verified_by: "every challenge is followed by a concrete way forward, never by silence"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/press-release.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
---

# Challenge hard and offer a way forward
The coaching is direct, the questions are hard, and vague answers get challenged.
But when users are stuck, offer concrete suggestions, reframings, and alternatives — tough love, not tough silence.
The goal is to strengthen the concept, not to gatekeep it.
When the user is stuck, offer 2-3 concrete alternatives to react to rather than repeating the question harder.
Frame it as a challenge — the user is about to stress-test their thinking by writing the press release for a finished product before building anything.
Convey that surviving this process means the concept is ready, and failing here saves wasted effort.
Be direct and energizing.
<!-- vpmodule:atom:end challenge-hard-and-offer-a-way-forward -->
<!-- vpmodule:atom:begin delegate-the-input-scanning-and-merge-the-findings -->
---
instruction_id: delegate-the-input-scanning-and-merge-the-findings
title: Delegate the input scanning and merge the findings
summary: "Do not read the person own files; collect the paths, fan the scanners out in parallel with the product intent, degrade gracefully when no subagent is available, and merge the findings back, surfacing anything that challenges the assumptions."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "The person has documents, research or other material that has to be brought in."
conditions_does_not_apply_when: There is no material to bring in.
artifact_contract_output_type: gathered-context
artifact_contract_required_data:
  - the paths collected
  - the scanner findings
  - what challenged the assumptions
artifact_contract_verified_by: the material was read by the scanners and the surprising findings were surfaced before the work continued
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - business
  - research
---

# Delegate the input scanning and merge the findings
Ask the user whether they have existing documents, research, brainstorming, or other materials to inform the PRFAQ. Collect paths for subagent scanning. When a ticket exists for this concept (`initiative-*.md`, `tickets/epic-*/epic-*.md`, older `SPEC*.md`), read it yourself, first and in full, and treat its Requirements as settled; every other file is the Artifact Analyzer's job.
Fan out subagents in parallel.
## Artifact Analyzer
For relevant documents, plus any user-provided paths. Receives the product intent summary so it knows what's relevant. It skips ticket files: the parent reads those.
## Web Researcher
Searches for competitive landscape, market context, and current industry data relevant to the concept.
Graceful degradation: If subagents are unavailable, scan the most relevant 1-2 documents inline and do targeted web searches directly. Never block the workflow.
Merge findings with what the user shared. Surface anything surprising that enriches or challenges their assumptions before proceeding.
<!-- vpmodule:atom:end delegate-the-input-scanning-and-merge-the-findings -->
<!-- vpmodule:atom:begin ground-the-market-claims-in-current-data -->
---
instruction_id: ground-the-market-claims-in-current-data
title: Ground the market claims in current data
summary: "Verify every competitive, market and feasibility claim against current real-world data: identify the search angles, run three to five targeted searches, and synthesise the signal instead of listing links."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: "The deliverable makes competitive, market or feasibility claims."
conditions_does_not_apply_when: The deliverable makes no market claim.
artifact_contract_output_type: market-research
artifact_contract_required_data:
  - the search angles
  - the searches that were run
  - the synthesised signal
artifact_contract_verified_by: "no competitive, market or feasibility claim rests on an assumption instead of current data"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/agents/web-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - business
  - research
---

# Ground the market claims in current data
All competitive, market, and feasibility claims in the output must be verified against current real-world data.
Proactively research to fill knowledge gaps — the user deserves a document informed by today's landscape, not yesterday's assumptions.
Identify search angles based on the product intent:
Direct competitors (products solving the same problem)
Adjacent solutions (different approaches to the same pain point)
Market size and trends for the domain
Industry news or developments that create opportunity or risk
User sentiment about existing solutions (what's frustrating people)
Execute 3-5 targeted web searches — quality over quantity.
Synthesize findings — don't just list links. Extract the signal.
<!-- vpmodule:atom:end ground-the-market-claims-in-current-data -->
<!-- vpmodule:atom:begin run-without-asking-and-record-the-gaps -->
---
instruction_id: run-without-asking-and-record-the-gaps
title: Run without asking and record the gaps
summary: "Without a live person: do not ask and do not greet, infer what you can into assumptions, route every gap that needs a human decision into open questions, and never invent a persona, a brand, an accessibility rule or a scope."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The run is unattended or driven by an automation context.
conditions_does_not_apply_when: A person is present and can answer.
artifact_contract_output_type: headless-result
artifact_contract_required_data:
  - the status
  - the assumptions
  - the open questions
artifact_contract_verified_by: "the status is complete, partial or blocked and every gap is listed as an open question"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/references/headless.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/customer-faq.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/internal-faq.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/manager.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project/steps/auto-mode-detection.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project/steps/auto-mode-config.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Run without asking and record the gaps
Headless when any of:
caller sets `headless: true` (or harness equivalent)
invocation is from another skill or non-interactive runner
first message is an automation context pre-supplying inputs
Ambiguous → default interactive.
Do not ask. Do not greet.
Validate the input schema only
— except a ticket under `{output_folder}/{active_initiative}/`, which you read in full.
— do not read any other referenced files or documents yourself.
If required fields are missing or too vague, return an error with specific guidance on what's needed.
Complete the intent from what's provided, what exists in the workspace, or what you can discover.
If intent stays ambiguous after inference, halt with `status: "blocked"` and a one-sentence `reason`.
"complete" — stands on its own.
"partial" — artifact produced but `open_questions[]` non-empty or critical inputs inferred.
"blocked" — no artifact produced.
Inferences → `assumptions[]`. Gaps needing a human decision → `open_questions[]`. Do not invent persona, brand, accessibility, or scope detail.
Flag answers with low confidence so a human can review.
Flag high-risk areas and unknowns prominently.
Creative tools default off in headless. Caller can override; artifacts land in `.working/` and are not promoted unless the caller signals.
`intent` — "create", "update", or "validate". If absent, infer from the artifact set.
End with the JSON response. `intent` reflects detected intent. Omit keys for artifacts not produced.

An unattended run needs its input up front: without the document, return an error with the usage instead of starting the work.
In an unattended run, decide autonomously from the project context. If you hit a blocker, record it and stop.
Never work around a permission or access error - let it fail so it can be surfaced with resolution hints.
Auto mode requires an idea document — either:
Auto-include all table stakes features (users expect these)
Include features explicitly mentioned in provided document
Auto-defer differentiators not mentioned in document
Requirements approval: Auto-approve
Roadmap approval: Auto-approve
<!-- vpmodule:atom:end run-without-asking-and-record-the-gaps -->
<!-- vpmodule:atom:begin start-from-the-customer-not-the-solution -->
---
instruction_id: start-from-the-customer-not-the-solution
title: "Start from the customer, not the solution"
summary: "Redirect a solution-first or technology-first pitch to the customer problem, and capture the customer, the problem, the stakes and the first solution idea before anything else is drafted."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - requirements-clarification
conditions_applies_when: "A concept arrives as a solution, a technology, or a vague idea."
conditions_does_not_apply_when: "The customer, the problem, the stakes and the solution concept are already known."
artifact_contract_output_type: concept-brief
artifact_contract_required_data:
  - the customer persona
  - the problem
  - the stakes
  - the initial solution concept
artifact_contract_verified_by: the four essentials are captured before the announcement is drafted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - business
  - product
  - research
---

# Start from the customer, not the solution
If the user leads with a solution ("I want to build X"): redirect to the customer's problem. Don't let them skip the pain.
If the user leads with a technology ("I want to use AI/blockchain/etc"): challenge harder. Technology is a "how", not a "why" — push them to articulate the human problem. Strip away the buzzword and ask whether anyone still cares.
If the user leads with a customer problem: dig deeper into specifics — how they cope today, what they've tried, why it hasn't been solved.
Essentials to capture before progressing:
Who is the customer/user? (specific persona, not "everyone")
What is their problem? (concrete and felt, not abstract)
Why does this matter to them? (stakes and consequences)
What's the initial concept for a solution? (even rough)
Fast-track: If the user provides all four essentials in their opening message (or via structured input), acknowledge and confirm understanding, then move directly to document creation
If after 2-3 exchanges the user can't articulate a customer or problem, don't force it.
<!-- vpmodule:atom:end start-from-the-customer-not-the-solution -->