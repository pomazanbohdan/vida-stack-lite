---
instruction_id: triage-audit-findings-by-reachability
title: Triage audit findings by reachability
summary: "Run the native audit against the committed lockfile, judge the findings by whether the vulnerable code is reachable, and never apply a forced fix blindly. The severity labels are the corpus scale, mapped from the donor own."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: The native dependency audit reports a vulnerability.
conditions_does_not_apply_when: The audit reports nothing.
artifact_contract_output_type: audit-triage
artifact_contract_required_data:
  - the finding
  - its reachability
  - the availability of a fix
  - the decision
artifact_contract_verified_by: every Critical and Important finding carries a reachability decision and a recorded verdict
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Triage audit findings by reachability

**Run the native audit against the committed lockfile before every release.**
Triage Critical/Important by **reachability** (runtime, build, test, deploy paths) and fix availability.
Never apply forced remediation (`npm audit fix --force` or equivalent) automatically, since forced fixes may cross declared dependency ranges; preview, read changelogs, test each upgrade.
Document every deferral with a reason and a review date.

```
The native package-manager audit reports a vulnerability
├── Severity: Critical or Important
│   ├── Is the vulnerable code reachable in runtime, build, test, or deployment paths?
│   │   ├── YES --> Fix immediately (update, patch, or replace the dependency)
│   │   └── NO (confirmed unused across those paths) --> Fix soon, but not a blocker
│   └── Is a fix available?
│       ├── YES --> Update to the patched version
│       └── NO --> Check for workarounds, consider replacing the dependency, or add to allowlist with a review date
├── Severity: Minor
│   ├── Reachable in production? --> Fix in the next release cycle
│   └── Dev-only? --> Fix when convenient, track in backlog
└── Severity: Minor
    └── Track and fix during regular dependency updates
```

Key questions:
- Is the vulnerable function actually called in your code path?
- Is the dependency a runtime dependency or dev-only?
- Is the vulnerability exploitable given your deployment context (e.g., a server-side vulnerability in a client-only app)?
