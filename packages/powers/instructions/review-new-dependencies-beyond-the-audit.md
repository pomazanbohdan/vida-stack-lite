---
instruction_id: review-new-dependencies-beyond-the-audit
title: Review a new dependency beyond the audit
summary: "Audits only match known advisories, so a new package is judged on its ownership, its maintenance, its release age, its provenance and its transitive graph."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: "A new dependency, a lockfile diff or a script-policy change enters the project."
conditions_does_not_apply_when: Nothing about the dependency set changed.
artifact_contract_output_type: dependency-review
artifact_contract_required_data:
  - the package
  - its ownership and maintenance
  - its release age and provenance
  - the signature check result
artifact_contract_verified_by: "the review names the package, its provenance and the signature result"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Review a new dependency beyond the audit

**Audits only match known advisories.**
They do not catch a newly malicious or typosquatted package (`cross-env` vs `crossenv`).
Review new dependencies, lockfile diffs, and script-policy changes together: ownership, maintenance, release age, provenance, transitive graph.
Verify registry signatures where supported (`npm audit signatures`, `pnpm audit signatures`) and treat their absence as a signal to investigate, not automatic proof of compromise (A06, LLM03).
