---
instruction_id: vet-dependencies-for-advisories-and-provenance
title: Vet dependencies for advisories and provenance
summary: "One lockfile governs the install, every advisory is triaged for reachability with a reason and a review date, and a new dependency is vetted before it is added."
capability_tags:
  - harden-security-controls
pattern_tags:
  - supply-chain-gating
conditions_applies_when: "A dependency is added, upgraded, or carries an advisory."
conditions_does_not_apply_when: No dependency changes and no advisory is open.
artifact_contract_output_type: dependency-vetting-record
artifact_contract_required_data:
  - the authoritative lockfile
  - the advisories and their reachability
  - the deferrals with a reason and a review date
  - the vetting of every new dependency
artifact_contract_verified_by: the advisories are triaged by hand and no remediation is applied without a reviewed diff
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Vet dependencies for advisories and provenance
**Supply-chain hygiene** (advisory audits do not catch newly malicious packages):
Exactly one authoritative lockfile per project/workspace root is committed and CI never rewrites it
Critical/high findings are triaged for reachability; deferrals have a reason and review date
Forced audit remediation (`npm audit fix --force` or equivalent) is never automatic; remediation diffs and changelogs are reviewed
Registry signatures/provenance are verified where the manager supports it
New dependencies are reviewed for ownership, maintenance, release age, provenance, transitive graph, and typosquatting
LLM03 Supply Chain | Vet models, datasets, and plugins like any dependency
LLM04 Data and Model Poisoning | Use trusted model sources, verify integrity; vet fine-tuning and RAG data
Data Integrity Failures | Verify updates/dependencies, signed artifacts
Vulnerable Components | The ecosystem's dependency audit (`npm audit`, `pip-audit`, ...), keep deps updated, minimal deps
