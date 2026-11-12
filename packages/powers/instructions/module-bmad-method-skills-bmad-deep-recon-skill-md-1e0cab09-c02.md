---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-skill-md-1e0cab09-c02"
title: "bmad-method: skills/bmad-deep-recon/SKILL.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-deep-recon/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/SKILL.md\"}"
atom_ids:
  - report-the-data-as-thick-as-it-is
  - set-the-effort-knobs-explicitly
  - write-every-intermediate-to-disk
atom_count: 3
atoms: "[{\"atom_id\":\"report-the-data-as-thick-as-it-is\",\"file_sha256\":\"ca0434fd0d0ff8245b4bf0020e0e4fd4701f3a692e2b6d21bac82bce56b1b8c6\",\"content_sha256\":\"f90555ada62b913c9f6f81ee5d50906d5efb786aadc7d5a113689b169de13181\",\"file_bytes\":1632,\"body_bytes\":380},{\"atom_id\":\"set-the-effort-knobs-explicitly\",\"file_sha256\":\"f5f3ef06e844de66cb086a748ad72403672c58e0d698227c2fac94c712e9d8f0\",\"content_sha256\":\"15634149be2a7e4e8afd9ae848b6b4e6843cbd9af4145e7313fa96a7535a0fb5\",\"file_bytes\":1996,\"body_bytes\":787},{\"atom_id\":\"write-every-intermediate-to-disk\",\"file_sha256\":\"1bd4c063ccd646be6db057afb3cfedce0f9d7a73d2e7c1542ccf92ef8377e17f\",\"content_sha256\":\"8d7e68147872531d116b2be25f65547cc5723f3c0a84b724b814606ac4f26e3d\",\"file_bytes\":1885,\"body_bytes\":612}]"
carrier_sha256: 1365f283a128efb99747621f07287cff076db89cfb2b754505a632428d094cef
carrier_bytes: 5878
revision: 1
status: active
---
<!-- vpmodule:atom:begin report-the-data-as-thick-as-it-is -->
---
instruction_id: report-the-data-as-thick-as-it-is
title: Report the data as thick as it is
summary: "Thin public data is reported as thin, an absence of evidence is a finding, and freshness belongs to the truth of a claim."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: The material gathered for a decision is thinner than the decision needs.
conditions_does_not_apply_when: "The material was gathered and each dimension is covered by fresh, credible sources."
artifact_contract_output_type: honest-thickness-report
artifact_contract_required_data:
  - what the material supports
  - what is missing
  - the route for each gap
artifact_contract_verified_by: thin or missing material is named as such and never padded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/process.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Report the data as thick as it is
**Report what is real.** Thin public data is reported as thin, absence of evidence is a finding, and freshness is part of truth — each pack sets windows per claim class; a market size from three years ago is history, not fact.
Open dimensions are listed honestly with a one-line route: draft a follow-up prompt, or a targeted Run on the gap.
<!-- vpmodule:atom:end report-the-data-as-thick-as-it-is -->
<!-- vpmodule:atom:begin set-the-effort-knobs-explicitly -->
---
instruction_id: set-the-effort-knobs-explicitly
title: Set the effort knobs explicitly
summary: "Rigor is bought with named knobs at the start, not accreted through extra passes; what the request says beats the preset."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A wide run is about to be started and its depth has to be chosen.
conditions_does_not_apply_when: The depth was already fixed by the requester.
artifact_contract_output_type: effort-knob-set
artifact_contract_required_data:
  - the preset
  - the knob values in force
  - where each value came from
artifact_contract_verified_by: "every knob has a stated value and a cap is treated as a cap, not a quota"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Set the effort knobs explicitly
**Fast by default.** Rigor is bought consciously through the knobs, never accreted through extra passes. One gate, light checkpoints, no ceremony.
Three knobs bundled in a **preset**; any knob pins individually, and **what the user says in the request beats both**.
**subagents** — parallel assistants: `none` (0 — inline, sequential; also the no-subagent-harness fallback), `low` (2), `normal` (3), `high` (6, cap 10 — beyond the 3–5 sweet spot only for genuinely wide work).
**max_sources_per_round** — distinct sources actually read per dimension per round (cap 25).
**max_depth** — rounds per dimension: initial pass plus lead-following follow-ups (cap 5). A cap, not a quota — dimensions stop early on coverage or novelty exhaustion.
<!-- vpmodule:atom:end set-the-effort-knobs-explicitly -->
<!-- vpmodule:atom:begin write-every-intermediate-to-disk -->
---
instruction_id: write-every-intermediate-to-disk
title: Write every intermediate to disk
summary: "Every intermediate lands in a file the moment it exists, and the scratch state that supports a resume is written after each finished unit and removed once the canonical record is written."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - decision-trail
conditions_applies_when: A run produces material that a later step or a later session needs.
conditions_does_not_apply_when: The work is one short action with nothing to resume.
artifact_contract_output_type: persisted-artifact-set
artifact_contract_required_data:
  - the artifact written to disk
  - the moment it was written
artifact_contract_verified_by: every intermediate result exists as a file before the next step reads it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/default.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Write every intermediate to disk
**Nothing exists until it is a file.**
Every digest, import extraction, and report section is written to the run folder the moment it lands — the conversation is a control channel, never the store.
A run that dies mid-flight resumes from disk with nothing lost.
immediately write a checkpoint file with all decisions captured so far.
This prevents data loss if the session is interrupted mid-discussion.
The checkpoint is structured state, not the canonical
Clean up checkpoint file
is now the canonical record
On session resume,
detects the checkpoint and offers to resume.
<!-- vpmodule:atom:end write-every-intermediate-to-disk -->