---
instruction_id: link-every-new-reference-from-the-document-that-uses-it
title: Link every new reference from the document that uses it
summary: "A reference that no document links to is unfinished: it is cited from the primary document that needs it, and both sides of a join cite it, before the work is declared done."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A new reference document has been written.
conditions_does_not_apply_when: No reference document was created.
artifact_contract_output_type: reference-document
artifact_contract_required_data:
  - the references that were created
  - the document that cites each of them
artifact_contract_verified_by: every reference that was created is linked from at least one primary document
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Link every new reference from the document that uses it
Cite it back (MANDATORY, not optional): a minted metric reference is **incomplete until a primary table doc links to it**.
An orphan `references/metrics/<slug>.md` that no table cites is a bug, not a deliverable.
Cite it back (MANDATORY): as with metrics, a minted join reference is incomplete until **both** sides link to it.
Before you stop, **verify no reference you minted is orphaned**: every `references/metrics/<slug>.md` and `references/joins/<a>__<b>.md` you wrote this session must be linked from at least one primary table doc’s `# Metrics` / `# Joins` section.
If any is still uncited, go back and augment the contributing table doc(s) now — do not end the session with orphan references.
A metric reference you minted but never linked is worse than not minting it.
