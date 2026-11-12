---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-skill-md-1e0cab09-c01"
title: "bmad-method: skills/bmad-deep-recon/SKILL.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-deep-recon/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/SKILL.md\"}"
atom_ids:
  - cite-the-publisher-and-the-dates-on-every-claim
  - honour-an-explicit-choice-and-infer-only-the-rest
  - keep-an-append-only-claims-ledger
  - keep-project-context-out-of-the-evidence
  - never-conclude-from-training-data
  - never-fabricate-research
  - offer-to-resume-existing-work-instead-of-duplicating-it
  - open-the-floor-before-structured-questions
atom_count: 8
atoms: "[{\"atom_id\":\"cite-the-publisher-and-the-dates-on-every-claim\",\"file_sha256\":\"013243b1ed4107af745405656acb4103bd47e82064faacadaaea89f73a5712a1\",\"content_sha256\":\"3d84411d31cd3515bf86f44facc6b46819cf6b664148b1cf87f27fc50ccf96d4\",\"file_bytes\":1579,\"body_bytes\":319},{\"atom_id\":\"honour-an-explicit-choice-and-infer-only-the-rest\",\"file_sha256\":\"6e9901851a0698f60f1b32c7014d4d0adf9163bde242678a68b20e36a37c2e80\",\"content_sha256\":\"3d2e05b3ce0721422397e42e08e0c25a3ae9d6175db8cc8685513606c6d60efb\",\"file_bytes\":2028,\"body_bytes\":719},{\"atom_id\":\"keep-an-append-only-claims-ledger\",\"file_sha256\":\"20da0c02149498ab9df199946983e05e3e5470ef31fa1859a2f215c4151a3e03\",\"content_sha256\":\"560118d558caf8c1d336af926551aeb3fdea043262b898cbe78113bd1db36ce4\",\"file_bytes\":2295,\"body_bytes\":926},{\"atom_id\":\"keep-project-context-out-of-the-evidence\",\"file_sha256\":\"d9b2756d187a10ebc560b71c4d1b887ef920def0a23029066c17b401c7635e73\",\"content_sha256\":\"372d00a010ea7ddb00a41b1b5db02abbc19b00f5b48bb03d002bd04673e37a74\",\"file_bytes\":2440,\"body_bytes\":1050},{\"atom_id\":\"never-conclude-from-training-data\",\"file_sha256\":\"bbc48081cdf1a07e644e16d532dd353fd4b195d71d08b3918c5d60d647089edb\",\"content_sha256\":\"96c3c86b86a815a281fc15022fd050feaa8e54dbccd42b9fd4d03029258e7dff\",\"file_bytes\":2991,\"body_bytes\":1477},{\"atom_id\":\"never-fabricate-research\",\"file_sha256\":\"9d3ce0dfa03d307ba5e46245eb03b34511126eff1c46ae41182b130f39cb0c2c\",\"content_sha256\":\"974774080e52332b85f3e9c99cb6a82bccaecfa0f9a6ed4975a667cd1bc2ea32\",\"file_bytes\":1283,\"body_bytes\":251},{\"atom_id\":\"offer-to-resume-existing-work-instead-of-duplicating-it\",\"file_sha256\":\"5091faabb2b6339c90c7ee6154acfb5697588f14359aed94bbea22849513112d\",\"content_sha256\":\"2f7d6f328106920c87ae2a99cbc91940bf0b61eb4dccfe946ce957965cd9cb05\",\"file_bytes\":1821,\"body_bytes\":484},{\"atom_id\":\"open-the-floor-before-structured-questions\",\"file_sha256\":\"a14c3b5f558fa71b195480753c1cc231257da1e3837376e50b0f268fc2a8de65\",\"content_sha256\":\"31d9cf1b7defbf482bedea85b8c1a1cea281bdef9587bc1c18f1cf56900c0267\",\"file_bytes\":2054,\"body_bytes\":784}]"
carrier_sha256: 67f328b5a1a511f3601fca8d9e3481bcf75c58764a97346c491f1b5c5a39b4da
carrier_bytes: 17600
revision: 1
status: active
---
<!-- vpmodule:atom:begin cite-the-publisher-and-the-dates-on-every-claim -->
---
instruction_id: cite-the-publisher-and-the-dates-on-every-claim
title: Cite the publisher and the dates on every claim
summary: "A claim carries its publisher, its publication date and its access date; a number with no source behind it is not a claim."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A claim is about to be written down as a finding.
conditions_does_not_apply_when: The statement is a description of the artefact in front of you rather than a claim about the world.
artifact_contract_output_type: sourced-claim
artifact_contract_required_data:
  - the claim
  - the publisher
  - the publication date
  - the access date
artifact_contract_verified_by: no claim is published without its publisher and its dates
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Cite the publisher and the dates on every claim
**A claim is a sentence with a source.** Publisher, publication date, access date. No naked numbers.
- findings as claims, each with `{claim, source, publisher, pub_date, accessed, confidence, class}`, plus leads worth chasing and what it looked for and could not find
<!-- vpmodule:atom:end cite-the-publisher-and-the-dates-on-every-claim -->
<!-- vpmodule:atom:begin honour-an-explicit-choice-and-infer-only-the-rest -->
---
instruction_id: honour-an-explicit-choice-and-infer-only-the-rest
title: Honour an explicit choice and infer only the rest
summary: "A forwarded intent, type or pre-resolved setting is used verbatim; inference fills the values that were not given, and a genuinely ambiguous case is confirmed."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The caller supplied a value that pins part of the work.
conditions_does_not_apply_when: Nothing was supplied and the work is free to choose its own shape.
artifact_contract_output_type: honoured-choice
artifact_contract_required_data:
  - the values supplied
  - the values inferred
  - the ambiguity confirmed
artifact_contract_verified_by: no supplied value was overridden and no unambiguous case was confirmed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/autonomous/steps/converge-fail-fast.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Honour an explicit choice and infer only the rest
**Forwarded activation:** if a caller invoked you with a stated intent, research type, or pre-resolved customization fields
- honor them verbatim — skip your own inference for those values and resolve only the rest.
Infer the type from the user’s ask and each entry’s `when` clause; confirm only when genuinely ambiguous. An explicit type (argument, shim, menu) wins without discussion.
An explicit flag on the command line overrides the configuration gate for that run.
Do not attempt to set the gate on the operator behalf, and do not downgrade to the non-converge path: silently changing the plan-review contract is the outcome this step must never produce.
<!-- vpmodule:atom:end honour-an-explicit-choice-and-infer-only-the-rest -->
<!-- vpmodule:atom:begin keep-an-append-only-claims-ledger -->
---
instruction_id: keep-an-append-only-claims-ledger
title: Keep an append-only claims ledger
summary: "Every decision, source batch, load-bearing claim, plan change and assumption is one append-only line; a status change is a new line, never an edit."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A run spans several steps and the state of its claims must survive a break.
conditions_does_not_apply_when: The work is one action with a single claim.
artifact_contract_output_type: claims-ledger
artifact_contract_required_data:
  - the ledger lines
  - the claim status carried by each line
artifact_contract_verified_by: a changed status is a new line with the same reference and the last status wins
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/verification.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/process.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Keep an append-only claims ledger
**The memlog is the process memory.**
- Every decision, source batch, load-bearing claim, plan change, and assumption is one append-only line
The memlog `claim` entries are the ledger: every claim a decision could rest on, with its class (each pack names its classes — quantitative sizes, pricing, versions/compatibility, regulatory assertions, …), source, publisher, publication date, and status.
New claims enter `unverified`; on a Refresh or Deepen run, claims outside the run’s scope keep their prior status from the memlog — only new and in-scope claims are (re)checked.
Every status change lands in the memlog as a fresh `claim` line with the same `ref=` and the new status — last status wins
**Record provenance** in the memlog: what produced it (which tool or firm), when (ask if not evident — production date drives staleness), and what the user wants decided from it.
<!-- vpmodule:atom:end keep-an-append-only-claims-ledger -->
<!-- vpmodule:atom:begin keep-project-context-out-of-the-evidence -->
---
instruction_id: keep-project-context-out-of-the-evidence
title: Keep project context out of the evidence
summary: "Project context shapes what to ask and never what is true: a research worker receives its brief and nothing else."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A research worker is dispatched to gather material.
conditions_does_not_apply_when: The worker reads the project files directly and there is no brief to hand it.
artifact_contract_output_type: research-firewall
artifact_contract_required_data:
  - the brief the worker received
  - the context withheld from it
artifact_contract_verified_by: "no claim in the artifact rests on project context, and the worker received nothing but its brief"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/run.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Keep project context out of the evidence
Project context — tickets, briefs, PRDs, code, memory, `{workflow.persistent_facts}` — shapes what to ask, never what is true.
It is inadmissible as evidence: every claim in a research artifact traces to a digest or import file with a source.
Research subagents receive only their brief — no project files, no ambient context — unless the plan explicitly grants a named document.
Each assistant runs behind the **research firewall**: it gets its brief and nothing else — no project files, no ambient context.
Spawn every subagent fresh and directly, never through a workflow, which relays the triggering request to every agent it runs, and as a subagent type without the project’s instruction files and git status when the harness has one, since those can name the work in progress.
- `brief.md` is all a researcher learns: the numbered questions with their shapes, the full and short commit, the budgets, the validation level, and the paths left out of every search, relative to the repository
<!-- vpmodule:atom:end keep-project-context-out-of-the-evidence -->
<!-- vpmodule:atom:begin never-conclude-from-training-data -->
---
instruction_id: never-conclude-from-training-data
title: Never conclude from training data alone
summary: "What the model already knows proposes hypotheses and shapes the questions; every conclusion needs evidence retrieved this run, a claim that cannot be evidenced stays a belief, and thin evidence is reported as thin."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A conclusion about the world is about to be written.
conditions_does_not_apply_when: The conclusion is a statement about the artefacts in front of you and the evidence is already in hand.
artifact_contract_output_type: evidence-bound-claim
artifact_contract_required_data:
  - the claim
  - the evidence it rests on
  - the belief status when it cannot be evidenced
artifact_contract_verified_by: every conclusion in the artifact traces to evidence retrieved or imported in this run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/research.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/research-philosophy.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Never conclude from training data alone
What you already know proposes hypotheses, queries, and structure; conclusions require evidence retrieved or imported *this run*.
A claim you cannot evidence is stated as an unverified belief or not at all.
The model's memory and the project's files only shape the questions.
Thin evidence is reported as thin.

**Date your knowledge** - "As of my training" is a warning flag
**Prefer current sources** - the documentation source and the official docs trump training data
**Flag uncertainty** - LOW confidence when only training data supports a claim
**Research is Investigation, Not Confirmation**
**Bad research:** Start with hypothesis, find evidence to support it
**Good research:** Gather evidence, form conclusions from evidence
Training data is 6-18 months stale. Treat pre-existing knowledge as hypothesis, not fact.
**Verify before asserting** — don't state library capabilities without checking the official docs
**Prefer current sources** — the current documentation and the official docs trump training data
**Flag uncertainty** — LOW confidence when only training data supports a claim
**Report honestly:**
- "I couldn't find X" is valuable (now we know to investigate differently)
- "This is LOW confidence" is valuable (flags for validation)
- "Sources contradict" is valuable (surfaces real ambiguity)
**Avoid:** Padding findings, stating unverified claims as facts, hiding uncertainty behind confident language.
<!-- vpmodule:atom:end never-conclude-from-training-data -->
<!-- vpmodule:atom:begin never-fabricate-research -->
---
instruction_id: never-fabricate-research
title: Never fabricate research
summary: "When the tool that produces the evidence is unavailable, say so and offer the other route; never invent the material."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The evidence has to come from a source that cannot be reached right now.
conditions_does_not_apply_when: The material is already in hand.
artifact_contract_output_type: unavailable-source-report
artifact_contract_required_data:
  - what was unavailable
  - the route offered instead
artifact_contract_verified_by: the gap is stated and no material was invented in its place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Never fabricate research
Web access is required for Run. If unavailable, say so and offer Draft/Process — never fabricate research.
Halt `blocked` only when topic or target folder cannot be inferred, or a codebase ask has no bounded question set.
<!-- vpmodule:atom:end never-fabricate-research -->
<!-- vpmodule:atom:begin offer-to-resume-existing-work-instead-of-duplicating-it -->
---
instruction_id: offer-to-resume-existing-work-instead-of-duplicating-it
title: Offer to resume existing work instead of duplicating it
summary: "When a run for this topic already exists, the existing one is offered for resumption or extension rather than started again."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A folder for this topic already exists.
conditions_does_not_apply_when: No prior run for this topic exists.
artifact_contract_output_type: resume-offer
artifact_contract_required_data:
  - the existing folder
  - the offer to resume or extend it
artifact_contract_verified_by: the existing run was offered instead of a duplicate being started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/milestone-summary.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Offer to resume existing work instead of duplicating it
If a run folder for this topic already exists under `{workflow.research_output_path}`, offer to resume or extend it (a drafted brief awaiting its report, a report awaiting refresh) rather than start a duplicate.

When the document already exists, ask whether to overwrite it or to show the existing one - never overwrite it silently.
Resume check, per entry: skip an item whose plan file already exists with valid frontmatter
<!-- vpmodule:atom:end offer-to-resume-existing-work-instead-of-duplicating-it -->
<!-- vpmodule:atom:begin open-the-floor-before-structured-questions -->
---
instruction_id: open-the-floor-before-structured-questions
title: Open the floor before structured questions
summary: "The first turn invites the decision and everything the asker already has; only what is still missing is asked, and the choice is put up front once."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The ask is bare and the decision behind it is not stated.
conditions_does_not_apply_when: The request already fixes the result and how it will be accepted.
artifact_contract_output_type: opening-brief
artifact_contract_required_data:
  - the decision the asker is facing
  - what the asker already has
  - the choice put up front
artifact_contract_verified_by: the questions asked are the ones that were still missing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/draft.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Open the floor before structured questions
When a ticket (`spike-*.md`, `epic-*.md`, `initiative-*.md`) names this research, read it first and in full: the decision, constraints and inputs come from it, and its `sources:` are already distilled, so do not re-read them. Otherwise open the floor before any structured questions: invite the decision they’re facing and anything they already have — links, a prior report, half-formed constraints — in one turn, then ask only what’s still missing.
Put the choice up front, once: **Run** it here now, or **Draft** a prompt for a deep-research tool they subscribe to — often cheaper and a strong gatherer
State the trade honestly (tokens and minutes here vs. one manual round-trip there); their call, remembered for the session.
<!-- vpmodule:atom:end open-the-floor-before-structured-questions -->