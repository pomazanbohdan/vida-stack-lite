---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-engineering-to-tickets-skill-md-34d50cb7-c01"
title: "matt-skills: skills/engineering/to-tickets/SKILL.md module"
summary: "Carrier for 2 atomic instructions from matt-skills:skills/engineering/to-tickets/SKILL.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/engineering/to-tickets/SKILL.md\"}"
atom_ids:
  - sequence-wide-refactors-expand-contract
  - write-tracer-bullet-tickets
atom_count: 2
atoms: "[{\"atom_id\":\"sequence-wide-refactors-expand-contract\",\"file_sha256\":\"9e88d3b65e8a89a538275d116b52e6b26741f08ad5730ae49b7a80fc2ecdae69\",\"content_sha256\":\"85875fa9f8da5d8e1bab7151c6d1df006dfbe365e7f65b199d10b2d48338414f\",\"file_bytes\":2028,\"body_bytes\":923},{\"atom_id\":\"write-tracer-bullet-tickets\",\"file_sha256\":\"70ca3a602109e9c3c1a404725da31f3dc85d4ed2e433fc98fa5d0f8b92dd90ad\",\"content_sha256\":\"4cb72c3ac3032b66b892c208d6a1676fb4a78a1d1ecba0e3298501724fb5cd3b\",\"file_bytes\":3025,\"body_bytes\":1848}]"
carrier_sha256: 34c1e7bc56be9c011a113697e4fde7e0541d179c01993d6947cc10a52a7efa7e
carrier_bytes: 5300
revision: 1
status: active
---
<!-- vpmodule:atom:begin sequence-wide-refactors-expand-contract -->
---
instruction_id: sequence-wide-refactors-expand-contract
title: Sequence wide refactors expand-contract
summary: "Sequence a wide refactor as expand, migrate in batches, then contract, keeping the build green at each step."
capability_tags:
  - plan-implementation
pattern_tags:
  - expand-contract
conditions_applies_when: One mechanical change has a blast radius too wide for a vertical slice.
conditions_does_not_apply_when: The change fits in one vertical slice.
artifact_contract_output_type: refactor-sequence
artifact_contract_required_data:
  - expand step
  - migrate batches
  - contract step
  - green check per step
artifact_contract_verified_by: the old form still exists during migration and is deleted only after the last caller
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/to-tickets/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Sequence wide refactors expand-contract
A **wide refactor** is one mechanical change (rename a column, retype a shared symbol) whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**.
First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch. When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket; green is promised only there.
<!-- vpmodule:atom:end sequence-wide-refactors-expand-contract -->
<!-- vpmodule:atom:begin write-tracer-bullet-tickets -->
---
instruction_id: write-tracer-bullet-tickets
title: Write tracer bullet tickets
summary: "Break work into tracer-bullet vertical slices, each a complete path through every layer and each declaring its blocking edges."
capability_tags:
  - plan-implementation
pattern_tags:
  - vertical-slicing
conditions_applies_when: "A plan, spec or conversation must be broken into work items."
conditions_does_not_apply_when: The work is a single wide mechanical refactor.
artifact_contract_output_type: ticket-set
artifact_contract_required_data:
  - slices
  - blocking edges
  - acceptance criteria
artifact_contract_verified_by: each slice is demoable alone and its blockers are real gates
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/to-tickets/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Write tracer bullet tickets
Break a plan, spec, or conversation into a set of **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it.
### Draft vertical slices
Break the work into **tracer bullet** tickets.
- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests): vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first
Give each ticket its **blocking edges**: the other tickets that must complete before it can start. A ticket with no blockers can start immediately.
### Quiz the user
Present the proposed breakdown as a numbered list. For each ticket, show:
- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **What it delivers**: the end-to-end behaviour this ticket makes work
Ask the user:
- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct: does each ticket only depend on tickets that genuinely gate it?
- Should any tickets be merged or split further?
Iterate until the user approves the breakdown.
Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.
Do NOT close or modify any parent issue.
In either form, avoid specific file paths or code snippets: they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype.
No source-code paths or snippets; the builder reads the repo.
A snippet stays only when it is the decision itself, not an illustration of it.
A path the user wants recorded goes in Notes.
<!-- vpmodule:atom:end write-tracer-bullet-tickets -->