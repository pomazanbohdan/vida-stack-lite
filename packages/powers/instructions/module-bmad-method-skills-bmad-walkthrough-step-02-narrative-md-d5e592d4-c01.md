---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-walkthrough-step-02-narrative-md-d5e592d4-c01"
title: "bmad-method: skills/bmad-walkthrough/step-02-narrative.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-walkthrough/step-02-narrative.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-walkthrough/step-02-narrative.md\"}"
atom_ids:
  - accept-a-block-only-when-the-user-says-so
  - keep-findings-and-decisions-out-of-the-narrative
atom_count: 2
atoms: "[{\"atom_id\":\"accept-a-block-only-when-the-user-says-so\",\"file_sha256\":\"02df9649cdba49dc6619ff525926cc2d33d567827dfa00bf938bcb9e5271a8b9\",\"content_sha256\":\"ad1ec614844b9c70957bac71a67b2695083b7694e23443fc18699c32850f8e2a\",\"file_bytes\":2033,\"body_bytes\":658},{\"atom_id\":\"keep-findings-and-decisions-out-of-the-narrative\",\"file_sha256\":\"8378b92689e42323f28f8f4b800ef7578fc5eef12baf6245ec622925167f07a8\",\"content_sha256\":\"7045d7ef259c0bde8f5a8726aa46bee5e00f992fdc0fc44f26cbf1109b6a3b46\",\"file_bytes\":1487,\"body_bytes\":214}]"
carrier_sha256: 5b9e8c605c00407c9196cb5bd6abf97f2ec38c9c12a5d7cf2b8077814044f828
carrier_bytes: 3813
revision: 1
status: active
---
<!-- vpmodule:atom:begin accept-a-block-only-when-the-user-says-so -->
---
instruction_id: accept-a-block-only-when-the-user-says-so
title: Accept a block only when the user says so
summary: "A walkthrough block is finished when the reviewer says it is, never because the work on it is done."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - approval-policy
conditions_applies_when: A guided review walks a human through a body of work one block at a time.
conditions_does_not_apply_when: The work is not paced by a human reviewer in the loop.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the block list
  - the acceptance state of each block
  - the current block
artifact_contract_verified_by: a block is checked only after the user has said it is done
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/workflow.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-02-narrative.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/hard-stop-safety-gates-in-gsd-progress-next.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - operations
---

# Accept a block only when the user says so
Guide a human review of a target, one block at a time. They may stop to inspect, edit, or test.
Keep track of which blocks the user has called done. A block or the review as a whole is done only when the user says it is.
Use unchecked boxes for unvisited, in-progress, or reopened blocks, labeling their state; check a block when the user indicates they are satisfied with it.
Work performed on a block does not itself mean it is accepted.
MUST track consecutive same-step calls
On repeated same-step, system MUST present a hard stop gate to the user
User MUST explicitly confirm to continue past a hard stop gate
<!-- vpmodule:atom:end accept-a-block-only-when-the-user-says-so -->
<!-- vpmodule:atom:begin keep-findings-and-decisions-out-of-the-narrative -->
---
instruction_id: keep-findings-and-decisions-out-of-the-narrative
title: Keep findings and decisions out of the narrative
summary: "The human-facing file holds the blocks and their states; the log holds findings, decisions, edits and test results."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: "A review produces two files: a human-facing narrative and a log."
conditions_does_not_apply_when: The work produces a single file that is either the narrative or the log.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the blocks and their states
  - the findings and decisions in the log
artifact_contract_verified_by: "the narrative carries no finding, decision, edit or test result"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-02-narrative.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/templates/log-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep findings and decisions out of the narrative
Keep findings, decisions, edits, and test results out of the review narrative.
The review narrative (the human-facing file) owns review blocks and their statuses.
<!-- vpmodule:atom:end keep-findings-and-decisions-out-of-the-narrative -->