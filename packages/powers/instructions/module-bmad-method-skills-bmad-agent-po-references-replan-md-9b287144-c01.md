---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-references-replan-md-9b287144-c01"
title: "bmad-method: skills/bmad-agent-po/references/replan.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-agent-po/references/replan.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/references/replan.md\"}"
atom_ids:
  - analyze-the-change-factually-and-without-blame
  - assess-the-impact-across-every-artifact
  - classify-the-change-scope-and-route-the-handoff
  - evaluate-every-path-forward-before-recommending-one
  - get-explicit-approval-before-applying-the-change
  - ground-the-change-in-a-concrete-trigger-and-evidence
  - halt-with-the-reason-when-a-precondition-is-missing
  - propose-the-change-as-a-before-and-after-edit
atom_count: 8
atoms: "[{\"atom_id\":\"analyze-the-change-factually-and-without-blame\",\"file_sha256\":\"966f74b490c15dc9b4595476e75086f300d5c2c5f06c059ffb2eeb008582684a\",\"content_sha256\":\"fb7d7d8c97d00a7e323a1d490c5ff3dfb753db3a7444c7f873b375ce82a0752f\",\"file_bytes\":1458,\"body_bytes\":299},{\"atom_id\":\"assess-the-impact-across-every-artifact\",\"file_sha256\":\"bc5e259822e399d9468f4c54ab0189ebf52e7aa0424768c9c6c7449232b86d27\",\"content_sha256\":\"601ab1574f7c03061397099e21effe57fd24b8b353352d1df55e196ed657d406\",\"file_bytes\":1927,\"body_bytes\":716},{\"atom_id\":\"classify-the-change-scope-and-route-the-handoff\",\"file_sha256\":\"c3d69f601285adc59d1228851bfe85c2777c3ec83d1bdcde053b468c426f4965\",\"content_sha256\":\"9873e3ad4af55959ac5c0357f64cbfaacc91d08b60fe787b6b31886d9324d9a6\",\"file_bytes\":1913,\"body_bytes\":672},{\"atom_id\":\"evaluate-every-path-forward-before-recommending-one\",\"file_sha256\":\"2844cd17d30568ab5fdae7822c966c5e42420bf9f512d976e06335fb737727ad\",\"content_sha256\":\"f93acd0f27f75a8ec08edc9b032c7ef75c3c2256e3fc43d5858fef026108b9b2\",\"file_bytes\":1860,\"body_bytes\":586},{\"atom_id\":\"get-explicit-approval-before-applying-the-change\",\"file_sha256\":\"32a14f5f7a8b4b15baa1c31b5d9d0a07f336b6027f5d5fb83d631d5819784c52\",\"content_sha256\":\"cfcd851132c58840647dc802effc0f30487d6041a977b47273c834771d072dc9\",\"file_bytes\":2306,\"body_bytes\":884},{\"atom_id\":\"ground-the-change-in-a-concrete-trigger-and-evidence\",\"file_sha256\":\"7021a389ae81734a6921cf71295a70b0d063643f4798be1a4a03866ebf1c2526\",\"content_sha256\":\"dbeb8171aeb23d4afb5fdaa0e27bf8704e96682b8c702b1a38766a73492df35b\",\"file_bytes\":1687,\"body_bytes\":477},{\"atom_id\":\"halt-with-the-reason-when-a-precondition-is-missing\",\"file_sha256\":\"4694e7b82e05a6ef7c8b312a09d16efed001d58b46683433cb7676ac0c253b66\",\"content_sha256\":\"53dfc1491b94ee10b21033321416070e849040c18975c53e00712ee29e74bb1d\",\"file_bytes\":2232,\"body_bytes\":964},{\"atom_id\":\"propose-the-change-as-a-before-and-after-edit\",\"file_sha256\":\"1912586f8122d1aabedd218ded5a9248d7e090418904bc9a2a79ea9af3a4d500\",\"content_sha256\":\"c53ac2822b09c50f6eec1b6ea30aa96f830d93a912917c090c5f213b698bcd0a\",\"file_bytes\":1691,\"body_bytes\":483}]"
carrier_sha256: 3f7a6253d10eee91a00ccc79036535b44d125df3f77ddf5d4f7519610c791ae0
carrier_bytes: 16295
revision: 1
status: active
---
<!-- vpmodule:atom:begin analyze-the-change-factually-and-without-blame -->
---
instruction_id: analyze-the-change-factually-and-without-blame
title: Analyze the change factually and without blame
summary: "State what happened without attributing fault, treat the change as an opportunity, and keep the decision with the person who owns it."
capability_tags:
  - assess-change-impact
pattern_tags:
  - non-blaming-analysis
conditions_applies_when: A change is being analysed with the person who owns the project.
conditions_does_not_apply_when: The analysis is a mechanical report with no human party involved.
artifact_contract_output_type: change-analysis
artifact_contract_required_data:
  - the facts
  - the opportunity
  - the decision that stays with the owner
artifact_contract_verified_by: the analysis names causes without assigning fault and the decision was left with the owner
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Analyze the change factually and without blame
Be factual, not blame-oriented when analyzing issues
Handle changes professionally as opportunities to improve the project
Work interactively with user - they make final decisions
Maintain conversation context throughout - this is collaborative work
<!-- vpmodule:atom:end analyze-the-change-factually-and-without-blame -->
<!-- vpmodule:atom:begin assess-the-impact-across-every-artifact -->
---
instruction_id: assess-the-impact-across-every-artifact
title: Assess the impact across every artifact
summary: "Replanning reads the ticket, its memlog, breakdown, finished children and the companions it touches, and records what the change reaches and what stays."
capability_tags:
  - assess-change-impact
pattern_tags:
  - change-impact-assessment
conditions_applies_when: A change significant enough to move the project direction is being assessed.
conditions_does_not_apply_when: "The change is local, reversible and touches no shared artifact."
artifact_contract_output_type: impact-assessment
artifact_contract_required_data:
  - the artifacts examined
  - the impact per artifact
  - the sections that need an update
artifact_contract_verified_by: every artifact that the change touches is named with the sections it needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
  - operations
---

# Assess the impact across every artifact
Replanning needs the record the change lands in: read the ticket, its `.memlog.md`, its breakdown, every finished child and its plan, and any architecture or design the ticket touches.
Say whether what is required changed or only how it is delivered. That answer routes the next step: a required change runs `spec.md`; a delivery change goes to re-slicing; a ticket that no longer belongs is dropped.
Check what the change reaches: the ticket's Requirements and Constraints, the `covers` ids of its children, their `after`, the architecture or design companion, and the tests that prove the affected behavior.
Record each artifact that must change and each that stays true.
<!-- vpmodule:atom:end assess-the-impact-across-every-artifact -->
<!-- vpmodule:atom:begin classify-the-change-scope-and-route-the-handoff -->
---
instruction_id: classify-the-change-scope-and-route-the-handoff
title: Classify the change scope and route the handoff
summary: "Route the change to spec, re-slice, or drop, name the tickets and entries each touches, and say whether what is required changed or only how it is delivered."
capability_tags:
  - assess-change-impact
pattern_tags:
  - scope-routing
conditions_applies_when: An approved change is about to be handed to whoever will carry it out.
conditions_does_not_apply_when: Nobody else carries the change out; the current session finishes it.
artifact_contract_output_type: handoff
artifact_contract_required_data:
  - the scope grade
  - "the items added, removed, resequenced or rescoped"
  - the recipients
  - the responsibilities
  - the success criteria
artifact_contract_verified_by: the scope grade decides the recipients and the success criteria are written down
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Classify the change scope and route the handoff
Classify what changed:
- **Required change** — the ticket's Requirements or Constraints change. Run `spec.md` on the ticket with the change as input; its lines re-render with ids kept.
- **Delivery change** — what is required stands; only the split, order, or scope of remaining entries changes. Re-slice each affected epic per `slice.md`.
- **Obsolete work** — a ticket or entry no longer belongs. Drop it per `board.md` and clear what waited on it.
Name the tickets, entries, and companions each route touches, and who owns the next action. An in-progress ticket asks whether its build stops; never edit its plan.
<!-- vpmodule:atom:end classify-the-change-scope-and-route-the-handoff -->
<!-- vpmodule:atom:begin evaluate-every-path-forward-before-recommending-one -->
---
instruction_id: evaluate-every-path-forward-before-recommending-one
title: Evaluate every path forward before recommending one
summary: "Compare adjusting the remaining entries, rolling back built work, and cutting scope, then recommend one with the reason; the user decides."
capability_tags:
  - assess-change-impact
pattern_tags:
  - decision-trail
conditions_applies_when: More than one way of resolving the change is possible and one has to be recommended.
conditions_does_not_apply_when: Only one way of resolving the change is in scope.
artifact_contract_output_type: path-evaluation
artifact_contract_required_data:
  - the options
  - the effort estimate
  - the risk level
  - the viability
  - the recommendation
  - the justification
artifact_contract_verified_by: "every option carries an effort estimate, a risk level and a viability mark, and one option is recommended with a reason"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
  - business
---

# Evaluate every path forward before recommending one
Evaluate each way forward:
- **Adjust remaining entries** — change the unstarted entries and tickets in place, keeping their ids.
- **Roll back built work** — revert only what the change makes wrong, with the cost and the evidence.
- **Cut scope** — drop what no longer belongs, record the reason, and clear what waited on it.
Weigh each by what it costs, what it leaves true, and whether it rewrites built work. Recommend one with the reason. The user decides; the architecture or design companion is never edited from here.
<!-- vpmodule:atom:end evaluate-every-path-forward-before-recommending-one -->
<!-- vpmodule:atom:begin get-explicit-approval-before-applying-the-change -->
---
instruction_id: get-explicit-approval-before-applying-the-change
title: Get explicit approval before applying the change
summary: "Put the finished proposal to the owner for a clear yes, and send a revision back to the step that owns the problem."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A change proposal is complete and the owner has to approve it before anything is applied.
conditions_does_not_apply_when: The run is unattended and the approval is recorded elsewhere.
artifact_contract_output_type: approval-record
artifact_contract_required_data:
  - the proposal put to the owner
  - the answer
  - the conditions
  - the step the revision returns to
artifact_contract_verified_by: the approval is on record and a revision was routed back to the owning step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ingest-docs.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/inbox.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Get explicit approval before applying the change
Get explicit user approval for complete proposal
Do you approve this Sprint Change Proposal for implementation? (yes/no/revise)
If the user chooses **Edit**, revise the proposal with them and write the updated document before continuing.
If no or revise
Gather specific feedback on what needs adjustment
Return to appropriate step to address concerns
Present complete proposal to user
Get clear yes/no approval for proceeding
Document approval and any conditions

Approval for one step is not approval for the next: approval to classify the material is not approval to write the deliverable. Show the exact destinations and require an explicit choice.
The absence of findings is not authorization to write.
Without an explicit opt-in, report only - take no action on what you reviewed.
Confirm with the user before closing anything.
<!-- vpmodule:atom:end get-explicit-approval-before-applying-the-change -->
<!-- vpmodule:atom:begin ground-the-change-in-a-concrete-trigger-and-evidence -->
---
instruction_id: ground-the-change-in-a-concrete-trigger-and-evidence
title: Ground the change in a concrete trigger and evidence
summary: "Name what changed, its source and evidence, and say whether what is required changed or only how it is delivered; ask only what the tree cannot tell you."
capability_tags:
  - assess-change-impact
pattern_tags:
  - concrete-trigger
conditions_applies_when: A change is requested and the reason for it still has to be established.
conditions_does_not_apply_when: The reason for the change is already written down and agreed.
artifact_contract_output_type: trigger-and-evidence
artifact_contract_required_data:
  - the triggering item
  - the problem category
  - the problem statement
  - the evidence
artifact_contract_verified_by: the evidence is on file and the problem is stated before the impact is assessed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - business
---

# Ground the change in a concrete trigger and evidence
Name the change briefly: what changed, its source, and the evidence.
Say whether what is required changed or only how it is delivered.
Read the ticket, its `.memlog.md`, its breakdown, finished children, and any architecture or design it touches; ask only what the tree cannot tell you.
Collect concrete examples, errors, stakeholder feedback, or technical constraints. Do not propose a fix before the change is grounded.
<!-- vpmodule:atom:end ground-the-change-in-a-concrete-trigger-and-evidence -->
<!-- vpmodule:atom:begin halt-with-the-reason-when-a-precondition-is-missing -->
---
instruction_id: halt-with-the-reason-when-a-precondition-is-missing
title: Halt with the reason when a precondition is missing
summary: "When the run lacks what it needs, stop with the reason named instead of guessing forward."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: "A precondition of the work is missing: the trigger, the evidence, the impact analysis, the approval or the owner of the change."
conditions_does_not_apply_when: Everything the run needs is present.
artifact_contract_output_type: halted-run
artifact_contract_required_data:
  - the missing precondition
  - the reason
  - the blocking items
artifact_contract_verified_by: the run stopped with the reason named and the blocking items listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-preconditions.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Halt with the reason when a precondition is missing
Identify blocking issues and work with user to resolve before continuing
HALT: "Cannot proceed without the ticket, its memlog, and its breakdown"
HALT: "Need concrete evidence or examples of what changed before analyzing impact"
HALT: "Cannot propose a path without knowing whether what is required changed"
HALT: "Must have explicit approval before changing the tree"
HALT: "Must clearly define who will execute the change and what done looks like"
HALT: "Need the ticket or the initiative file to assess the change. Open a companion only where it points."

**Unmet** | STOP - return a checkpoint reporting `**Gate:** blocking-human` with `**Blocked by:** Precondition not met: <precondition text>`. Do NOT partial-commit the task. Unmet preconditions are NEVER auto-approved - a missing prerequisite is not a verification step a human can rubber-stamp, it is a fact the executor cannot establish on its own.
<!-- vpmodule:atom:end halt-with-the-reason-when-a-precondition-is-missing -->
<!-- vpmodule:atom:begin propose-the-change-as-a-before-and-after-edit -->
---
instruction_id: propose-the-change-as-a-before-and-after-edit
title: Propose the change as what changes and what stays
summary: "Show each affected line before and after, name the ticket or entry and section, and say what stays true; no separate proposal file is written."
capability_tags:
  - assess-change-impact
pattern_tags:
  - output-formatting
conditions_applies_when: A change is being proposed against artifacts that already hold text.
conditions_does_not_apply_when: The change creates a new artifact and there is no current text to replace.
artifact_contract_output_type: edit-proposal
artifact_contract_required_data:
  - the artifact
  - the section
  - the current text
  - the replacement text
  - the reason
artifact_contract_verified_by: "every proposal carries the current text, the replacement text and a reason"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
  - product
---

# Propose the change as what changes and what stays
Show the change as before → after where text changes: the ticket or entry, the section, the current line and the proposed line, with the reason.
Name the affected ticket, entry, companion, or plan section, and what stays true.
Explain the effect on built work and on the tickets whose `covers` or `after` name the changed line.
Do not write a separate proposal file: the record is the ticket tree and the dated `Decision:` line.
<!-- vpmodule:atom:end propose-the-change-as-a-before-and-after-edit -->