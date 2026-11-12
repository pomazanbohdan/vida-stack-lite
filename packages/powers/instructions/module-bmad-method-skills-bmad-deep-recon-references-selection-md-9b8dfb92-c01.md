---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-selection-md-9b8dfb92-c01"
title: "bmad-method: skills/bmad-deep-recon/references/selection.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-deep-recon/references/selection.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/selection.md\"}"
atom_ids:
  - agree-the-requirements-frame-before-candidate-research
  - price-the-total-cost-including-the-cost-of-leaving
  - screen-the-candidate-field-and-record-the-cuts
  - show-the-scoring-not-just-the-total
atom_count: 4
atoms: "[{\"atom_id\":\"agree-the-requirements-frame-before-candidate-research\",\"file_sha256\":\"81dae0d7015aa9f7fd3eca158e23c6156c6a8fd7c0524e957b8193f1de27cdf0\",\"content_sha256\":\"7bf24fb504fb9c494911fac84170b2f7de00a70400b2158ee8d35e65313bb4cc\",\"file_bytes\":1803,\"body_bytes\":600},{\"atom_id\":\"price-the-total-cost-including-the-cost-of-leaving\",\"file_sha256\":\"64cd1a6420650a9164cdb3e46e459d168b8612acb4bdf1b3a34affe44d126cea\",\"content_sha256\":\"5ea5e53a8b049e980132d41e931fd057724e08c8ae150390bc24ccac25723bae\",\"file_bytes\":1479,\"body_bytes\":380},{\"atom_id\":\"screen-the-candidate-field-and-record-the-cuts\",\"file_sha256\":\"a4618408e69053d248c1811e1ae9ac4bf9afe1d10f0b1ea0085fb8b9f2260fb0\",\"content_sha256\":\"11c6511004cfcdee940c9abf225fdb38be4050c1b2ced2d92437107e47fb5260\",\"file_bytes\":1404,\"body_bytes\":299},{\"atom_id\":\"show-the-scoring-not-just-the-total\",\"file_sha256\":\"dc59583bef265b25d0163e0e9344ce2812374151ebc1d15a1f3cff7aabcae36d\",\"content_sha256\":\"2066ff0f30bcdd4f1cf527e2f6215c87dc828daeead568be43794fd9f038367e\",\"file_bytes\":1951,\"body_bytes\":615}]"
carrier_sha256: 62a0a13f1d6f0b46fd3de2ee9f27cd3d7d8f4b7ea84043011841c2db5ecc9a16
carrier_bytes: 7238
revision: 1
status: active
---
<!-- vpmodule:atom:begin agree-the-requirements-frame-before-candidate-research -->
---
instruction_id: agree-the-requirements-frame-before-candidate-research
title: Agree the requirements frame before candidate research
summary: "What the winner must do and under which constraints is fixed and agreed first, with hard gates separated from weighted preferences; web research never sets the requirements."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A choice between candidates is going to be researched.
conditions_does_not_apply_when: The choice is already made and no research will run.
artifact_contract_output_type: requirements-frame
artifact_contract_required_data:
  - the hard gates
  - the weighted preferences and their weights
  - the agreed frame
artifact_contract_verified_by: the frame is agreed before any candidate research runs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/selection.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - business
  - product
  - research
---

# Agree the requirements frame before candidate research
- What must the winner do, under what constraints — scale, compliance, budget, team skills, existing stack, exit-cost tolerance? Split hard gates from weighted preferences and set the weights.
- Sources: the ticket for this work, read in full, then the companions it names; with no ticket, the brief, PRD, architecture document and codebase. The user decides; web research does not set requirements.
- **Agree the frame before any candidate research runs**; interactive runs confirm it even though the plan gate approved the dimension list.
<!-- vpmodule:atom:end agree-the-requirements-frame-before-candidate-research -->
<!-- vpmodule:atom:begin price-the-total-cost-including-the-cost-of-leaving -->
---
instruction_id: price-the-total-cost-including-the-cost-of-leaving
title: Price the total cost including the cost of leaving
summary: "The cost of a candidate covers the whole horizon and the cost of leaving it, and a vendor that has repriced before is expected to reprice again."
capability_tags:
  - design-experiments
pattern_tags:
  - decision-trail
conditions_applies_when: A candidate is being costed.
conditions_does_not_apply_when: The candidates differ only in feature fit.
artifact_contract_output_type: total-cost-case
artifact_contract_required_data:
  - the recurring and one-off costs
  - the operating load
  - the cost of leaving
artifact_contract_verified_by: the cost covers the horizon and the exit cost is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/selection.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - business
  - operations
---

# Price the total cost including the cost of leaving
- **Cost & lock-in.** Total cost over the product’s horizon — license/subscription, hosting, operational load, learning curve — and the cost of leaving. Current pricing pages read directly (≤ 3 mo, always); pricing-change history — a vendor that repriced once will again; migration-away accounts for real exit costs.
<!-- vpmodule:atom:end price-the-total-cost-including-the-cost-of-leaving -->
<!-- vpmodule:atom:begin screen-the-candidate-field-and-record-the-cuts -->
---
instruction_id: screen-the-candidate-field-and-record-the-cuts
title: Screen the candidate field and record the cuts
summary: "The credible field is established, everything failing a hard gate is cut with the reason recorded, and three to five finalists remain."
capability_tags:
  - design-experiments
pattern_tags:
  - evidence-analysis
conditions_applies_when: A field of candidates has to be narrowed before it can be scored.
conditions_does_not_apply_when: Only one candidate is on the table.
artifact_contract_output_type: candidate-screen
artifact_contract_required_data:
  - the credible field
  - the cuts and their reasons
  - the finalists
artifact_contract_verified_by: the finalists number three to five and every cut has a recorded reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/selection.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Screen the candidate field and record the cuts
- **Candidate screen.** Establish the credible field — leaders, strong challengers, one wildcard — and cut anything failing a hard gate. Screen to 3–5 finalists; record the cuts and why. Screening sources ≤ 6 months old — this field moves.
<!-- vpmodule:atom:end screen-the-candidate-field-and-record-the-cuts -->
<!-- vpmodule:atom:begin show-the-scoring-not-just-the-total -->
---
instruction_id: show-the-scoring-not-just-the-total
title: "Show the scoring, not just the total"
summary: "The verdict shows the weighted matrix so it can be re-weighted, names the pick, the runner-up and the conditions under which the runner-up wins, and offers the cheapest hedge; the comparison holds for any research type."
capability_tags:
  - design-experiments
pattern_tags:
  - decision-trail
conditions_applies_when: A verdict between candidates is about to be stated.
conditions_does_not_apply_when: The candidates were scored on a single criterion.
artifact_contract_output_type: selection-verdict
artifact_contract_required_data:
  - the weighted matrix
  - the pick
  - the runner-up and its conditions
  - the reversibility hedge
artifact_contract_verified_by: the scoring is shown and the runner-up with its winning conditions is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/selection.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/research.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Show the scoring, not just the total
- **Verdict.** The weighted decision matrix — show the scoring, not just totals; a matrix the user can re-weight is worth more than a verdict they must trust. Then: the pick; the named runner-up and the conditions under which it wins instead; the strongest argument against the pick (from the red-team pass when it ran); the cheapest reversibility hedge (abstraction seam, pilot scope, exit test).
'Help me choose between A and B' works with any research type. It agrees the requirements first and ends with a pick, a runner-up, and the strongest argument against the pick.
<!-- vpmodule:atom:end show-the-scoring-not-just-the-total -->