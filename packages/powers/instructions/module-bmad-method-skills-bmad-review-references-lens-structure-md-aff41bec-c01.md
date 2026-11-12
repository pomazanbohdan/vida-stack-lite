---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-review-references-lens-structure-md-aff41bec-c01"
title: "bmad-method: skills/bmad-review/references/lens-structure.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-review/references/lens-structure.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-review/references/lens-structure.md\"}"
atom_ids:
  - judge-the-document-against-the-matching-structure-model
  - optimize-for-the-minimum-words-that-maintain-understanding
  - tag-each-structural-finding-with-a-disposition
atom_count: 3
atoms: "[{\"atom_id\":\"judge-the-document-against-the-matching-structure-model\",\"file_sha256\":\"b163bd2bf87a011bb1bd556590de51e82a8058f2b94c24f7c1c9e14ec06a10ac\",\"content_sha256\":\"858f4000566e7c35ade03b2ee9bcd457a2819d6fb538abdc6641161e7447eeae\",\"file_bytes\":3344,\"body_bytes\":1990},{\"atom_id\":\"optimize-for-the-minimum-words-that-maintain-understanding\",\"file_sha256\":\"7ce7c92fba31dd08d95f883b38a00651ee44007339ede156ab5ee3ea3f7a7cc2\",\"content_sha256\":\"4ca1c80e1afdaccfb27127539ddc10b7e0f89293cde1c5c0f3f124be37982338\",\"file_bytes\":1629,\"body_bytes\":459},{\"atom_id\":\"tag-each-structural-finding-with-a-disposition\",\"file_sha256\":\"41bca4b648208e098b673e9931e7e4f9f88391faae049e9a15446a44609bf53a\",\"content_sha256\":\"edd874028cccd33ef0d756ee75e92928b52adb1a20a6be430d2896b8e15741f7\",\"file_bytes\":2034,\"body_bytes\":823}]"
carrier_sha256: 64c6a8067ea9ad249bdb4d9ec0cb31ed92a2e6e58c6678e66bc7611c08d5aa41
carrier_bytes: 7498
revision: 1
status: active
---
<!-- vpmodule:atom:begin judge-the-document-against-the-matching-structure-model -->
---
instruction_id: judge-the-document-against-the-matching-structure-model
title: Judge the document against the matching structure model
summary: The document is judged against the reference shape that matches its purpose; a document that fits none cleanly is judged against the closest one and the mismatch becomes a finding.
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A structural pass picks the shape a document is judged against.
conditions_does_not_apply_when: The shape was already fixed for this document.
artifact_contract_output_type: structure-model
artifact_contract_required_data:
  - the chosen model
  - why it matches the purpose
  - the mismatch when no model fits
artifact_contract_verified_by: the chosen model is named and the document is judged against its rules
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-structure.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/structure-models.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
  - engineering
---

# Judge the document against the matching structure model
Reference shapes for the structure pass.
Pick the one matching the document's purpose and evaluate the document against its rules; a document that fits none cleanly is judged against the closest model, with the mismatch itself noted as a finding when the shape fights the purpose.
## Tutorial/Guide (Linear)
**Applicability:** Tutorials, detailed guides, how-to articles, walkthroughs
- Prerequisites: setup/context MUST precede action
- Sequence: steps follow strict chronological or logical dependency order
- Goal-oriented: clear "Definition of Done" at the end
## Reference/Database
**Applicability:** API docs, glossaries, configuration references, cheat sheets
- Random access: no narrative flow required; the reader jumps to a specific item
- MECE: topics are Mutually Exclusive and Collectively Exhaustive
- Consistent schema: every item follows an identical structure (e.g., Signature → Params → Returns)
## Explanation (Conceptual)
**Applicability:** Deep dives, architecture overviews, conceptual guides, whitepapers, project context
- Abstract to concrete: Definition → Context → Implementation/Example
- Scaffolding: complex ideas built on established foundations
## Prompt/Task Definition (Functional)
**Applicability:**
skills and workflows, prompts, system instructions, agent definitions
- Meta-first: inputs, usage constraints, and context defined before instructions
- Separation of concerns: instructions (logic) separate from data (content)
- Explicit flow: execution order is stated, never implied
## Strategic/Context (Pyramid)
**Applicability:** PRDs, research reports, proposals, decision records
- Top-down: conclusion/status/recommendation starts the document
- Grouping: supporting context grouped logically below the headline
- Ordering: most critical information first
- MECE: arguments/groups are Mutually Exclusive and Collectively Exhaustive
- Evidence: data supports arguments, never leads
<!-- vpmodule:atom:end judge-the-document-against-the-matching-structure-model -->
<!-- vpmodule:atom:begin optimize-for-the-minimum-words-that-maintain-understanding -->
---
instruction_id: optimize-for-the-minimum-words-that-maintain-understanding
title: Optimize for the minimum words that maintain understanding
summary: "Brevity is clarity, but comprehension is the floor: the structure pass cuts everything that delays understanding and front-loads the critical information."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A structural pass judges a document for density.
conditions_does_not_apply_when: The pass is not the structural one.
artifact_contract_output_type: density-judgement
artifact_contract_required_data:
  - what delays understanding
  - what carries the critical information
artifact_contract_verified_by: "every section is kept only because it serves understanding, and the critical information comes first"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-structure.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Optimize for the minimum words that maintain understanding
Brevity is clarity: concise writing respects limited attention spans and enables effective scanning.
Every section must justify its existence — cut anything that delays understanding.
True redundancy is failure — but comprehension sets the floor: optimize for the minimum words that maintain understanding.
Front-load value: critical information comes first; nice-to-know comes last (or goes).
<!-- vpmodule:atom:end optimize-for-the-minimum-words-that-maintain-understanding -->
<!-- vpmodule:atom:begin tag-each-structural-finding-with-a-disposition -->
---
instruction_id: tag-each-structural-finding-with-a-disposition
title: Tag each structural finding with a disposition
summary: "Every structural finding carries one of six dispositions and its word impact, and a length target is checked against the recommendations."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: The structural pass writes up what it found.
conditions_does_not_apply_when: The prose pass writes up what it found.
artifact_contract_output_type: structural-findings
artifact_contract_required_data:
  - what does not serve the purpose
  - the disposition of each finding
  - the word impact of each finding
  - whether the length target is met
artifact_contract_verified_by: "every finding carries one disposition and its word impact, and the length target is answered"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-structure.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - operations
---

# Tag each structural finding with a disposition
Hunt for: sections that don't serve the stated purpose, true redundancy (identical information with no reinforcement value), scope violations (content that belongs in a different document), buried critical information, premature detail, missing scaffolding, and the classic anti-patterns — FAQs that should be inline, appendices that should be cut, overviews that repeat the body verbatim.
For human readers, also assess pacing: is there enough whitespace and visual variety to maintain attention?
Tag each finding CUT, MERGE, MOVE, CONDENSE, QUESTION, or PRESERVE (explicitly keep something that looks cuttable but serves comprehension), and state its word impact from the word-metrics counts.
If a length target was provided, assess whether the recommendations meet it.
<!-- vpmodule:atom:end tag-each-structural-finding-with-a-disposition -->