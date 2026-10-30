---
instruction_id: build-a-rerunnable-tool
title: Build a rerunnable tool
summary: "When the work is not trivial, build the smallest tool that does or proves it, and prove the tool on the first unit before scaling it."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: "The work is not trivial, and a tool would make it reproducible and checkable."
conditions_does_not_apply_when: "The work is trivial: a couple of obvious edits visible at a glance."
artifact_contract_output_type: reusable-tool
artifact_contract_required_data:
  - recipe
  - verification contract
  - bounds
  - example run
artifact_contract_verified_by: the tool rerun on the first unit and diffed against the hand-done result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-build-the-lever/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Build a rerunnable tool
When the work is not trivial, build the tool that does it instead of doing it by hand.
A codemod, generator, or script does the work the same way every time and reruns for free. The tool is one artifact a reviewer can read and rerun to check the work.
Hand-done changes can only be re-verified by redoing them. A deterministic script turns trust me into run this.
Default to building the lever. Skip it only when the task is trivial, a couple of obvious edits you can see at a glance.
Do the first unit by hand to learn the recipe, then build the tool.
Prove it by rerunning it on that unit and diffing against your hand-done version. Make the lever safe to rerun.
A codemod or script for edits, a generator for repetitive files, a dump to a queryable store for analysis, a rerunnable check for verification.
A deterministic lever beats fan-out. If the tool can process every unit in one pass, run it yourself. Do not fan out delegates to hand-apply what a script can do.
When you fan work out to subagents, write the lever as a skill they all read: the recipe, the verification contract, and the do-not-touch fences in one artifact.
Keep that artifact outside the delegates' write scope so they cannot quietly edit the contract.
Applying this principle produces a file. If you cited it and there is no codemod, script, generator, or delegate skill in the diff, you did not apply it.
Commit the lever when the work outlives the session.
The bar is triviality, not repetition. A one-off still earns a lever when the lever is what makes the work checkable.
Build the smallest script that does or proves the job, never a framework.
This is throughput and reviewability on the work in front of you, not a durable guardrail for a recurring instruction.
