---
instruction_id: keep-a-canonical-run-log
title: Keep a canonical run log
summary: "Every decision, change and override lands as one append-only line in the canonical log of the run, and the document is distilled toward it."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A run is under way and decisions are being made.
conditions_does_not_apply_when: The work is a single step with nothing worth remembering.
artifact_contract_output_type: run-log
artifact_contract_required_data:
  - the entries in the order they happened
  - the kind of each entry
  - the gist and the reason of each entry
artifact_contract_verified_by: a later run can resume from the log alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 2
---

# Keep a canonical run log
The log is
the run's canonical memory and audit trail — every decision, change, and override (including headless overrides) lands as one append-only line as the conversation unfolds.
The document is distilled toward it; whatever isn't logged is lost on resume.
The log is
canonical — an append-only, chronological record of every decision, constraint, capability (with its stable `CAP-N`), assumption, open question, and bit of user direction, one line each in the order it happened, never edited or reordered.
Log each decision, capability, constraint, and accepted change to
the log
as it is made — that running record is what the render reads.
Because the log is append-only, a later entry supersedes an earlier one on the same point while the history stays intact.
Read it back only to resume or audit
