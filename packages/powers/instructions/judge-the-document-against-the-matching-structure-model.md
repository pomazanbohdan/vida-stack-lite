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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-structure.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/structure-models.md
status: active
revision: 1
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
