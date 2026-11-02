---
instruction_id: offer-context-recon
title: Offer context recon
summary: "When the owner supplied context, read the referenced material and connected code before asking; when further looking would help, offer to check the code, documents, or data and reuse the recovered context."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The decision lacks facts that the available material can supply.
conditions_does_not_apply_when: "The facts are already supplied, or looking would not change the decision."
artifact_contract_output_type: recon-proposal
artifact_contract_required_data:
  - missing facts
  - what to inspect
  - what to look for
  - consent
artifact_contract_verified_by: owner approves the recon scope
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/recall/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Offer context recon
When the project or the owner already provides context — a spec, a plan, a handoff, referenced files, connected code, or earlier conversation — read it before the first message.
Keep reading until you can explain how the relevant parts work today and what the change would touch.
Never ask what the project or their context already answers.
Once you have that grounding and looking further would help, offer to go look: the codebase or project, the user's own files and data, or the web.
Say what you would look for. The user decides whether you go.
Before acting or resuming work, rebuild the user's recent working context from their own history, live state, and the shared record of reports, fixes, and incidents.
Read only what the in-scope threads need, then stop.
Lock the scope before searching: pin the time window, the topic if named, and the workspace. State the scope back.
Never quietly turn all into recent, and never read another project's history without being asked.
Search the user's own history for what they did and decided.
Sweep the shared record whenever the topic names a feature, file, subsystem, area, or bug. The default is to sweep, not a judgment call.
Hand the shared-record sweep to the history investigators, but steer the question from why this was built this way to what is the current state, what has been tried and did not hold, and what users still report.
Skip the shared-record sweep only for pure activity recall with no named target, where the user's own history and live state are the entire answer.
Verify against live state: check the branches, changes, and tickets the search surfaced.
Lead with a capsule of at most five bullets, then one line per thread with a status tag, then the recurring problems, then the single most useful next move.
Cite history findings by their identifier and shared-record findings by their source.
Sanitize private context before any public output.
An adjacent feature stays out unless it blocks this one.
When the capsule outgrows a screen, cut detail before cutting threads.
