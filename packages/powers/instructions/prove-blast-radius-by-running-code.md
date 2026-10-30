---
instruction_id: prove-blast-radius-by-running-code
title: Prove blast radius by running code
summary: "Find what a change breaks beyond the diff, then prove the one fact the safety claim depends on by running the real code."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "You change shared code, a data format, or behavior that other places call."
conditions_does_not_apply_when: The change is isolated and has no caller outside its own test.
artifact_contract_output_type: impact-report
artifact_contract_required_data:
  - callers
  - scenarios run
  - actual results
  - what was not checked
artifact_contract_verified_by: commands actually executed with captured output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/blast-radius/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Prove blast radius by running code
Find what a change breaks somewhere else, before it ships. Listing the callers is not the job. The job is the breakage a search will not show you.
A writeup that sounds right is worthless. It reads as convincing whether or not it is true. Do not hand back only the writeup.
Find the one or two facts the whole safety claim depends on and prove them by running code.
For each fact, get it as far down this list as is cheap, and say where it stopped: you said so, you pointed at the line, you showed the bad case cannot happen, you ran it, or you reproduced it in the running app.
A real file and line, or the library's own source, beats an assertion. Walking the failure step by step and showing it does not reach beats a pointed line.
Running it means a script or test that calls the real code and fails loudly if you are wrong. Step four is usually one small script that imports the same library the app ships and calls the exact function you are worried about.
Read the change: the diff, the symbols it adds, changes, and deletes, and what it now does differently, including the part the diff does not spell out.
Find the one fact it is safe because of. Most changes that look risky are safe because of a single fact. If it holds, most risky cases clear at once. Spend your time here, not on a long list of maybes.
Look where a search stops: read the source of the library you call, and check its pinned version and any local patch.
Work out when things run: microtasks, unmount and teardown, and the ordering the runtime imposes.
Follow what a symbol search misses: the data an API returns, a storage column, a wire format, another language reading the same bytes, a feature flag, or code three hops downstream.
Be honest about each risk. Give it a real chance of happening and a real cost if it does.
Keep the risks you confirmed and list the ones you checked and cleared separately. Cite a real location. A search that finds nothing is still an answer. Never make up a caller or an API.
Prove the one fact. Write a script or test that runs the real code, run it, and paste what happened.
For a big or wide change, ask more than one model the same question and merge the answers. Different models catch different real bugs.
Hand back what it does, the one fact it is safe because of with its proof or an explicit unproven mark, the risks with how each breaks and how likely it is, what you cleared, and the cheapest check that would catch the real bug.
