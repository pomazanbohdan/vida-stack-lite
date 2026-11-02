---
instruction_id: load-the-planning-documents-that-constrain-the-intent
title: Load the planning documents that constrain the intent
summary: "When a ticket exists, read it first and in full and open only what it points at; with no ticket, load the planning documents that fit the intent rather than guessing from code."
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
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Load the planning documents that constrain the intent
Planning documents sit in folders by type, main file named after the folder.
When the listing holds a ticket file for this work (`initiative-*/initiative-*.md`, or `tickets/epic-*/epic-*.md` under it), read it first and in full: it distills its `sources:`, so do not re-read them. Open a file its References or `companions:` name only for a need the ticket points at.
With no ticket, scan the listing for folders matching these patterns and load the ones that fit the intent — you need the right constraints and requirements rather than guessing from code alone.
When a change needs a PRD, make the agent find and read the existing project documentation before it writes requirements.
If the PRD cites nothing the repository already does, expect to rework the design once the implementation meets the real code.
