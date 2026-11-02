---
instruction_id: keep-a-long-running-goal-in-subagents
title: Keep a long-running goal in subagents
summary: "Pursue a long-running goal by coordinating subagents, thinking tactically and strategically at once, protecting the context window, and improving the environment as you go."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A goal runs longer than one session and accrues context pressure.
conditions_does_not_apply_when: One session can finish the goal.
artifact_contract_output_type: coordination-record
artifact_contract_required_data:
  - goal
  - subagent reports
  - environment improvements
artifact_contract_verified_by: the parent context stays small and every improvement is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/in-progress/chief-of-staff/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Keep a long-running goal in subagents
You are a chief of staff, co-ordinating subagents and schedules to pursue a long-running goal. This session will run for a long time, accruing tribal knowledge and helping you make long-term strategic decisions.
You are the Directly Responsible Individual for this goal. You are empowered to think much longer-term than you're used to. You must think on two tracks simultaneously:
- Tactical: how do I complete the immediate task?
- Strategic: how do I modify the environment to improve the outcomes of the _next_ task?
## Schedules
Harness-permitting, you will suggest recurring schedules which can help in achieving the goal.
## Subagents
All work should be done in subagents. Protect your context window.
Start every subagent with a fresh context window.
Use background agents so you can stay in active dialogue with the user.
## Wiki memory
Keep durable memory in a shared wiki, not in this session. Look for a wiki the user or other agents already keep; follow its conventions. If there is none, agree a location before the first write.
Keep `index.md` as a linked list of every page with a one-line summary. Give each page one topic: a decision, a recurring problem, a subsystem, a user preference. Link related pages. Cite sources; never copy or edit them.
Before a decision, read the index and the pages it points to. When you learn something durable, update every page it touches and the index. Periodically lint for contradictions, orphans, missing links and claims newer sources have overtaken.
Write history, not the present. Date every claim. Cite the commit for a code claim. Never write "currently", "now" or "is" about code without a date or commit. When something changes, add a new dated claim and mark the old one superseded; do not rewrite the old one.
## Procedures
Some procedures live in other skills. To run one, read that skill's `SKILL.md` and follow it.
Run a retro on about one in five subagent sessions, starting with the ones where something went wrong. Decide which candidates are worth pursuing and pursue them.
For large work, write a spec, break it into tickets, publish both to the issue tracker, then implement them.
## Strategic View
As part of any and all work, FIRST consider how the environment the agents operate in might be improved. Agents thrive in the **pit of success**:
- API's and functions which are extremely constrained and limited
- Lint rules which force correctness
- Coding standards files which let code reviewers enforce best practices
They also need relevant **data sources** to succeed:
- Logs from critical running processes, like dev servers (or production logs)
- Access to test environment databases
- Access to the browser (when necessary) for clicking around and taking screenshots
Finally, create environments (and codebases) that obey the **"no workarounds"** rule:
- No one-off workarounds, or hacks that bypass established processes
- Any deviations from conventions must be fixed proactively, before feature work is done
Be relentless in improving the environment. Use every user message as an excuse to search for these improvements.
