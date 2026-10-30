---
instruction_id: triage-incoming-reports
title: Triage incoming reports by one route
summary: "Separate the observed fact from the assumption, classify the report, and send it down one route with one verdict."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: "A defect report, request, or question arrives and needs to go somewhere."
conditions_does_not_apply_when: The report is already classified and has an assigned owner.
artifact_contract_output_type: report-triage
artifact_contract_required_data:
  - fact
  - assumption
  - class
  - route
  - next step
artifact_contract_verified_by: a reproduction attempt or an explicit note that it is impossible
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/FOR_AGENTS.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/triage-issue-reports/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/triage-issue-reports/references/routing.example.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
  - operations
---

# Triage incoming reports by one route
Classify one report and post one useful verdict in its source thread. Create a tracker issue only for a clear, new bug. Do not reproduce or fix it here.
Freeze the source coordinates first. Require the source channel to equal the configured one, require a nonempty thread timestamp, and store both as immutable values. Every later read and post uses those values.
Read the whole report before deciding: the root and current replies, the reporter's wording, version and environment, expected and observed behavior, frequency and trigger, error text, and any link to an existing issue, commit, or change.
Inspect every relevant attachment. Read screenshots at full useful resolution, review video for the state transition that separates correct and broken behavior, and read logs and traces for concrete signatures. If an attachment cannot be read, say so. Do not invent what it shows.
Use evidence already in the thread before asking the reporter for more.
Trace the cause before routing. Identify the likely code path from the reported action to the observed result, check whether the symptom belongs to that path or a dependency below it, check recent changes when the report looks like a regression, and check whether a merged commit or open change already addresses it.
Separate confirmed facts from hypotheses. This pass does not need a complete root cause, but it must be strong enough to avoid routing a visible symptom to the wrong owner.
Classify as a bug, a performance issue, a feature request, a question or feedback, or a reroute. When the bug versus feature line is unclear, do not file. Ask one focused question.
Apply the configured routing. Match on confirmed product area, code path, or error signature. A visible symptom alone is not enough when cause tracing points elsewhere. If no route matches, say the owner is unclear and do not guess.
Search for duplicates by exact signature, product area, trigger, symptom, version or date window, suspected regression commit, and source link.
Choose one outcome: confident duplicate, possibly related, weak resemblance, or no match. For a confident duplicate, update the existing issue with the source link and one short recurrence note. Do not reopen, relabel, or reassign it unless the configuration says to.
Create a new issue only when the classification is a bug or performance issue, the behavior is clearly broken, the issue is still live, dedupe found no confident or plausible live match, and the tracker fields resolved.
A new issue must be self-contained: a plain title that names the area and symptom, the reporter quote, expected and observed behavior, version and environment or unknown, trigger and frequency, the source link, and short cause findings with hypotheses labeled as hypotheses.
Do not put a guessed root cause in the title. Prefer no issue over a guessed or duplicate one.
Post exactly one substantive verdict, short, leading with the outcome. Do not narrate progress.
If the verdict does not land where expected, use the tracker adapter to cancel, close, or delete the issue this run created. If compensation cannot be verified, report the failure in the run output.
Watch one follow-up window, then stop. Answer only a direct question, make a concrete correction when safe, and do not emit a second verdict.
