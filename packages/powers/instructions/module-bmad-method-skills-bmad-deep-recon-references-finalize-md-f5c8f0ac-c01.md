---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-finalize-md-f5c8f0ac-c01"
title: "bmad-method: skills/bmad-deep-recon/references/finalize.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-deep-recon/references/finalize.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/finalize.md\"}"
atom_ids:
  - check-the-citations-mechanically-then-semantically
  - compute-the-staleness-map-from-the-claims
  - keep-the-rendered-view-a-view-not-a-second-source-of-truth
atom_count: 3
atoms: "[{\"atom_id\":\"check-the-citations-mechanically-then-semantically\",\"file_sha256\":\"94bd0758d1540d3c1f4855903888c41d72ca07d38ae269f08e144951d855bd8d\",\"content_sha256\":\"bda5e218417676e1f66653d00a40505946b6e93f63fd345a5c199a01965781c7\",\"file_bytes\":1642,\"body_bytes\":489},{\"atom_id\":\"compute-the-staleness-map-from-the-claims\",\"file_sha256\":\"81bc8cce4050b8f0d2c86b63290647cf75767671ce41df4395298fcd399b7dd6\",\"content_sha256\":\"4784a9d8c8e2254456ed0f6bde7f77ee9f0036d149e9f58dbde25857044fbca3\",\"file_bytes\":2118,\"body_bytes\":545},{\"atom_id\":\"keep-the-rendered-view-a-view-not-a-second-source-of-truth\",\"file_sha256\":\"1c0e504323e5c6b45f925d18785e7d6c4f1bb625670f5d7afa284880458c95ad\",\"content_sha256\":\"972838f73498b915ccf3455f2546a2f5547c251dbea2fd184214ba8cc06607f7\",\"file_bytes\":1988,\"body_bytes\":663}]"
carrier_sha256: 474701ea730a49ea3b63e80518dbd2930a3d852b4972f776a610050b6f4d6573
carrier_bytes: 6219
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-the-citations-mechanically-then-semantically -->
---
instruction_id: check-the-citations-mechanically-then-semantically
title: "Check the citations mechanically, then semantically"
summary: "The markers are diffed against the source table mechanically, and a fresh-context reader then judges whether each cited source says what the text claims."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A finished report is about to be delivered.
conditions_does_not_apply_when: The text carries no citations.
artifact_contract_output_type: citation-check
artifact_contract_required_data:
  - the dangling markers and orphaned rows
  - the semantic verdicts
  - the downgraded claims
artifact_contract_verified_by: every marker resolves and every claim whose source does not back it is downgraded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/finalize.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Check the citations mechanically, then semantically
**Citation check — mechanical, then semantic.**
- it diffs inline `[n]` markers against the appendix and lists dangling markers and orphaned rows exactly; fix what it reports.
Then a fresh-context subagent does only the judgment half: does each cited source actually say what the text claims? It never rewrites findings — a claim whose source doesn’t back it gets its confidence downgraded and the mismatch logged as an `event`.
<!-- vpmodule:atom:end check-the-citations-mechanically-then-semantically -->
<!-- vpmodule:atom:begin compute-the-staleness-map-from-the-claims -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/synthesis.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/lifecycle.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/finalize.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/selection.md
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
<!-- vpmodule:atom:end compute-the-staleness-map-from-the-claims -->
<!-- vpmodule:atom:begin keep-the-rendered-view-a-view-not-a-second-source-of-truth -->
---
instruction_id: keep-the-rendered-view-a-view-not-a-second-source-of-truth
title: "Keep the rendered view a view, not a second source of truth"
summary: "The rendered page is a full-fidelity presentation of the document, self-contained and offline; the document stays the single place the content lives."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A report is also rendered as a page.
conditions_does_not_apply_when: The report is delivered as text only.
artifact_contract_output_type: report-rendering
artifact_contract_required_data:
  - the rendered page
  - the claim that it carries no content of its own
artifact_contract_verified_by: "the page carries the same claims, numbers and citations as the document and renders offline from a single file"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/finalize.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/html-briefing.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Keep the rendered view a view, not a second source of truth
The page is a full-fidelity presentation of the report, never a second source of truth — same claims, same numbers, same citations; nothing is lost by reading it instead of the markdown.
**Self-contained single file**: inline CSS and JS, no external requests of any kind (no CDN, no fonts, no remote images). It must render from a `file://` open, offline, forever.
**Charts sparingly**: only where the data genuinely benefits (market size trajectory, decision matrix scores) — simple inline SVG, labeled axes, no library.
`<folder name>.md` always exists — the briefing is its regenerable face.
<!-- vpmodule:atom:end keep-the-rendered-view-a-view-not-a-second-source-of-truth -->