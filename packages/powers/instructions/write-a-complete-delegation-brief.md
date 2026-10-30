---
instruction_id: write-a-complete-delegation-brief
title: Write a complete delegation brief
summary: "Give the executor the result, context, bounds, acceptance check, and report contract, so the task needs no clarifying question."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "You hand work to another agent, a person, or a separate run."
conditions_does_not_apply_when: The work happens in the same conversation and no context has to cross a boundary.
artifact_contract_output_type: delegation-brief
artifact_contract_required_data:
  - result
  - context
  - bounds
  - acceptance check
  - report format
artifact_contract_verified_by: the delegate completes the task without a clarifying question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=agents/poteto-agent.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/templates/reproduce-automation-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/templates/triage-automation-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/architect/references/runner-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/references/reviewer-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-help/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-help/references/prompting.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/investigator-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/synthesizer-prompt.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write a complete delegation brief
A brief states the goal and the check for done. The workflow supplies the steps, so a few plain sentences beat a specification.
Say what is wrong or what the user wants. State the done check so it can pass or fail. Make it better and a duration are not checks.
Ask for the proof to show: the real command output, a recording of the flow, the stored value, or a before and after number.
Include what the user already knows: a symptom, a reproduction step, a log, or a link, which saves the executor a search.
State the real constraints: reproduce first, do not change code yet, zero behavior change, or let me review before proceeding. Each changes what the executor does.
Leave out the how. Say what to achieve and leave room to find a better way.
Leave out a list of skills or steps. A hand-written order drops or reorders steps the workflow keeps. Name a skill only to override one choice.
Leave out the user's theory of the cause until the executor has restated the problem. A stated guess narrows the search.
A dispatch describes one task, not the session's history. Do not paste accumulated prior-task summaries.
The brief is the single source of requirements. Exact values such as numbers, strings, signatures, and test cases appear only in it.
Include the interfaces and decisions from earlier work that the brief cannot know, and your resolution of any ambiguity you noticed.
Name the report contract and where the full report goes. The executor returns status, what changed, a one-line check summary, and concerns.
The executor never dispatches its own reviewer. Review arrives from the delegating side after the report.
A brief that needs a clarifying question is incomplete. Close the gap before dispatching.
Subagents answer them from the code and its history knowing only the questions, because a researcher who knows what is being built reports what should be instead of what is.
