---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-retrospective-references-retro-document-md-a25ec63b-c01"
title: "bmad-method: skills/bmad-retrospective/references/retro-document.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-retrospective/references/retro-document.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-retrospective/references/retro-document.md\"}"
atom_ids:
  - let-the-retrospective-document-be-the-only-write
  - never-state-time-estimates
  - write-the-retrospective-document-in-a-fixed-shape
atom_count: 3
atoms: "[{\"atom_id\":\"let-the-retrospective-document-be-the-only-write\",\"file_sha256\":\"9a19095e4e071cab9309a62a3d78249c92204526054d74fa10e76a8ea670ec2f\",\"content_sha256\":\"4a5f4cfd8c62dfd761e8bdd8c758926bc36ed904e29d3614a7628b491b3afe1d\",\"file_bytes\":2057,\"body_bytes\":573},{\"atom_id\":\"never-state-time-estimates\",\"file_sha256\":\"bcbb974b2156fdd86b9aab1b45ec01450122e0e53a591aac0ad56496c9d07e62\",\"content_sha256\":\"a42fee5d3cdaaf366ee027bfac03f9dd518b99fe0062d20fbceb1ddcd07ccaa5\",\"file_bytes\":1853,\"body_bytes\":355},{\"atom_id\":\"write-the-retrospective-document-in-a-fixed-shape\",\"file_sha256\":\"af10bd67fd53679d679c697514c0716bdcca0eada49a5d7b0465b18c7b765625\",\"content_sha256\":\"3f8b62f6af626f6452d3633abeb20994065eddff16432572502b0471b2a4ad0b\",\"file_bytes\":3441,\"body_bytes\":2234}]"
carrier_sha256: 4040c557c5b38c8c8f8a8be2afcba6ee64401b76ba255307fa7cba7d7213f326
carrier_bytes: 7770
revision: 1
status: active
---
<!-- vpmodule:atom:begin let-the-retrospective-document-be-the-only-write -->
---
instruction_id: let-the-retrospective-document-be-the-only-write
title: Let the retrospective document be the only write
summary: "The run writes the retrospective document and nothing else: no status changes, no marks on the records, and no edit to the plan or the story."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - code-audit
conditions_applies_when: A retrospective finishes and the run is about to end.
conditions_does_not_apply_when: The person approved decision records that are written beside the code.
artifact_contract_output_type: run-write-set
artifact_contract_required_data:
  - the document path
  - the verdict
  - the action-item count
  - the path of each decision record written
artifact_contract_verified_by: "the run reports the document, the verdict, the count and the written records, and changed no other file"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/retro-document.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/ticket-tree-rules.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Let the retrospective document be the only write
Report the document's path, the verdict, the action-item count, and the path of each decision record written. Nothing else was written: no status changed, and no tree file was edited.
Besides the decision records the user approved, the document is the run's only write: no status change,
no edit to the epic file, any plan, or any story file.
Outside the tree it writes only the decision records the user approves, each beside the code it governs or in the decisions folder when system-wide, and only in interactive runs.
<!-- vpmodule:atom:end let-the-retrospective-document-be-the-only-write -->
<!-- vpmodule:atom:begin never-state-time-estimates -->
---
instruction_id: never-state-time-estimates
title: Never state time estimates
summary: "No hour, day or week estimate is stated anywhere: the speed of development changed, so a prediction of duration is noise, and the effort is estimated in context cost instead."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
  - code-audit
conditions_applies_when: A report is written about a finished body of work.
conditions_does_not_apply_when: "A duration was measured and is reported as a measurement, not as a prediction."
artifact_contract_output_type: retrospective-report
artifact_contract_required_data:
  - the findings
  - the action items
artifact_contract_verified_by: "the report contains no hour, day or week estimate"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/retro-document.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/skill-validator.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-guidance.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never state time estimates
Never state time estimates — AI has changed development speed, so hour/day/week predictions are noise.
Do not state time estimates anywhere in the document.
Workflow files should not include time estimates. AI execution speed varies too much for estimates to be meaningful.

Estimate effort in context window cost, not time
<!-- vpmodule:atom:end never-state-time-estimates -->
<!-- vpmodule:atom:begin write-the-retrospective-document-in-a-fixed-shape -->
---
instruction_id: write-the-retrospective-document-in-a-fixed-shape
title: Write the retrospective document in a fixed shape
summary: "The document opens with frontmatter a machine can read without parsing the prose and then carries the fixed sections, from the epic summary to the assumptions."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
  - code-audit
conditions_applies_when: The retrospective document is written.
conditions_does_not_apply_when: The document is only being read back.
artifact_contract_output_type: retrospective-document
artifact_contract_required_data:
  - the frontmatter
  - the sections
  - the verdict that the frontmatter carries
artifact_contract_verified_by: "the frontmatter carries the verdict and it agrees with the Acceptance verdict section, and every named section is present"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/retro-document.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write the retrospective document in a fixed shape
Open the document with YAML frontmatter a machine can read without parsing the prose — an epic gate or orchestrator keys off `verdict` to decide whether to hold the next epic:
```yaml
epic: the epic folder's name
date: the date of the run
verdict: accepted | accepted-with-open-items | rejected
criteria: declared | profiled
headless: true | false
```
Keep `verdict` in sync with the Acceptance verdict section below.
This frontmatter is the only machine-readable verdict; nothing in the tree records it, so a gate or orchestrator that acts on the verdict **must** read this file.
Sections:
- **Epic summary** — which epic, its tickets with their statuses, the tickets still at `built`, any tickets still unfinished (`pending_tickets`) that the user accepted retro-ing over, each plan's range, the evidence inventory (what was available, what was missing).
- **Findings** — grouped by aggregate view and by lens, each with its source reference and disposition (fix now / defer / accept). This is the record; do not summarize away the provenance.
- **Behavior verification** — what was exercised end to end and what was observed, or an explicit note that runtime behavior was not exercised.
- **Previous-retro follow-through** — if a prior retro exists, whether its action items landed, with evidence
- **Action items** — the routed fix-now items and process lessons, each with an owner. Note which are proposed remediation or spec reconciliations awaiting human application.
- **Decision records** — each decision proposed as a record, and whether it was approved and written
- **Acceptance verdict** — accepted / accepted-with-open-items / rejected, whether the criteria were declared or profiled, and the evidence behind the call.
- **Open questions** — what a human answer would materially change, and anything the analyses could not resolve.
- **Assumptions** — in headless runs, every choice made without the user: how the epic reference resolved to its folder, any non-empty `pending_tickets`, a machine **rejected** verdict forced by unfinished tickets or rendered with no human decision, each proposed item and decision record. Omit in interactive runs.
<!-- vpmodule:atom:end write-the-retrospective-document-in-a-fixed-shape -->