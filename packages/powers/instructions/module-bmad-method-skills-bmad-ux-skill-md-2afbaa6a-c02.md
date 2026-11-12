---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-ux-skill-md-2afbaa6a-c02"
title: "bmad-method: skills/bmad-ux/SKILL.md module"
summary: "Carrier for 6 atomic instructions from bmad-method:skills/bmad-ux/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-ux/SKILL.md\"}"
atom_ids:
  - offer-the-review-lenses-and-dispatch-only-the-chosen-ones
  - promote-only-the-artifacts-a-future-reader-would-open
  - surface-the-input-paths-and-let-the-user-confirm
  - triage-the-open-items-one-blocker-at-a-time
  - write-the-design-as-two-peer-documents
  - write-the-journey-with-a-named-protagonist-and-a-climax
atom_count: 6
atoms: "[{\"atom_id\":\"offer-the-review-lenses-and-dispatch-only-the-chosen-ones\",\"file_sha256\":\"248e1a7fef60a031410a601c8c38053c4753e26117c73c1bb3ccaf5b93d0fa9a\",\"content_sha256\":\"a8b88b189cd8b6b7e90a2b39fc6832766bddce201344de64130f18acd07697ab\",\"file_bytes\":1827,\"body_bytes\":623},{\"atom_id\":\"promote-only-the-artifacts-a-future-reader-would-open\",\"file_sha256\":\"3c6651084498ef9b101689ced55d8928339ce3b79032ec121590511c339f257d\",\"content_sha256\":\"48a18b321b6eb63bba72fcc11a4e1132fb2a6c621da7ad4c9ba9ff44fe2470c8\",\"file_bytes\":1946,\"body_bytes\":605},{\"atom_id\":\"surface-the-input-paths-and-let-the-user-confirm\",\"file_sha256\":\"3d6eb20b0287313503f76c31c6c4f6d0d26ebb47d93d3989152aa3b181afac54\",\"content_sha256\":\"200342df1abe37d52d487104386f2c441d79031920fd7d4e66478524d444cdef\",\"file_bytes\":1842,\"body_bytes\":719},{\"atom_id\":\"triage-the-open-items-one-blocker-at-a-time\",\"file_sha256\":\"9f27bab3c6f86de4526202493f5c48e54ccaf5e387901057e9442b98de0dda4f\",\"content_sha256\":\"d39a1d7ce9ae694d2d84d882faf061be8dbc8c319aeb633b1e3ac79dc9a03ce7\",\"file_bytes\":1236,\"body_bytes\":162},{\"atom_id\":\"write-the-design-as-two-peer-documents\",\"file_sha256\":\"09afd098c3a63a8692a1b6c614b57f3a9573a69b2089263fa2dce65597766ec5\",\"content_sha256\":\"c0bac79fb39380181db5606c7bb7b1e8421f746c2515de5f200ec11ad32c141e\",\"file_bytes\":1570,\"body_bytes\":405},{\"atom_id\":\"write-the-journey-with-a-named-protagonist-and-a-climax\",\"file_sha256\":\"b715d1bb4fe7e64d18e02f31ef5402db4e3288653c519f6f518162807f3eed27\",\"content_sha256\":\"b95695e2d37d651fc4e8ae9158bdcb263c91453954abe4ddec01f1d6340aa467\",\"file_bytes\":1493,\"body_bytes\":339}]"
carrier_sha256: 9b699da2295f17a832ca757d5ffdc5e11853ae4ae5552f157d14f2bd7613273f
carrier_bytes: 10849
revision: 1
status: active
---
<!-- vpmodule:atom:begin offer-the-review-lenses-and-dispatch-only-the-chosen-ones -->
---
instruction_id: offer-the-review-lenses-and-dispatch-only-the-chosen-ones
title: Offer the review lenses and dispatch only the chosen ones
summary: "Reviewers are costly, so the review is opt-in: at finalisation ask whether to validate at all, present the lens menu, and dispatch only the lenses the person picks."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A design is about to be reviewed.
conditions_does_not_apply_when: The review was already requested and the lenses were already chosen.
artifact_contract_output_type: review-dispatch
artifact_contract_required_data:
  - the lens menu
  - the chosen lenses
artifact_contract_verified_by: the menu was presented and only the chosen lenses ran
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/references/validate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Offer the review lenses and dispatch only the chosen ones
Opt-in, lens-selectable — reviewers are costly (parallel subagents, substantial token spend).
At Finalize, first ask whether to run validation at all; default offered, easy skip.
At Validate intent the user already opted in — skip that question.
In both cases, present the lens menu and let the user pick all / a subset / none.
Always present the lens picks before dispatching.
Only picked lenses dispatch.
Picked lenses dispatch as parallel subagents → each writes `review-{lens}.md`, returns a compact summary.
If any lens ran, run the synthesis pipeline
<!-- vpmodule:atom:end offer-the-review-lenses-and-dispatch-only-the-chosen-ones -->
<!-- vpmodule:atom:begin promote-only-the-artifacts-a-future-reader-would-open -->
---
instruction_id: promote-only-the-artifacts-a-future-reader-would-open
title: Promote only the artifacts a future reader would open
summary: "Walk the working folder with the person and promote only the artifacts with lasting reference value; the bar is whether a future reader of the design documents would open it, and the default is to leave it where it is."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - progressive-disclosure
conditions_applies_when: The run produced visual artifacts that could be kept.
conditions_does_not_apply_when: There are no visual artifacts to promote.
artifact_contract_output_type: promotion-set
artifact_contract_required_data:
  - the promoted artifacts
  - the artifacts left behind
artifact_contract_verified_by: every promoted artifact passes the bar and every unpromoted one is left in the working folder
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/references/creative-tools.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - operations
---

# Promote only the artifacts a future reader would open
At Finalize, the facilitator walks `.working/` with the user and promotes artifacts with lasting reference value
Bar for promotion: *would a future reader of `DESIGN.md` or `EXPERIENCE.md` open this?* Default is leave-in-`.working/`.
`.working/` is the audit trail and survives the run.
Lifts visual decisions into DESIGN.md and behavioral decisions into EXPERIENCE.md.
Promote `.working/` keepers to `mockups/` (HTML) or `wireframes/` (Excalidraw); imports stay.
Inline relative links at relevant spine sections; state spines-win-on-conflict once.
<!-- vpmodule:atom:end promote-only-the-artifacts-a-future-reader-would-open -->
<!-- vpmodule:atom:begin surface-the-input-paths-and-let-the-user-confirm -->
---
instruction_id: surface-the-input-paths-and-let-the-user-confirm
title: Surface the input paths and let the user confirm
summary: "Read the ticket in full when one exists; with no ticket, list candidate inputs by type, surface the paths only, and let a subagent extract on confirm."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: Several candidate source documents could inform the work.
conditions_does_not_apply_when: The sources are already known and read.
artifact_contract_output_type: input-selection
artifact_contract_required_data:
  - the candidate paths by type
  - the confirmed set
artifact_contract_verified_by: "the ticket was read in full, or the confirmed sources were read by the extractor, not the parent"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Surface the input paths and let the user confirm
When a ticket exists for the work, find it (`initiative-*.md`, `tickets/epic-*/epic-*.md`, and story/bug/spike files in a `tickets/` folder under `{output_folder}/{active_initiative}/`) and read it in full in the parent. Its Requirements are the brief; its `sources:` and `companions:` list what else exists. Open one of those only for a need the ticket points at; never re-derive requirements from a PRD or brief it already distilled.
With no ticket, list candidate inputs by type — `<type>-*/<type>-*.md` for `brief`, `prd`, `spec`, `architecture`, `research` — and let the user confirm.
Surface paths only when there is no ticket; subagent-extracts on confirm.
<!-- vpmodule:atom:end surface-the-input-paths-and-let-the-user-confirm -->
<!-- vpmodule:atom:begin triage-the-open-items-one-blocker-at-a-time -->
---
instruction_id: triage-the-open-items-one-blocker-at-a-time
title: Triage the open items one blocker at a time
summary: "The open questions, the assumptions and the notes are triaged: a phase blocker is settled one at a time, everything else is logged and carried."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: Open items are waiting when the design is closed.
conditions_does_not_apply_when: There are no open items.
artifact_contract_output_type: open-item-triage
artifact_contract_required_data:
  - the open items
  - the blocker that was settled
  - the items that were carried
artifact_contract_verified_by: each phase blocker was settled on its own and the rest were logged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - operations
---

# Triage the open items one blocker at a time
Open Questions, `[ASSUMPTION]`, `[NOTE FOR UX]`.
Phase-blockers one at a time; non-blockers → `memlog.py append`.
<!-- vpmodule:atom:end triage-the-open-items-one-blocker-at-a-time -->
<!-- vpmodule:atom:begin write-the-design-as-two-peer-documents -->
---
instruction_id: write-the-design-as-two-peer-documents
title: Write the design as two peer documents
summary: "One document owns how it looks, the other owns how it works, and the second references the first tokens by name; both win on conflict with any mock, wireframe or import."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - two-spine-contract
conditions_applies_when: A design is written as a contract for downstream consumers.
conditions_does_not_apply_when: The design is a single page or a throwaway prototype.
artifact_contract_output_type: design-pair
artifact_contract_required_data:
  - the visual identity document
  - the experience document
  - the token references between them
artifact_contract_verified_by: every token reference resolves by name and both documents state that they win on conflict
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Write the design as two peer documents
Produce two peer contracts: `DESIGN.md` (visual identity — owns *how it looks*) and `EXPERIENCE.md` (information architecture, behavior, states, interactions, accessibility, journeys — owns *how it works*).
EXPERIENCE.md cross-references DESIGN.md tokens by name using `{path.to.token}` syntax.
Both spines win on conflict with any mock, wireframe, or import.
<!-- vpmodule:atom:end write-the-design-as-two-peer-documents -->
<!-- vpmodule:atom:begin write-the-journey-with-a-named-protagonist-and-a-climax -->
---
instruction_id: write-the-journey-with-a-named-protagonist-and-a-climax
title: Write the journey with a named protagonist and a climax
summary: "The journey is a real session narrated by a named person, structured into numbered steps with a climax beat, and ticket or source names are mirrored verbatim when they are defined."
capability_tags:
  - design-user-interface
pattern_tags:
  - named-protagonist-journey
conditions_applies_when: A key flow is written for the experience document.
conditions_does_not_apply_when: The flow is a technical sequence with no person in it.
artifact_contract_output_type: key-flow
artifact_contract_required_data:
  - the named protagonist
  - the numbered steps
  - the climax beat
artifact_contract_verified_by: "the flow names its protagonist, numbers its steps and has a climax beat"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Write the journey with a named protagonist and a climax
User narrates a real session with a named protagonist (Mary, mom of three, kids asleep — not "the user"); structure into numbered steps with a climax beat.
Mirror the ticket's journey and requirement names verbatim when they are defined; with no ticket, mirror the source names.
<!-- vpmodule:atom:end write-the-journey-with-a-named-protagonist-and-a-climax -->