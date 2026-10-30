---
instruction_id: check-data-protection-and-runtime-hardening
title: Check data protection and runtime hardening
summary: "Check how sensitive data is stored, exposed and encrypted, and whether the runtime carries the standard headers and guards."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The system stores or returns sensitive data, or serves a web runtime."
conditions_does_not_apply_when: The system handles no sensitive data and serves no web runtime.
artifact_contract_output_type: data-protection-review
artifact_contract_required_data:
  - data at risk
  - missing control
  - fix
artifact_contract_verified_by: each finding names the data or the header and the control it is missing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/security-auditor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Check data protection and runtime hardening
## Data Protection
- Are secrets in environment variables (not code)?
- Are sensitive fields excluded from API responses and logs?
- Is data encrypted in transit (HTTPS) and at rest (if required)?
- Is PII handled according to applicable regulations?
- Are database backups encrypted?

## Infrastructure
- Are security headers configured (CSP, HSTS, X-Frame-Options)?
- Is CORS restricted to specific origins?
- Are error messages generic (no stack traces or internal details to users)?
- Is the principle of least privilege applied to service accounts?
