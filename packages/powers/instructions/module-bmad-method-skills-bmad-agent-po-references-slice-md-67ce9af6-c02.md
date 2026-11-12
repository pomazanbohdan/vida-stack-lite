---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-references-slice-md-67ce9af6-c02"
title: "bmad-method: skills/bmad-agent-po/references/slice.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-agent-po/references/slice.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/references/slice.md\"}"
atom_ids:
  - put-the-platform-baseline-in-the-opening-epic
  - refine-an-epic-before-planning-its-stories
  - split-never-shrink
  - split-only-for-a-distinct-outcome-or-owner
atom_count: 4
atoms: "[{\"atom_id\":\"put-the-platform-baseline-in-the-opening-epic\",\"file_sha256\":\"7d16b7c667c327924c3c27e3dcbda7ab592d5cfaac533d3d4479591e48cd9fc0\",\"content_sha256\":\"f9a0707d9968e1b6971c97e28fbe72bd003889a57e3087bc7f728d786749ab9f\",\"file_bytes\":1543,\"body_bytes\":349},{\"atom_id\":\"refine-an-epic-before-planning-its-stories\",\"file_sha256\":\"f405cdfe2be70cc50bf361ccd6cedce4dead919d38d5a74c31af82e70e7a53fd\",\"content_sha256\":\"c9f58bdbeda0a083b4840d91a52ff0938289fa25a6f89d2e2310c8bdb8028395\",\"file_bytes\":1955,\"body_bytes\":664},{\"atom_id\":\"split-never-shrink\",\"file_sha256\":\"956f5f3fa2d8bf36e0117dadb9826c4227eacf91ea69f5710d3578dfd239933d\",\"content_sha256\":\"63abf2551a708e19fb03fa0914630894e03ce547b7a85d032ca1426fcbc941bd\",\"file_bytes\":1714,\"body_bytes\":470},{\"atom_id\":\"split-only-for-a-distinct-outcome-or-owner\",\"file_sha256\":\"a0e2ac3501e59f90d03741bcb5a365886c01f3f76944d4074137fd15913eb0ea\",\"content_sha256\":\"a578df591583bdf27998681f7443eb4008f7d904e124a46d8317277f727e18fc\",\"file_bytes\":2175,\"body_bytes\":947}]"
carrier_sha256: b0c1cb7ecaa20c0c711b54806ee6de7258b4f303d962abe65a092bc3f01bbd8f
carrier_bytes: 7912
revision: 1
status: active
---
<!-- vpmodule:atom:begin put-the-platform-baseline-in-the-opening-epic -->
---
instruction_id: put-the-platform-baseline-in-the-opening-epic
title: Put the platform baseline in the opening container
summary: "The scaffold, the environments, the pipeline, the deployment and the operations are the opening container, and every container delivers to production."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: A set of containers is being cut for work that needs scaffolding to run.
conditions_does_not_apply_when: The platform baseline already exists and needs no container.
artifact_contract_output_type: baseline-placement
artifact_contract_required_data:
  - where the baseline sits
  - the production delivery each container owes
artifact_contract_verified_by: the baseline is the opening container and every container delivers to production
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Put the platform baseline in the opening container
The platform baseline (scaffold, environments, CI, deployment, operations) is the opening epic, the first `[[epic]]` in the initiative's breakdown, or the first stories of the first epic.
Every epic delivers to production; its Done when includes the integrated verification for what it delivers.
<!-- vpmodule:atom:end put-the-platform-baseline-in-the-opening-epic -->
<!-- vpmodule:atom:begin refine-an-epic-before-planning-its-stories -->
---
instruction_id: refine-an-epic-before-planning-its-stories
title: Refine an epic before planning its stories
summary: "An epic with `refined: false` has its scope agreed, not its detail; refine it on request or before planning its stories, then write its Requirements and set `refined: true`."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
  - requirements-clarification
conditions_applies_when: An epic is planned into stories, or the user asks to refine it.
conditions_does_not_apply_when: The epic is already refined or its stories are not being planned.
artifact_contract_output_type: refined-epic
artifact_contract_required_data:
  - what the epic, its parent and companions already settle
  - each open point and its pick
  - the epic's Requirements
artifact_contract_verified_by: "the epic's open points are settled or assigned, its Requirements are written, and `refined: true` is set"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - engineering
---

# Refine an epic before planning its stories
An epic with `refined: false` has its scope agreed, not its detail.
Refine it on request or before planning its stories. Read the epic file and the initiative Requirements lines it covers.
In one message, scaled to the initiative: what the epic, the initiative and their companions already settle for its stories; each thing its stories would have to agree on that is still open, with a pick — settle it now, plan a spike first when only code can answer it, or leave it to the stories; and a reminder that the user can add intent, design or research to the epic.
An epic file with no `refined` key counts as refined.
<!-- vpmodule:atom:end refine-an-epic-before-planning-its-stories -->
<!-- vpmodule:atom:begin split-never-shrink -->
---
instruction_id: split-never-shrink
title: "Split, never shrink"
summary: "A reduced scope — \"for now\", placeholder, simplified, wired later — is a second item, not a smaller first one, and the listed words are prohibited in a task action."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: An item is proposed at a reduced scope.
conditions_does_not_apply_when: The item is proposed at its full scope.
artifact_contract_output_type: split-decision
artifact_contract_required_data:
  - the full scope
  - the second item that carries the reduced part
  - the prohibited wording that was used
artifact_contract_verified_by: the reduced part is a second item and not a smaller first one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Split, never shrink
Split, never shrink: "for now", "placeholder", "simplified", "wired later" is a second story.

**Prohibited language in task actions:**
- "v1", "v2", "simplified version", "static for now", "hardcoded for now"
- "future enhancement", "placeholder", "basic version", "minimal implementation"
- "will be wired later", "dynamic in future phase", "skip for now"

If the phase is too complex, recommend a phase split instead of silently reducing scope.
<!-- vpmodule:atom:end split-never-shrink -->
<!-- vpmodule:atom:begin split-only-for-a-distinct-outcome-or-owner -->
---
instruction_id: split-only-for-a-distinct-outcome-or-owner
title: Split only for a distinct outcome or an early-usable part
summary: "Work is split only for a distinct outcome or a part the user wants usable early — never for a count or an owner — and a unit the work only consumes gets no container of its own."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: A body of work is about to be cut into more than one container.
conditions_does_not_apply_when: The cut is already decided.
artifact_contract_output_type: split-decision
artifact_contract_required_data:
  - the reason for the cut
  - the units that get no container of their own
  - the outcome or early-usable part each cut delivers
artifact_contract_verified_by: "every cut has a distinct outcome or early-usable part, and no cut exists for a count"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Split only for a distinct outcome or an early-usable part
No boundary applies: one epic. Split only for a distinct outcome or a part the user wants usable early, never for a ticket count or an owner.
A unit the work only consumes or configures gets no epic: it is a touch point, named in the initiative's Boundaries with the epic that owns the work there.
When an initiative has epics, every story is under an epic. Work that fits one epic is proposed as one epic; say so.
When the work is more than one initiative's worth, propose a parent initiative over child initiatives, not epics inside epics; the parent holds the shared Requirements and no epics or entries.
Never offer an initiative without epics except as that parent: a single initiative with stories directly underneath happens only at the user's request, is planned like an epic with stories directly underneath, and you say once that the initiative folder fills with ticket files.
<!-- vpmodule:atom:end split-only-for-a-distinct-outcome-or-owner -->