---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-experiments
title: Replace debate with cheap experiments
summary: "Write a falsifiable hypothesis with a pre-committed metric and threshold, match fidelity to risk, use a paper prototype with five users for about 85% of usability issues, reserve A/B tests for proven concepts and remove invalidated ideas from the backlog."
capability_tags:
  - design-retention-engine
pattern_tags:
  - outcome-over-output
  - experiment-precommit
conditions_applies_when: Settling a design debate or testing a discovery opportunity.
conditions_does_not_apply_when: A decision with no testable behavior.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "At least one card has a pre-committed threshold and decision rule, and the backlog is triaged."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L114-L130"
status: active
revision: 1
---

# Replace debate with cheap experiments

Turn opportunities into falsifiable bets judged by behavior change rather than meetings or shipped outputs. Write a hypothesis in the specified outcome/persona/action/feature form and commit to its metric and threshold before testing. Match experiment fidelity to risk; a paper prototype with five users can identify about 85% of usability issues. Reserve A/B tests for tuning a proven concept. Remove invalidated ideas from the backlog instead of deferring them. Use the leading debate or discovery opportunity to generate three hypotheses and the lowest-fidelity experiment that answers the actual question, with a precommitted metric, threshold, and timebox. With the user, select the hypothesis, fidelity, pass/fail line, and what leaves the backlog on failure. Record an experiment card and triaged backlog in EXPERIMENTS.md. Completion requires a card with precommitted threshold and decision rule, a triaged backlog, and user's selected first test.
