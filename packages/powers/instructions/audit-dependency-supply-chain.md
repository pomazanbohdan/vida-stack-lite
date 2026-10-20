---
instruction_id: audit-dependency-supply-chain
title: Audit the dependencies for supply-chain risk
summary: Check the dependencies for known vulnerabilities and for supply-chain signals such as typosquats and install scripts.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The project depends on third-party packages or the change adds one.
conditions_does_not_apply_when: The project has no third-party dependencies.
artifact_contract_output_type: dependency-audit
artifact_contract_required_data:
  - dependency
  - known vulnerability or supply-chain signal
  - action
artifact_contract_verified_by: every dependency is checked against the vulnerability list and its install scripts are read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/security-auditor.md
status: active
revision: 1
---

# Audit the dependencies for supply-chain risk
Review dependencies for known CVEs and supply-chain risk (typosquats, postinstall scripts)

Are dependencies audited for known vulnerabilities?
