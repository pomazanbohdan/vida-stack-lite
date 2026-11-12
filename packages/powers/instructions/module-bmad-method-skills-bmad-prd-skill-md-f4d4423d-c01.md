---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-prd-skill-md-f4d4423d-c01"
title: "bmad-method: skills/bmad-prd/SKILL.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-prd/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-prd/SKILL.md\"}"
atom_ids:
  - account-for-every-log-entry-before-closing
  - calibrate-the-rigor-to-the-stakes
  - capture-the-journeys-the-user-narrates
  - extract-the-sources-instead-of-ingesting-them
  - give-requirements-stable-ids-and-cross-reference-them
  - hand-the-pen-back
  - name-the-concerns-the-product-actually-carries
  - name-the-counter-metric-beside-the-metric
atom_count: 8
atoms: "[{\"atom_id\":\"account-for-every-log-entry-before-closing\",\"file_sha256\":\"711b29b0199ff62c715748b3e28d494697f80453b795816443dda122a86762a1\",\"content_sha256\":\"aff578aa32c7807da0a84b78b792dc194fa3ba58f36f5d855a1547047b755805\",\"file_bytes\":1572,\"body_bytes\":345},{\"atom_id\":\"calibrate-the-rigor-to-the-stakes\",\"file_sha256\":\"4d1a82ddfef18016ce91d77797d8ba7e49ac90ded3dcc3a343307a12551fea4a\",\"content_sha256\":\"7c37a98510e33bc5d2fc864671a6542dbeb52b27516c02408bd67a8771e54bd6\",\"file_bytes\":2615,\"body_bytes\":1253},{\"atom_id\":\"capture-the-journeys-the-user-narrates\",\"file_sha256\":\"0c056b7a22781cf7a7622ae7e286b4466bc52531358c223b6af84de1de5682fc\",\"content_sha256\":\"bbdd21d87ac808b9382e0c42f318c0b9f9fede483424fd86cbf94a0775d73130\",\"file_bytes\":2460,\"body_bytes\":1106},{\"atom_id\":\"extract-the-sources-instead-of-ingesting-them\",\"file_sha256\":\"f0d3c7ba3d9b9e20db598dbd662ad118c6ab55b0909ca0fff7840026d6e6325a\",\"content_sha256\":\"a26ca9b4bf10f0781258f95a9d15fb233492407b314013e003853a9b8e420c10\",\"file_bytes\":2081,\"body_bytes\":893},{\"atom_id\":\"give-requirements-stable-ids-and-cross-reference-them\",\"file_sha256\":\"289eaced4f61067f8419965354faa8428a39609050a75bebf81b1b061ee15f66\",\"content_sha256\":\"edcf4cc1617922e49c78bc99a1208dff0c37265222fb3f1dc1055741faa3ad34\",\"file_bytes\":1869,\"body_bytes\":581},{\"atom_id\":\"hand-the-pen-back\",\"file_sha256\":\"4708823d8a4caebe8245ae6995eaee5f64fc562fa6bf82924db2e03abc24474f\",\"content_sha256\":\"87765b8a1142f594e959e908304d147263c987c7c3725c8b5f79414cf9318646\",\"file_bytes\":1982,\"body_bytes\":735},{\"atom_id\":\"name-the-concerns-the-product-actually-carries\",\"file_sha256\":\"10a8ce501ae2eaaceec29896b99cd80a4a5b6f2df0545cbb39a08390ec5af124\",\"content_sha256\":\"c7fe243a79bac9a94f6cc01550c1ea7d280adcebac7abdc29574a6f1ee8b7896\",\"file_bytes\":1649,\"body_bytes\":500},{\"atom_id\":\"name-the-counter-metric-beside-the-metric\",\"file_sha256\":\"53d7ed2d7c89da29ef5bab48489fbf4361602b5a0e03f290bcb2e86b3f869bcf\",\"content_sha256\":\"dfb44821ec1accbc0e6f5191f5c65caff243ee6b7ec65612c3a0fef8f1db833a\",\"file_bytes\":1866,\"body_bytes\":545}]"
carrier_sha256: bc3218f8831794c80b6682e587043952e62a176c77dd925c535bbccc2ab39848
carrier_bytes: 17187
revision: 1
status: active
---
<!-- vpmodule:atom:begin account-for-every-log-entry-before-closing -->
---
instruction_id: account-for-every-log-entry-before-closing
title: Account for every log entry before closing
summary: "Before the run closes, walk the log with the owner and account for every meaningful entry: in the document, in the addendum, or set aside as process noise."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A run is about to close and its log holds the decisions that were taken.
conditions_does_not_apply_when: The run is still going and the log is still growing.
artifact_contract_output_type: log-accounting
artifact_contract_required_data:
  - each meaningful entry
  - where it landed
  - what was set aside
artifact_contract_verified_by: no meaningful entry is left unaccounted for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Account for every log entry before closing
Audit the log.
Walk the log with the user;
each entry captured in PRD, in addendum, or set aside.
The user ends this step with an explicit, shared accounting of how the meaningful contents of
the log
were handled — captured in the document, captured in the addendum, or set aside as process noise.
<!-- vpmodule:atom:end account-for-every-log-entry-before-closing -->
<!-- vpmodule:atom:begin calibrate-the-rigor-to-the-stakes -->
---
instruction_id: calibrate-the-rigor-to-the-stakes
title: Calibrate the rigor to the stakes
summary: "Ask one short stakes question and let it set the document’s depth, its length and how many open items it may carry."
capability_tags:
  - clarify-requirements
pattern_tags:
  - stakes-calibrated-rigor
conditions_applies_when: A document is being scoped and the stakes are not yet known.
conditions_does_not_apply_when: The stakes are already fixed by an agreement.
artifact_contract_output_type: stakes-calibration
artifact_contract_required_data:
  - the stakes level
  - the depth and the length it sets
  - the open-item density it tolerates
artifact_contract_verified_by: the length and the rigour of the document follow the stated stakes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/prd-validation-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - business
---

# Calibrate the rigor to the stakes
Stakes calibration. One short probe before working mode: hobby / internal / launch — enough to calibrate rigor and section depth.
Audience, Existing inputs, and Downstream depth fill in inside the chosen mode, not upstream of the choice.
Length scales with stakes. Hobby / solo PRDs aim for about two pages. Internal tools land around five to eight. Launch and chain-top PRDs run as long as their FRs and concerns require.
Right-size to purpose. A passion project does not need investor-grade rigor. A VC pitch input does. Read the room.
Get a read on stakes early (passion project, internal pitch, investor input, public launch), and let that calibrate how hard you push.
Most PRDs do not need every dimension scrutinized equally. Calibrate to the agreed stakes, the PRD's shape (consumer product, internal tool, regulatory update, technical capability spec), and what the PRD itself is trying to do.
Stakes-calibrated — hobby/solo may run quietly or skip; higher stakes get the explicit all/subset/skip menu.
Open-items density: count Open Questions + `[ASSUMPTION]` + `[NOTE FOR PM]` callouts relative to stakes. High counts on a low-stakes PRD is fine; high counts on a green-light-to-build PRD is a blocker.
<!-- vpmodule:atom:end calibrate-the-rigor-to-the-stakes -->
<!-- vpmodule:atom:begin capture-the-journeys-the-user-narrates -->
---
instruction_id: capture-the-journeys-the-user-narrates
title: Capture the journeys the user narrates
summary: "Ask the owner to narrate a real session with a named protagonist and structure the answer, instead of writing the journey yourself."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: The product has journeys worth capturing and the owner is present to narrate them.
conditions_does_not_apply_when: "The product is an internal tool with a single operator, a regulatory-only update or a hobby build with no user-facing flow."
artifact_contract_output_type: user-journeys
artifact_contract_required_data:
  - the named protagonist
  - "the entry state, path, climax and resolution"
  - the edge case
artifact_contract_verified_by: each journey is a named scene the owner narrated and not one the agent invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/prd-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - product
---

# Capture the journeys the user narrates
User Journeys are captured, not authored.
When UJs are warranted (consumer / multi-stakeholder B2B / meaningful UX — drop or downscale for internal tooling with a single operator role, regulatory-only updates, hobby/solo, pure technical PRDs), prompt the user to narrate a real session with a named protagonist (Mary, mom of three — not "the user") — what the person does, in what order, where it lands — then structure the answer into UJ-N form and confirm.
Persona context lives inline at the moments that matter; no standalone persona section.
Default shape: a named scene with entry state, path, climax, and resolution.
Each beat forces specificity the team would otherwise leave implicit — auth assumptions, screen order, what tells the user value landed.
Persona + context: one line, grounded enough to explain the *why*.
Entry state: authenticated? which surface? coming from where?
Path: 3-5 concrete beats — taps, screens, decisions.
Climax: the moment value is delivered and how the user knows.
Resolution: state they're left in, what's next.
<!-- vpmodule:atom:end capture-the-journeys-the-user-narrates -->
<!-- vpmodule:atom:begin extract-the-sources-instead-of-ingesting-them -->
---
instruction_id: extract-the-sources-instead-of-ingesting-them
title: Extract the sources instead of ingesting them
summary: Send the source documents to subagents for extraction against the owner’s stated focus and assemble the document from the extracts.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: The run has source documents that have to be read.
conditions_does_not_apply_when: No subagent is available to do the extraction.
artifact_contract_output_type: source-extracts
artifact_contract_required_data:
  - the extracts
  - the focus each extraction ran against
artifact_contract_verified_by: no source document was loaded wholesale into the working context
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Extract the sources instead of ingesting them
Extract, don't ingest. Source documents go to subagents for extraction; the parent assembles from extracts.
Only load source documents into the parent context wholesale when no subagents are available.
The ticket file is the exception: the parent reads it in full, never as an extract.
Source artifacts (provided by the user or discovered during the run — transcripts, brainstorms, research reports, code, web results, prior briefs) enter the parent conversation as relevance-filtered extracts, not loaded wholesale.
Subagents do the extraction against the user's stated focus; the parent context stays lean.
Research subagents (default). During Discovery, spawn web-research subagents to ground the picture: what exists in the space, how comparables position themselves, current landscape. Subagent does the search; parent receives a digest.
<!-- vpmodule:atom:end extract-the-sources-instead-of-ingesting-them -->
<!-- vpmodule:atom:begin give-requirements-stable-ids-and-cross-reference-them -->
---
instruction_id: give-requirements-stable-ids-and-cross-reference-them
title: Give the requirements stable ids and cross-reference them
summary: "Number the requirements, the journeys and the metrics globally and reference them by id, so the references survive a reorganization of the document."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: "A requirements document carries numbered requirements, journeys or metrics."
conditions_does_not_apply_when: The document has no numbered elements.
artifact_contract_output_type: identifier-scheme
artifact_contract_required_data:
  - the identifiers
  - the cross-references
  - the source the ids were mirrored from
artifact_contract_verified_by: every id is unique and contiguous and every cross-reference resolves
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/prd-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Give the requirements stable ids and cross-reference them
Features grouped; FRs nested with globally numbered stable IDs.
Numbered globally as UJ-1 through UJ-N. FRs reference journeys by ID inline ("realizes UJ-3"); SMs may also cross-reference.
Each SM cross-references the FR(s) it validates.
FRs are numbered globally (FR-1 through FR-N) so downstream artifacts have stable references even if features get reorganized.
Reference user journeys by ID inline ("realizes UJ-2") where the chain matters.
If a UX doc already exists, mirror its UJ IDs here and point to the source.
<!-- vpmodule:atom:end give-requirements-stable-ids-and-cross-reference-them -->
<!-- vpmodule:atom:begin hand-the-pen-back -->
---
instruction_id: hand-the-pen-back
title: Hand the pen back
summary: "Draw the owner’s vision out instead of supplying it: elicit, do not author, and never name the cuts yourself."
capability_tags:
  - clarify-requirements
pattern_tags:
  - elicitation-boundary
conditions_applies_when: A document is being drafted with a human owner who still holds the vision.
conditions_does_not_apply_when: The owner handed over a finished input and asked for a distillation of it.
artifact_contract_output_type: elicitation-boundary
artifact_contract_required_data:
  - the questions that pulled the vision out
  - the point where the agent stopped and handed the pen back
artifact_contract_verified_by: the content of the document came from the owner’s answers and not from the agent’s proposals
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Hand the pen back
Fight the urge to do the thinking for them unless they put you into Fast path.
You are not in a hurry. You will not do the thinking for them.
Coach, do not quiz.
Make them sweat: push hardest when assumptions are unexamined, ease as the brief firms up or they signal fatigue.
Push back when an answer is thin.
Discovery pulls the user's vision out; it does not insert yours.
Open-ended "tell me about X" beats multiple choice.
When you find yourself naming wedges, picking MVP cuts, or proposing phases, stop — you have crossed from elicitation into authoring.
Hand the pen back.
Infer-and-confirm ("I'm assuming X works like Y — right?") is fine; quizzing the user through a tree of LLM-shaped choices is not.
<!-- vpmodule:atom:end hand-the-pen-back -->
<!-- vpmodule:atom:begin name-the-concerns-the-product-actually-carries -->
---
instruction_id: name-the-concerns-the-product-actually-carries
title: Name the concerns the product actually carries
summary: Read the material for the real concerns of this product and let them decide which sections the document needs.
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: The sources have been read and the sections of the document are being chosen.
conditions_does_not_apply_when: The sections of the document are already fixed.
artifact_contract_output_type: concern-list
artifact_contract_required_data:
  - the concerns that were named
  - the section each concern pulled in or invented
artifact_contract_verified_by: every concern either pulled in a section or was named as a section of its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
  - business
  - operations
---

# Name the concerns the product actually carries
Concern scan. As you read what the user gave you, name the concerns this product actually carries — compliance, integration density, operational SLAs, hardware constraints, public-API contracts, monetization, data governance, whatever applies.
The list is open; recognize what's there, do not classify into a fixed shape.
These concerns drive which template sections to pull in from the Adapt-In Menu and which to invent when no cluster names them.
<!-- vpmodule:atom:end name-the-concerns-the-product-actually-carries -->
<!-- vpmodule:atom:begin name-the-counter-metric-beside-the-metric -->
---
instruction_id: name-the-counter-metric-beside-the-metric
title: Name the counter-metric beside the metric
summary: "Whenever the document names success metrics, name the counter-metric that stops the wrong thing from being optimized."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A document states success metrics.
conditions_does_not_apply_when: The document states no success metrics.
artifact_contract_output_type: metric-set
artifact_contract_required_data:
  - the metric
  - the counter-metric
  - what the counter-metric balances
artifact_contract_verified_by: every primary and secondary metric has the counter-metric that balances it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/prd-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/assets/brief-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - business
---

# Name the counter-metric beside the metric
Counter-metrics named when Success Metrics exist.
Counter-metrics counterbalance specific primary or secondary metrics.
Counter-metrics (do not optimize)
SM-C1: Metric — why this should *not* be optimized. Counterbalances SM-1.
Counter-metrics are as load-bearing as primary metrics — they prevent the architect from optimizing the wrong thing and the dev from gaming the wrong target.
Success Criteria
How we know this is working. Mix of user success signals and business objectives. Measurable.
<!-- vpmodule:atom:end name-the-counter-metric-beside-the-metric -->