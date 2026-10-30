---
instruction_id: keep-an-append-only-claims-ledger
title: Keep an append-only claims ledger
summary: "Every decision, source batch, load-bearing claim, plan change and assumption is one append-only line; a status change is a new line, never an edit."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A run spans several steps and the state of its claims must survive a break.
conditions_does_not_apply_when: The work is one action with a single claim.
artifact_contract_output_type: claims-ledger
artifact_contract_required_data:
  - the ledger lines
  - the claim status carried by each line
artifact_contract_verified_by: a changed status is a new line with the same reference and the last status wins
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/verification.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/process.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Keep an append-only claims ledger
**The memlog is the process memory.**
- Every decision, source batch, load-bearing claim, plan change, and assumption is one append-only line
The memlog `claim` entries are the ledger: every claim a decision could rest on, with its class (each pack names its classes — quantitative sizes, pricing, versions/compatibility, regulatory assertions, …), source, publisher, publication date, and status.
New claims enter `unverified`; on a Refresh or Deepen run, claims outside the run’s scope keep their prior status from the memlog — only new and in-scope claims are (re)checked.
Every status change lands in the memlog as a fresh `claim` line with the same `ref=` and the new status — last status wins
**Record provenance** in the memlog: what produced it (which tool or firm), when (ask if not evident — production date drives staleness), and what the user wants decided from it.
