---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-existing-codebases-start-in-an-existing-codebase-md-fbefe41e-c01"
title: "bmad-method: docs/existing-codebases/start-in-an-existing-codebase.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:docs/existing-codebases/start-in-an-existing-codebase.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/existing-codebases/start-in-an-existing-codebase.md\"}"
atom_ids:
  - let-the-code-be-the-source-not-prose-about-it
  - load-the-planning-documents-that-constrain-the-intent
atom_count: 2
atoms: "[{\"atom_id\":\"let-the-code-be-the-source-not-prose-about-it\",\"file_sha256\":\"c92e484e7e40aee11d235c63dd0de4a4575d1cc48a30d952c6de63e5a696fc9b\",\"content_sha256\":\"05e2574909d7d750d8456f2d1dd0c91aef41134b43211bdcd6e930bbbfe2b823\",\"file_bytes\":1987,\"body_bytes\":632},{\"atom_id\":\"load-the-planning-documents-that-constrain-the-intent\",\"file_sha256\":\"50b0409ec224d0cbfb384338ecebedd40ed353cd207a598a024382955dc85f81\",\"content_sha256\":\"418fc2c8b3da293008e82e1a2088f7c2d91a4478c264f1b1a6933fd8d8a504d7\",\"file_bytes\":2247,\"body_bytes\":870}]"
carrier_sha256: c07d874d7b7825f344b96653282cc0344fbaaaea0f582abcf866cf68e4ca8e3d
carrier_bytes: 4545
revision: 1
status: active
---
<!-- vpmodule:atom:begin let-the-code-be-the-source-not-prose-about-it -->
---
instruction_id: let-the-code-be-the-source-not-prose-about-it
title: "Let the code be the source, not prose about it"
summary: Do not feed the agent textual descriptions of what it can read in the source; they contradict the code and cost context on every call.
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
conditions_applies_when: Material is prepared for an agent that works in a repository it can read.
conditions_does_not_apply_when: The agent cannot read the source and the prose is the only record.
artifact_contract_output_type: context-source-choice
artifact_contract_required_data:
  - what the agent can read
  - what stays archived
  - the contradiction removed
artifact_contract_verified_by: "no prose restates what the source already says and the archived material is out of the ordinary change's reach"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/start-in-an-existing-codebase.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/theory-of-project-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Let the code be the source, not prose about it
Most of the knowledge about this application is already encoded in its source.
Modern agents are trained very well to get knowledge from code.
Feeding them textual descriptions of things they can already read there creates contradiction, ambiguity, and context-window bloat.
So what the agent can read cheaply first-hand is read live and never stored.
A stored copy goes stale and costs tokens on every call.
Keep it archived for the few sessions that need it, and out of reach of an ordinary change — an agent doing a small request should not even be able to find it by accident.
<!-- vpmodule:atom:end let-the-code-be-the-source-not-prose-about-it -->
<!-- vpmodule:atom:begin load-the-planning-documents-that-constrain-the-intent -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/start-in-an-existing-codebase.md
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
<!-- vpmodule:atom:end load-the-planning-documents-that-constrain-the-intent -->