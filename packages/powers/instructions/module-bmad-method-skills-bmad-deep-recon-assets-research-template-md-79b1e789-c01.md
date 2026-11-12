---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-assets-research-template-md-79b1e789-c01"
title: "bmad-method: skills/bmad-deep-recon/assets/research.template.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-deep-recon/assets/research.template.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/assets/research.template.md\"}"
atom_ids:
  - append-the-sections-in-the-approved-plan-order
  - name-the-decision-the-research-serves
  - write-the-executive-summary-last-and-place-it-first
atom_count: 3
atoms: "[{\"atom_id\":\"append-the-sections-in-the-approved-plan-order\",\"file_sha256\":\"5da40d65881edcf00451695b257909ea68bdc3007f96f5c6dfcbdb8395d24129\",\"content_sha256\":\"2e84ca8eae2d361158338a801cf9df89d22d5c35b08a8a0f1a8345034a4a27f6\",\"file_bytes\":1130,\"body_bytes\":102},{\"atom_id\":\"name-the-decision-the-research-serves\",\"file_sha256\":\"4cf6ebb9282bfd29bf83a7d08ef5d87eba2345277a1e887a71812351acb3c838\",\"content_sha256\":\"a53c5e53acbd15025797c5d466a9d1e19a5c250cdda06d9cfe140e4ff33fde3e\",\"file_bytes\":1626,\"body_bytes\":351},{\"atom_id\":\"write-the-executive-summary-last-and-place-it-first\",\"file_sha256\":\"d72b4a1294be983f1d43da40e893c1170b85b83d2f78a124cab8fc228780b1ba\",\"content_sha256\":\"15f54eac69561966147de87860f267b3723ecb545cf28ea65746da72963383fc\",\"file_bytes\":1120,\"body_bytes\":116}]"
carrier_sha256: 748d54481856e0b19c5ab162abd84df4b5348bd2b628e207f269c7d1e726d3e6
carrier_bytes: 4317
revision: 1
status: active
---
<!-- vpmodule:atom:begin append-the-sections-in-the-approved-plan-order -->
---
instruction_id: append-the-sections-in-the-approved-plan-order
title: Append the sections in the approved plan order
summary: The sections of a research document are appended in the order of the approved research plan.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A research document is assembled from its sections.
conditions_does_not_apply_when: No approved research plan exists for the document.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the sections in the order of the plan
artifact_contract_verified_by: the sections follow the order of the approved research plan
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/research.template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Append the sections in the approved plan order
Sections are appended per the approved research plan
<!-- vpmodule:atom:end append-the-sections-in-the-approved-plan-order -->
<!-- vpmodule:atom:begin name-the-decision-the-research-serves -->
---
instruction_id: name-the-decision-the-research-serves
title: Name the decision the research serves
summary: "The research document states the decision it serves, in its metadata and at the top of its body."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A research document is opened.
conditions_does_not_apply_when: The document is a throwaway note with no decision behind it.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the decision the research serves
artifact_contract_verified_by: the decision appears in the metadata and at the top of the document
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/research.template.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project/detail/elaboration.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Name the decision the research serves
decision: '{decision}'

**Decision this research serves:** {decision}

Give every parallel researcher its own dimension, its own question, the note of what the next stage needs from its output, and a quality gate.
In a later cycle, research only what the new work needs; do not re-research what already exists.
<!-- vpmodule:atom:end name-the-decision-the-research-serves -->
<!-- vpmodule:atom:begin write-the-executive-summary-last-and-place-it-first -->
---
instruction_id: write-the-executive-summary-last-and-place-it-first
title: Write the executive summary last and place it first
summary: The executive summary is written last and placed first.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A research document with a summary is finished.
conditions_does_not_apply_when: The document is short and carries no separate summary.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the executive summary
artifact_contract_verified_by: the summary sits at the top of the document and was written after the body
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/research.template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Write the executive summary last and place it first
the executive summary is written last and placed here, first.
<!-- vpmodule:atom:end write-the-executive-summary-last-and-place-it-first -->