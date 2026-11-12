---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-walkthrough-step-03-walkthrough-md-5e896dd3-c02"
title: "bmad-method: skills/bmad-walkthrough/step-03-walkthrough.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-walkthrough/step-03-walkthrough.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-walkthrough/step-03-walkthrough.md\"}"
atom_ids:
  - rewrite-a-block-in-the-shape-the-reviewer-names
  - start-a-move-only-when-the-user-picks-it
  - suggest-a-few-moves-that-fit-and-stop
  - use-the-formal-review-skill-for-the-formal-review-move
atom_count: 4
atoms: "[{\"atom_id\":\"rewrite-a-block-in-the-shape-the-reviewer-names\",\"file_sha256\":\"0425f485a04c4c6ff8946900a54eaf3891d23fb94b4a921e4346c1ccbc0b84a1\",\"content_sha256\":\"d7a4fc00ad6c36e9ef1e81bab9643dadfddd9a0251b66649eceb6a2c06736780\",\"file_bytes\":1515,\"body_bytes\":326},{\"atom_id\":\"start-a-move-only-when-the-user-picks-it\",\"file_sha256\":\"d378c3087714fb6a51a811117603efa261b7011fc9692d450c23113335a95918\",\"content_sha256\":\"371e3d3a5b4030c2c1961079f90368bd03d129bb8356254a495717444f9be67b\",\"file_bytes\":1261,\"body_bytes\":211},{\"atom_id\":\"suggest-a-few-moves-that-fit-and-stop\",\"file_sha256\":\"56e903756f36c271d2a95c713917060ce91f4df383a6f9547bbdd68d60d8a8f6\",\"content_sha256\":\"131c5cbbbc4358ce2d4b5f4bed59055ce76f8ff97e843635b1c3a2be260618ec\",\"file_bytes\":1775,\"body_bytes\":741},{\"atom_id\":\"use-the-formal-review-skill-for-the-formal-review-move\",\"file_sha256\":\"e8b90697eac646b01cd0be07bd816363a2874aed63896d18d3ac78c64694456f\",\"content_sha256\":\"3ac72b2efa0188d7ef183f1f697ceb5cfe50ebee6e9199e12733e1988dd939df\",\"file_bytes\":1348,\"body_bytes\":281}]"
carrier_sha256: ea4505fe23a1aa327cb6ff1fd4602db7b0d6665afb8ca52ae403fb257537843d
carrier_bytes: 6486
revision: 1
status: active
---
<!-- vpmodule:atom:begin rewrite-a-block-in-the-shape-the-reviewer-names -->
---
instruction_id: rewrite-a-block-in-the-shape-the-reviewer-names
title: Rewrite a block in the shape the reviewer names
summary: "A rejected shape is rewritten the way the reviewer describes it, and the constraint is carried into every later block."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - approval-policy
conditions_applies_when: The reviewer rejects the shape of a block and says what shape they want.
conditions_does_not_apply_when: The reviewer asked for a change in the content rather than in the shape.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the rewritten block
  - the constraint recorded for the later blocks
artifact_contract_verified_by: "the block was rewritten in the named shape in both the session and the narrative, and the constraint is in the log"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Rewrite a block in the shape the reviewer names
If they reject a block's shape, rewrite that block in the shape they describe, in both the session and the narrative, and record the constraint in the log so it applies to every later block.
Do not present the same block a third time in a different shape without being asked.
<!-- vpmodule:atom:end rewrite-a-block-in-the-shape-the-reviewer-names -->
<!-- vpmodule:atom:begin start-a-move-only-when-the-user-picks-it -->
---
instruction_id: start-a-move-only-when-the-user-picks-it
title: Start a move only when the user picks it
summary: "The moves are a repertoire; one starts only when the reviewer picks it, and its outcome goes to the log."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: A repertoire of moves is offered during a review.
conditions_does_not_apply_when: The reviewer has already chosen the move.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the picked move
  - the outcome of the move
artifact_contract_verified_by: the outcome of the move is in the log and the reviewer kept their place in the narrative
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Start a move only when the user picks it
A repertoire the user may select from. Do not start a move unless the user picks it.
Record the outcome in the review log and keep their place in the review narrative.
<!-- vpmodule:atom:end start-a-move-only-when-the-user-picks-it -->
<!-- vpmodule:atom:begin suggest-a-few-moves-that-fit-and-stop -->
---
instruction_id: suggest-a-few-moves-that-fit-and-stop
title: "Suggest a few moves that fit, then stop"
summary: "Offer a short list of moves that fit, then stop and let the reviewer pick."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: A block is up for review and the reviewer has to choose what happens next.
conditions_does_not_apply_when: The reviewer has already named the move they want.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the moves that fit
  - the block they belong to
artifact_contract_verified_by: one to three moves are offered and the turn ends after the offer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Suggest a few moves that fit, then stop
Give the block's link into the narrative, its content in that block's shape.
On block 1, list the moves in one line so the user knows the repertoire; past seven, name seven at random and say how many more there are.
On every block, suggest 1-3 moves that fit; when more fit than you will name, prefer ones not yet suggested in this review. Then stop. The named moves are not exhaustive; if something else is more obvious, suggest that instead.
The user may choose something you did not suggest, or just ask a question: answer it in this session with clickable references, without any formal review skill. Do what the user says. Stay with the current block until the user explicitly says it is done.
<!-- vpmodule:atom:end suggest-a-few-moves-that-fit-and-stop -->
<!-- vpmodule:atom:begin use-the-formal-review-skill-for-the-formal-review-move -->
---
instruction_id: use-the-formal-review-skill-for-the-formal-review-move
title: Use the formal review skill for the formal review move
summary: The formal review move runs the most appropriate formal review skill that is installed.
capability_tags:
  - review-code
pattern_tags:
  - approval-policy
conditions_applies_when: The reviewer picks the move that runs a formal review.
conditions_does_not_apply_when: No formal review skill is installed for the kind of work under review.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the formal review skill that was used
artifact_contract_verified_by: the move was carried out by the installed formal review skill and not improvised
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Use the formal review skill for the formal review move
Formal review: Use the most appropriate formal review skill available. If it's code and the `bmad-code-review` skill is installed, prefer that unless the user says otherwise. Suggest it for the riskiest block of the change.
<!-- vpmodule:atom:end use-the-formal-review-skill-for-the-formal-review-move -->