---
instruction_id: compute-the-staleness-map-from-the-claims
title: Compute the staleness map from the claims
summary: "The claims that age fastest are computed from the ledger and the freshness bars, never derived by hand, and the report names the earliest re-check date."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A report is about to state how fresh its claims are.
conditions_does_not_apply_when: The report makes no claim that can age.
artifact_contract_output_type: staleness-map
artifact_contract_required_data:
  - the claims per class
  - the re-check date per class
  - the earliest re-check date
artifact_contract_verified_by: the map is computed from the ledger and the class windows and names the earliest re-check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/synthesis.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/lifecycle.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/finalize.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/selection.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Compute the staleness map from the claims
- **Staleness map** — the claims that age fastest, computed not hand-derived: build the claims list (`claim`, `class`, `pub_date`) from the ledger, map the pack’s freshness bars to months per class
- **Staleness:** a selection report older than two quarters should be refreshed before anyone acts on it — say so in the report.
Tell the user what exists and where — report, briefing, imports, memlog — plus what the staleness map says to re-check and when, and that Refresh/Deepen handle it.
