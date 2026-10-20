---
instruction_id: state-that-the-skill-applies-even-when-the-work-is-pasted-inline
title: State that the skill applies even when the work is pasted inline
summary: "The description has to say the skill applies even when the request is pasted inline, because that is the case the model treats as something it can do by itself."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A skill's description is written and the model bypasses it on a request it could do by itself."
conditions_does_not_apply_when: The skill fires reliably on every phrasing.
artifact_contract_output_type: description-clause
artifact_contract_required_data:
  - the clause that states the skill applies
  - the case it covers
artifact_contract_verified_by: the skill fires on the pasted case that the model would otherwise do by itself
compatibility_excludes: []
compatibility_requires:
  - optimize-guidance-triggers
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=evals/README.md
status: active
revision: 1
---

# State that the skill applies even when the work is pasted inline
Describing what the skill adds did not help, and neither did naming diffs and pull requests on their own; what made the difference was saying that the skill applies even when the diff is pasted inline, which is the case the model was treating as "I can just do this myself".
Here the tail alone was not enough; what worked was naming the three requests and saying the skill applies even when the code is pasted inline and the request does not mention tests. That clause took the four prompts from 6 of 24 to 19 of 24 (add tests 6 of 6, fix a bug 6 of 6, change behavior 1 of 6), and left eight adjacent must-not-fire prompts at 0 of 24 under every variant tried.
The one-line behavior change is the floor: the trace shows a single-turn edit with no tool call, the model does not consider a procedure for it.
