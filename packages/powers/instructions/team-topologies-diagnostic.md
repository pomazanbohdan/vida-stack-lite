---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: team-topologies-diagnostic
title: Run the team-topologies diagnostic
summary: "Check handoff-free stream delivery, team-type fit, declared modes, domain limits, boundary alignment, optional platform adoption, enabling exit criteria and a recurring sensing review, and apply the matching action for each failed check."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of an engineering organization.
conditions_does_not_apply_when: A full organizational audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/team-topologies/SKILL.md; sha256=b62a65eee8f0fc170f4223540a0ba6f2bf9248db9de028bccce32cdce41060e4; locator=skills/team-topologies/SKILL.md#L183-L195"
status: active
revision: 1
---

# Run the team-topologies diagnostic

Use the diagnostic questions and actions to assess whether stream-aligned teams deliver typical changes without handoffs, each team fits one of the four types, dependent team pairs have declared modes, domain counts fit cognitive-load heuristics, service and repository boundaries match team boundaries, platform adoption is optional and measured by load removed, enabling engagements have time limits and exit criteria, and a recurring signal-based topology review exists. When a check fails, realign streams to end-to-end business-change slices; classify, convert, or dissolve misfit teams; declare a mode; reassign domains (at most one complicated domain per team); re-split along fracture planes and give each artifact one owner; run the platform as a product and track voluntary adoption and developer experience; set enabling end dates and capability-transfer goals; and review friction, wait times, and on-call signals quarterly.
