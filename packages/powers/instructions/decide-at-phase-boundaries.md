---
instruction_id: decide-at-phase-boundaries
title: Decide at phase boundaries
summary: "At the boundary between two phases, choose in order: continue, clear, hand off, subagent, or compact; decide at the boundary, not mid-phase."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A chunk of work inside a session has ended and the next chunk is about to begin.
conditions_does_not_apply_when: "You are mid-phase, where the only options are to continue or split the rest into subagents."
artifact_contract_output_type: boundary-decision
artifact_contract_required_data:
  - chosen option
  - reason
artifact_contract_verified_by: the decision is made at the boundary and continue is ruled out first
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/ask-matt/PHASE-BOUNDARIES.md
status: active
revision: 1
---

# Decide at phase boundaries
A **phase** is a chunk of work inside a session: the grilling, the implementation, the QA. The definition is fuzzy on purpose: a phase ends when you think *"ok, we're done with that"*.
The **phase boundary** is the gap between two phases, and it is the only place this decision belongs. Mid-phase there is no decision to make: continue, or split the work that's left into subagents. Compacting mid-phase makes the agent lose the thread.
## The five options
- **Continue**: Stay in the session. No context switch at all.
- **Clear**: Empty the context window and start from nothing.
- **Hand off**: Write a portable markdown file and seed a session anywhere with it.
- **Subagent**: Send the task to its own context window and get a report back.
- **Compact**: Compress this context and seed a fresh session with the summary.
## The tree
Work top to bottom at the boundary. The first **yes** wins.
**1. Can you continue in this session?** Two things make the answer yes: the next phase needs this phase as a **primary source**, or you have enough [smart zone] left for the next phase to fit. Grilling → implementation is the standard yes: the implementation wants the reasoning verbatim, not a summary of it. Continue costs nothing and loses nothing, so rule it out before anything else.
**2. Is the context irrelevant to what comes next?** Is everything in this session (the exploration, the decisions, the dead ends) disposable? If so, **clear**. It is the cheapest move on the board: it takes no time and hands back the whole window. Clear also isn't terminal: the old session stays resumable.
The cost of getting this wrong is one-way. Clear a *relevant* context and you lose the **why** behind what you built, and no amount of reading the diff back gets it returned.
**3. Do you need to hand off?** Hand-off is narrow. You need it only when you are:
- swapping to a **new harness**,
- moving to a **new directory** or repo,
- sending the work to a **colleague**,
- or forking a side task you found **mid-phase** without derailing what you're doing.
That list is the whole clause. What hand-off buys is **portability**: a file that travels. If nothing is travelling, you don't need it.
**4. Can the task be done AFK?** Is it scoped tightly enough to run with you away from the keyboard, no steering? Then send it to a **subagent** and leave this session untouched. Automated review is the standard case: the agent reads the diff and reports, and you aren't needed while it does.
**5. Otherwise, compact.** Relevant context, same harness, same directory, and you need to stay in the loop: this is where the tree lands, and it lands here often. Pass it an instruction so the summary keeps what the next phase needs.
Compact is the **default, not the first reach**. It sits at the bottom because the four questions above it are all cheaper or more precise. The failure mode when people start here is a fresh session that is confidently wrong about a decision the summary flattened.
## Primary and secondary sources
Every move except **Continue** turns a **primary source** into a **secondary source**: the session as it happened, replaced by a summary of it. The trade is always the same shape: primary is full information, lots of noise, little room to move; secondary is lossy, less noise, lots of room to move. This is why question 1 comes first. You only pay the lossiness when staying costs more than it saves.
## These are judgement calls
The questions are not objective: each has taste in it, and the same boundary can go two ways on two days. The value is in asking them **in order**, at the boundary rather than in the middle of the work.
