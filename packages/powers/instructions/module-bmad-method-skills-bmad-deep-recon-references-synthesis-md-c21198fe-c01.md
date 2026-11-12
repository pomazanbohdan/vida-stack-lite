---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-synthesis-md-c21198fe-c01"
title: "bmad-method: skills/bmad-deep-recon/references/synthesis.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-deep-recon/references/synthesis.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/synthesis.md\"}"
atom_ids:
  - assemble-the-report-decision-first-and-succinct
  - bind-each-recommendation-to-the-decision-and-its-confidence
  - number-every-source-and-resolve-every-inline-marker
  - report-what-only-the-combination-shows
atom_count: 4
atoms: "[{\"atom_id\":\"assemble-the-report-decision-first-and-succinct\",\"file_sha256\":\"eb9517aef1e17c46f039c9b6ac6938c77fed2c2a3c0a2d90861f1a5e27dd5248\",\"content_sha256\":\"50914a164ac824152cde16962b82fcba44a93bc1903deb35f39b2d8056f41d74\",\"file_bytes\":2048,\"body_bytes\":911},{\"atom_id\":\"bind-each-recommendation-to-the-decision-and-its-confidence\",\"file_sha256\":\"b75ba3af6807cdc4afc794c020708b8f7564a8fcccf5a533bb5ab886116635e2\",\"content_sha256\":\"a74d8073f3695739a62c0fda940f8493f24e37069bd8f570fc21919ae0aecfa2\",\"file_bytes\":1650,\"body_bytes\":449},{\"atom_id\":\"number-every-source-and-resolve-every-inline-marker\",\"file_sha256\":\"98e521177a6f59124adf74f22c952945268e0c3ee894b8ff97bdf89e3dd978c1\",\"content_sha256\":\"1a90234e35fe4192f59cb44bf83299b27a83eba5c158c8a03fdc6d90b64b25d8\",\"file_bytes\":1355,\"body_bytes\":275},{\"atom_id\":\"report-what-only-the-combination-shows\",\"file_sha256\":\"1f9da55eb90f2cb46d589f97bb4c45f911928ab0a7878c3842a0ffe1563b9df4\",\"content_sha256\":\"eb584f2e2164be039c6417b9f7f921e59091690b6e457623d187b535b553b6ed\",\"file_bytes\":1515,\"body_bytes\":381}]"
carrier_sha256: 65bbc44d9ef7e7d6dccd89fc57e741b4625d9245d703c2a187f5bff59f1fe27f
carrier_bytes: 7189
revision: 1
status: active
---
<!-- vpmodule:atom:begin assemble-the-report-decision-first-and-succinct -->
---
instruction_id: assemble-the-report-decision-first-and-succinct
title: Assemble the report decision-first and succinct
summary: "The report answers the decision, states findings and verdicts rather than essays, and opens with an executive summary written last and placed first."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The material for a report is complete.
conditions_does_not_apply_when: The material is still being gathered.
artifact_contract_output_type: assembled-report
artifact_contract_required_data:
  - the executive summary
  - the dimension sections
  - the open questions
artifact_contract_verified_by: the summary answers the decision on one page and every section with nothing behind it collapses to a line
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/synthesis.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Assemble the report decision-first and succinct
**Succinct is the contract**: findings and verdicts, not essays; rationale lives in the memlog; a reader gets the decision-relevant truth in minutes. For Process mode this is the whole point — the summary is what downstream consumers read so nobody reprocesses the original, and sections with nothing behind them collapse to a line rather than pad.
**Executive summary** — decision-first: what the evidence says to do, the two or three findings that drive that answer, and the biggest caveat. One page maximum, readable standalone. Written last, placed first.
**Dimension sections** — already written during the loop; now reconciled: consistent terminology, no duplicated ground, verification statuses and any corrections from the pass applied to the text.
**Open questions** — what the research could not answer, and what it would take to answer each.
<!-- vpmodule:atom:end assemble-the-report-decision-first-and-succinct -->
<!-- vpmodule:atom:begin bind-each-recommendation-to-the-decision-and-its-confidence -->
---
instruction_id: bind-each-recommendation-to-the-decision-and-its-confidence
title: Bind each recommendation to the decision and its confidence
summary: "Every recommendation names the decision it serves, the artefact that will consume it and the confidence its basis carries, in the same sentence."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A recommendation is about to be written into a report.
conditions_does_not_apply_when: "The text is a finding, not a recommendation."
artifact_contract_output_type: recommendation-set
artifact_contract_required_data:
  - the decision served
  - the consuming artefact
  - the confidence basis
artifact_contract_verified_by: every recommendation names its confidence basis and flags a low-confidence or disputed basis in the same sentence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/synthesis.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Bind each recommendation to the decision and its confidence
**Recommendations** — each bound to the decision and, where the project has them, to what consumes it: the ticket whose Requirements it feeds, or the artifact per the pack’s `Feeds` entries (brief section, PRD input, architecture constraint). Each recommendation names its confidence basis; a recommendation resting on low-confidence or disputed claims says so in the same sentence.
<!-- vpmodule:atom:end bind-each-recommendation-to-the-decision-and-its-confidence -->
<!-- vpmodule:atom:begin number-every-source-and-resolve-every-inline-marker -->
---
instruction_id: number-every-source-and-resolve-every-inline-marker
title: Number every source and resolve every inline marker
summary: "Sources are numbered in a table that carries the claim each supports, its publisher, its dates and its confidence, and every inline marker resolves to a row."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A report cites its sources.
conditions_does_not_apply_when: The text carries no citations.
artifact_contract_output_type: source-appendix
artifact_contract_required_data:
  - the numbered source table
  - the claim each source supports
artifact_contract_verified_by: every inline marker resolves to a row of the source table
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/synthesis.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Number every source and resolve every inline marker
**Source appendix** — the numbered source table: `[n] | claim/finding it supports | publisher | pub date | accessed | confidence`, the publisher cell a markdown link to the source URL. Every inline `[n]` resolves here.
<!-- vpmodule:atom:end number-every-source-and-resolve-every-inline-marker -->
<!-- vpmodule:atom:begin report-what-only-the-combination-shows -->
---
instruction_id: report-what-only-the-combination-shows
title: Report what only the combination shows
summary: "Cross-dimension insights are what the combination reveals and not any single dimension; when there are none, the report says so instead of manufacturing them."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A report covers more than one dimension.
conditions_does_not_apply_when: The report covers a single dimension.
artifact_contract_output_type: cross-dimension-insight
artifact_contract_required_data:
  - the insights the combination shows
  - the statement that there are none
artifact_contract_verified_by: "the section names only insights the combination shows, or says there are none"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/synthesis.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - business
  - research
---

# Report what only the combination shows
**Cross-dimension insights** — what only the *combination* shows (e.g. the market is growing but the regulatory dimension caps the reachable segment; the technically superior option loses on ecosystem health). This section is the harness earning its keep — if there are no cross-dimension insights, say so rather than manufacture them.
<!-- vpmodule:atom:end report-what-only-the-combination-shows -->