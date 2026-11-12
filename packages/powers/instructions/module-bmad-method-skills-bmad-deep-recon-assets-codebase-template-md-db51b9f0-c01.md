---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-assets-codebase-template-md-db51b9f0-c01"
title: "bmad-method: skills/bmad-deep-recon/assets/codebase.template.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-deep-recon/assets/codebase.template.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/assets/codebase.template.md\"}"
atom_ids:
  - answer-one-question-per-section-with-inline-citations
  - ask-numbered-questions-with-their-shape
  - list-the-prior-documents-in-reach
  - pin-the-codebase-research-to-a-repository-and-commit
  - record-open-questions-and-the-next-ask
  - record-the-ask-the-ticket-and-the-prior-document
  - record-the-decisions-found-last
  - record-the-research-document-metadata
atom_count: 8
atoms: "[{\"atom_id\":\"answer-one-question-per-section-with-inline-citations\",\"file_sha256\":\"7d07657fc5b3e0b58c6171ad816e2ab66d48347fb331838560e6d5a8dce80647\",\"content_sha256\":\"2f6b9631b3a2dd07c4646a5e4cdf5a4dc76686c5a6961104840c218be2b98e80\",\"file_bytes\":1707,\"body_bytes\":267},{\"atom_id\":\"ask-numbered-questions-with-their-shape\",\"file_sha256\":\"95e8ec7cbb3a49749b4ae188aa55452edf111992f5b0fbe3b20cf01d628a6d04\",\"content_sha256\":\"cc5eca405328f7977f1492c47216c00e8fddb75cdb710c49984312d0c130fa9c\",\"file_bytes\":1270,\"body_bytes\":110},{\"atom_id\":\"list-the-prior-documents-in-reach\",\"file_sha256\":\"74dc2390a3593d2fd6ce27c23de04d7ff7f1d2886a05e6ee7991bb69111174ba\",\"content_sha256\":\"15cd1fb0fbd6c23c1c795825541d9749e4be36d1e43dd43afa66686eea929b63\",\"file_bytes\":1233,\"body_bytes\":151},{\"atom_id\":\"pin-the-codebase-research-to-a-repository-and-commit\",\"file_sha256\":\"01c390af8ac66e000ae64d3c457c1b3d03f7de5e0c4b6e545b841387710e7bb6\",\"content_sha256\":\"466dedd139f4c9888ecdfcf156965753b736717cec384af32e5214d0cea94137\",\"file_bytes\":1369,\"body_bytes\":180},{\"atom_id\":\"record-open-questions-and-the-next-ask\",\"file_sha256\":\"83b86cf2e9903c95e0f4e4ca793be9c7a1864d60513252cdc5d1527c7476d19a\",\"content_sha256\":\"8275f86c46138db5e3976fa7be25cd3f77972726135e8447c20e69213db6e5f7\",\"file_bytes\":1393,\"body_bytes\":223},{\"atom_id\":\"record-the-ask-the-ticket-and-the-prior-document\",\"file_sha256\":\"472b7ee0efef7b11060fd3fdc51de85e9ede2bbe54539dce2ad7576c9698376c\",\"content_sha256\":\"4ca95f22dd30b252ac3af8ef91d168e02fc78d3ab6f9bebbf9ce6661ebec374f\",\"file_bytes\":1435,\"body_bytes\":225},{\"atom_id\":\"record-the-decisions-found-last\",\"file_sha256\":\"eb1d27a85d187d3134581729c030ea8940a14d40cdce6051950389c5d5f09d3d\",\"content_sha256\":\"0730ccefe4a122ee9c169bb6064b6bd16e092419e0dd14906c5abdf7102420b4\",\"file_bytes\":1551,\"body_bytes\":256},{\"atom_id\":\"record-the-research-document-metadata\",\"file_sha256\":\"626fd8d0a218f9d154a011f8563d11f2a70f807b1bc22bd4daa3291f7c87ead8\",\"content_sha256\":\"45548330ab33507aa686f1bb4f6f750032bd023258bf0bf436f4304426dd85ea\",\"file_bytes\":1563,\"body_bytes\":249}]"
carrier_sha256: a5aaceadc9336adcdcb6b1f89bf0b66105153e23b3ae027ff040884dc51e38a1
carrier_bytes: 12646
revision: 1
status: active
---
<!-- vpmodule:atom:begin answer-one-question-per-section-with-inline-citations -->
---
instruction_id: answer-one-question-per-section-with-inline-citations
title: Answer one question per section with inline citations
summary: "One section per question, in order: the answer in prose with each claim cited inline, call stacks and file trees as indented lists with each entry a citation, and what was looked for and not found."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A question of the approved set is being answered.
conditions_does_not_apply_when: The answer is a decision or a plan rather than a finding about the code.
artifact_contract_output_type: research-answer
artifact_contract_required_data:
  - the answer in prose
  - the inline citation of each claim
  - the cited call stack or file tree
  - what was looked for and not found
artifact_contract_verified_by: each section answers one question and each claim in it carries a citation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body lists response-format requirements for sections and citations but does not express judgment guidance, a conditional choice, an ordered action sequence, or unordered checks."
---

# Answer one question per section with inline citations
one `## <n>. <question>` section per question, in order
the answer in prose with each claim cited inline
call stacks and file trees as indented lists, each entry a citation
and what was looked for and not found
<!-- vpmodule:atom:end answer-one-question-per-section-with-inline-citations -->
<!-- vpmodule:atom:begin ask-numbered-questions-with-their-shape -->
---
instruction_id: ask-numbered-questions-with-their-shape
title: Ask numbered questions with their shape
summary: "A codebase research document opens with the approved questions, numbered, each with its shape."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A codebase research document is opened.
conditions_does_not_apply_when: The research answers a single question that needs no set.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the numbered questions
  - the shape of each question
artifact_contract_verified_by: the questions are numbered and each one carries its shape
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body specifies question numbering and shape only; it contains no judgment principle, conditional choice, ordered action sequence, or enumerated checks."
---

# Ask numbered questions with their shape
## Questions

the approved questions, numbered, each with its shape
<!-- vpmodule:atom:end ask-numbered-questions-with-their-shape -->
<!-- vpmodule:atom:begin list-the-prior-documents-in-reach -->
---
instruction_id: list-the-prior-documents-in-reach
title: List the prior documents in reach
summary: "The research documents and decision records in reach are listed by title, and when the ask follows one up, that one is named and the reason is given."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A research document is written and prior documents exist.
conditions_does_not_apply_when: No prior document or decision record is in reach.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the prior documents by title
  - the one followed up and why
artifact_contract_verified_by: every prior document in reach is listed by title
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# List the prior documents in reach
## Prior documents

research documents and ADRs in reach, by title; when the ask follows one up, which one and why
<!-- vpmodule:atom:end list-the-prior-documents-in-reach -->
<!-- vpmodule:atom:begin pin-the-codebase-research-to-a-repository-and-commit -->
---
instruction_id: pin-the-codebase-research-to-a-repository-and-commit
title: Pin the codebase research to a repository and a commit
summary: "A codebase research document names the repository, the full commit and the branch it was read at, so that the answer can be checked against the same code."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: Research is carried out against a codebase.
conditions_does_not_apply_when: The research reads published sources rather than a repository.
artifact_contract_output_type: pinned-research
artifact_contract_required_data:
  - the repository
  - the full commit
  - the branch
artifact_contract_verified_by: "the document names the repository, the full commit and the branch"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body supplies research-record fields only and states no grounded action form.
---

# Pin the codebase research to a repository and a commit
title: 'Codebase research: {subject}'
type: codebase
repository: '{repository}'
commit: '{full commit}'
branch: '{branch}'
<!-- vpmodule:atom:end pin-the-codebase-research-to-a-repository-and-commit -->
<!-- vpmodule:atom:begin record-open-questions-and-the-next-ask -->
---
instruction_id: record-open-questions-and-the-next-ask
title: Record the open questions and the next ask
summary: "When the research stopped short, or an answer opened a question the set does not hold, the document says where it stopped and states the next ask as a factual question."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: The research stopped short or an answer opened a new question.
conditions_does_not_apply_when: Every question of the set is answered and no new question arose.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - where the research stopped
  - the next ask as a factual question
artifact_contract_verified_by: the section states where it stopped and the next ask is a factual question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Record the open questions and the next ask
`## Open questions`, only when research stopped short or an answer opened a question the set does not hold: where, and the next ask that would continue it, as a factual question
<!-- vpmodule:atom:end record-open-questions-and-the-next-ask -->
<!-- vpmodule:atom:begin record-the-ask-the-ticket-and-the-prior-document -->
---
instruction_id: record-the-ask-the-ticket-and-the-prior-document
title: "Record the ask, the ticket and the prior document"
summary: "A codebase research document records the ask it answers, the ticket it came from when it came from one, and the prior document it follows up when it follows one up."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A codebase research document is opened.
conditions_does_not_apply_when: The ask came from no ticket and follows no prior document; both lines are dropped.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the ask
  - the ticket the ask came from
  - the prior document that is followed up
artifact_contract_verified_by: the ask is stated and the ticket and prior-document lines are present only when they apply
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Record the ask, the ticket and the prior document
ask: |-
{ask}
ticket: '{ticket ref or file; drop this line when the ask came from no ticket}'
follow_up_of: '{prior document; drop this line unless the ask follows one up}'
<!-- vpmodule:atom:end record-the-ask-the-ticket-and-the-prior-document -->
<!-- vpmodule:atom:begin record-the-decisions-found-last -->
---
instruction_id: record-the-decisions-found-last
title: "Record the decisions found, last"
summary: "A decision found in the history is recorded last, and only when there is one: the decision, its commit and pull request, the rationale found there, how the three tests are met, and the proposed decision-record path."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The research found a decision in the history of the codebase.
conditions_does_not_apply_when: The research found no decision; the section is dropped.
artifact_contract_output_type: decision-record
artifact_contract_required_data:
  - the decision
  - its commit and pull request
  - the rationale found there
  - how each of the three tests is met
  - the proposed decision-record path
artifact_contract_verified_by: "the section names the commit, the pull request, the rationale and the proposed path"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - engineering
---

# Record the decisions found, last
`## Decisions found`, last and only when there is one: for each, the decision, its commit and pull request, the rationale found there, how each of the three tests is met, shown from the history, and the proposed ADR path
<!-- vpmodule:atom:end record-the-decisions-found-last -->
<!-- vpmodule:atom:begin record-the-research-document-metadata -->
---
instruction_id: record-the-research-document-metadata
title: Record the research document metadata
summary: "A research document records its title, type, topic, source, status, validation, claims and dates in its metadata."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A research document is written or updated.
conditions_does_not_apply_when: The document is a scratch note that is not kept.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the title
  - the type
  - the topic
  - the source
  - the status
  - the validation
  - the claims
  - the dates
artifact_contract_verified_by: the metadata carries every field the document type declares
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/research.template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body lists research metadata fields but supplies no supported form beyond a record template.
---

# Record the research document metadata
title: '{research_type} research: {research_topic}'
type: '{research_type}'
topic: '{research_topic}'
source: '{source}'
status: draft
validation: '{validation}'
claims: {}
created: '{date}'
updated: '{date}'
<!-- vpmodule:atom:end record-the-research-document-metadata -->