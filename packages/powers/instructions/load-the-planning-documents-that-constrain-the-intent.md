---
instruction_id: load-the-planning-documents-that-constrain-the-intent
title: Load the planning documents that constrain the intent
summary: The documents that carry the requirements are loaded selectively; requirements are not guessed from the code alone.
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
conditions_applies_when: Planning documents exist and the intent has to be pinned down before planning.
conditions_does_not_apply_when: No planning document covers the work.
artifact_contract_output_type: context-selection
artifact_contract_required_data:
  - the documents that were listed
  - the documents that were loaded
  - the constraints they carried
artifact_contract_verified_by: "the relevant constraints came from a loaded document, not from the code"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/start-in-an-existing-codebase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Load the planning documents that constrain the intent
Planning documents sit in folders by type, main file named after the folder.
Scan the listing for folders matching these patterns. If any look relevant to the current intent, load them selectively — you don't need all of them, but you need the right constraints and requirements rather than guessing from code alone.
When a change needs a PRD, make the agent find and read the existing project documentation before it writes requirements.
If the PRD cites nothing the repository already does, expect to rework the design once the implementation meets the real code.
