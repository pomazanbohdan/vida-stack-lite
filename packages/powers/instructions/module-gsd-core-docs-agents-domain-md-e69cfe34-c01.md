---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-agents-domain-md-e69cfe34-c01"
title: "gsd-core: docs/agents/domain.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/agents/domain.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/agents/domain.md\"}"
atom_ids:
  - check-the-recurring-mistakes-and-workflow-learnings-before-writing
  - read-the-domain-glossary-in-full-before-you-name-anything
  - surface-a-contradicted-decision-instead-of-hiding-it
atom_count: 3
atoms: "[{\"atom_id\":\"check-the-recurring-mistakes-and-workflow-learnings-before-writing\",\"file_sha256\":\"ddf2f61019081c82ab4367e4569bc30b5529aebc9ac1a4567e4694a612f2adfe\",\"content_sha256\":\"d60392096a0c46f149c720fc15db9bacac09c5c855155f852033bdf88e3c60c7\",\"file_bytes\":1605,\"body_bytes\":333},{\"atom_id\":\"read-the-domain-glossary-in-full-before-you-name-anything\",\"file_sha256\":\"800f13c7faab085b8b3d9b3d8d7fba224986c633aa63da75a83c6f3913d64a7c\",\"content_sha256\":\"1d5c7662b388a93b2e5307a885f2d46433ab01abc5670d5c570d911b8913c26c\",\"file_bytes\":1367,\"body_bytes\":187},{\"atom_id\":\"surface-a-contradicted-decision-instead-of-hiding-it\",\"file_sha256\":\"f0aa2f2ed732f6d731db7f11cc56562906cefeb81d1aac4ea527b6a41f865d4a\",\"content_sha256\":\"fa0195b77b6d7c1a64c362225f715860f5e2d8642a04865856f536927b507a6f\",\"file_bytes\":1445,\"body_bytes\":261}]"
carrier_sha256: 3d4c13604d0ddf590d10224f6c749009b957e4dbbf651bf284ed11c66fe05278
carrier_bytes: 4940
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-the-recurring-mistakes-and-workflow-learnings-before-writing -->
---
instruction_id: check-the-recurring-mistakes-and-workflow-learnings-before-writing
title: Check the recurring mistakes and the workflow learnings before writing
summary: "Before a change is written, the file records the mistakes that keep recurring and the patterns the workflow has already learned are read first."
capability_tags:
  - consult-guidance
pattern_tags:
  - source-hierarchy
conditions_applies_when: "A test, a shell script, a changeset, a document, a command or a workflow file is about to be written."
conditions_does_not_apply_when: The repository keeps no record of recurring mistakes or learned patterns.
artifact_contract_output_type: prior-mistakes-check
artifact_contract_required_data:
  - the recurring mistakes that apply
  - the workflow learnings that apply
  - the file that was written afterwards
artifact_contract_verified_by: the recurring mistakes and the learned patterns were checked before the file was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/agents/domain.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Check the recurring mistakes and the workflow learnings before writing
- **Recurring PR mistakes** — CodeRabbit findings that recur; check before writing tests, shell scripts, changesets, or docs
- **Workflow learnings** — patterns learned from triage + PR cycles; check before writing new command/workflow files or test paths
<!-- vpmodule:atom:end check-the-recurring-mistakes-and-workflow-learnings-before-writing -->
<!-- vpmodule:atom:begin read-the-domain-glossary-in-full-before-you-name-anything -->
---
instruction_id: read-the-domain-glossary-in-full-before-you-name-anything
title: Read the domain glossary in full before you name anything
summary: The glossary of domain terms and recurring mistakes is read completely before anything is named or a structure is proposed; an absent glossary is not an error.
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: Anything is about to be named or a structural change is about to be proposed.
conditions_does_not_apply_when: The repository has no glossary file at all.
artifact_contract_output_type: glossary-read
artifact_contract_required_data:
  - the glossary file
  - the fact that it was read in full
  - what happens when it is absent
artifact_contract_verified_by: "the glossary was read in full before naming, and its absence did not stop the work"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/agents/domain.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Read the domain glossary in full before you name anything
- Read in full before naming anything or proposing architecture changes.
- If either file doesn't exist yet, proceed silently.
<!-- vpmodule:atom:end read-the-domain-glossary-in-full-before-you-name-anything -->
<!-- vpmodule:atom:begin surface-a-contradicted-decision-instead-of-hiding-it -->
---
instruction_id: surface-a-contradicted-decision-instead-of-hiding-it
title: Surface a contradicted decision instead of hiding it
summary: "When the work contradicts a recorded decision, the contradiction is stated in the output with the reason it may be worth reopening; it is not quietly dropped."
capability_tags:
  - disagree-with-reasons
pattern_tags:
  - reasoned-disagreement
conditions_applies_when: The work contradicts a decision that is recorded in the repository.
conditions_does_not_apply_when: No recorded decision covers the area being changed.
artifact_contract_output_type: contradiction-note
artifact_contract_required_data:
  - the decision that is contradicted
  - the reason it may be worth reopening
  - what the output does instead
artifact_contract_verified_by: the contradiction is stated in the output and not hidden
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/agents/domain.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Surface a contradicted decision instead of hiding it
- read ADRs relevant to the area you're working in before proposing structural changes. If your output contradicts an ADR, surface it explicitly:
- *Contradicts ADR-0002 – but worth reopening because…*
<!-- vpmodule:atom:end surface-a-contradicted-decision-instead-of-hiding-it -->