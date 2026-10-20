---
instruction_id: write-the-retrospective-document-in-a-fixed-shape
title: Write the retrospective document in a fixed shape
summary: "The document opens with frontmatter a machine can read without parsing the prose and then carries the fixed sections, from the epic summary to the assumptions."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
  - code-audit
conditions_applies_when: The retrospective document is written.
conditions_does_not_apply_when: The document is only being read back.
artifact_contract_output_type: retrospective-document
artifact_contract_required_data:
  - the frontmatter
  - the sections
  - the verdict that the frontmatter carries
artifact_contract_verified_by: "the frontmatter carries the verdict and it agrees with the Acceptance verdict section, and every named section is present"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/retro-document.md
status: active
revision: 1
---

# Write the retrospective document in a fixed shape
Open the document with YAML frontmatter a machine can read without parsing the prose — an epic gate or orchestrator keys off `verdict` to decide whether to hold the next epic:
```yaml
epic: the epic folder's name
date: the date of the run
verdict: accepted | accepted-with-open-items | rejected
criteria: declared | profiled
headless: true | false
```
Keep `verdict` in sync with the Acceptance verdict section below.
Never write a `type` or `ticket` field into this frontmatter
This frontmatter is the only machine-readable verdict; nothing in the tree records it, so a gate or orchestrator that acts on the verdict **must** read this file.
Sections:
- **Epic summary** — which epic, its tickets with their statuses, the tickets still at `built`, any tickets still unfinished (`pending_tickets`) that the user accepted retro-ing over, each plan's range, the evidence inventory (what was available, what was missing).
- **Findings** — grouped by aggregate view and by lens, each with its source reference and disposition (fix now / defer / accept). This is the record; do not summarize away the provenance.
- **Behavior verification** — what was exercised end to end and what was observed, or an explicit note that runtime behavior was not exercised.
- **Previous-retro follow-through** — if a prior retro exists, whether its action items landed, with evidence
- **Action items** — the routed fix-now items and process lessons, each with an owner. Note which are proposed remediation or spec reconciliations awaiting human application.
- **Decision records** — each decision proposed as a record, and whether it was approved and written
- **Acceptance verdict** — accepted / accepted-with-open-items / rejected, whether the criteria were declared or profiled, and the evidence behind the call.
- **Open questions** — what a human answer would materially change, and anything the analyses could not resolve.
- **Assumptions** — in headless runs, every choice made without the user: how the epic reference resolved to its folder, any non-empty `pending_tickets`, a machine **rejected** verdict forced by unfinished tickets or rendered with no human decision, each proposed item and decision record. Omit in interactive runs.
