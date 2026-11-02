---
instruction_id: answer-in-the-session-with-concrete-findings
title: Answer in the session with concrete findings
summary: An informal pass answers in the session and reports concrete findings with clickable references.
capability_tags:
  - guide-a-human-review
pattern_tags:
  - approval-policy
conditions_applies_when: The reviewer asks what you think about the area under discussion.
conditions_does_not_apply_when: The reviewer asked for a formal review or a second opinion.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the concrete findings
  - the clickable reference of each finding
artifact_contract_verified_by: every finding carries a clickable reference
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives a reviewer-response sequence for an unspecified area, while its conditions name no subject domain; no listed domain can be grounded from this source."
---

# Answer in the session with concrete findings
When the reviewer asks a question in the session, look at the requested area and answer it with concrete findings and clickable references, without any formal review skill.
