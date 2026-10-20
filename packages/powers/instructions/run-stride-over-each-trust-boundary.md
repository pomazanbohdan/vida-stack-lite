---
instruction_id: run-stride-over-each-trust-boundary
title: Run STRIDE over each trust boundary
summary: "Ask the six threat questions at every boundary and take the matching mitigation, as a quick lens rather than a ceremony."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: The trust boundaries of a feature are already named.
conditions_does_not_apply_when: No feature accepts untrusted data.
artifact_contract_output_type: threat-lens
artifact_contract_required_data:
  - each boundary
  - the threats asked at it
  - the mitigation taken
artifact_contract_verified_by: every boundary has been asked all six threat questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
status: active
revision: 1
---

# Run STRIDE over each trust boundary

**Run STRIDE over each boundary** — a quick lens, not a ceremony:

| Threat | Ask | Typical mitigation |
|---|---|---|
| **S**poofing | Can someone impersonate a user/service? | Authentication, signature verification |
| **T**ampering | Can data be altered in transit or at rest? | Integrity checks, parameterized queries, HTTPS |
| **R**epudiation | Can an action be denied later? | Audit logging of security events |
| **I**nformation disclosure | Can data leak? | Encryption, field allowlists, generic errors |
| **D**enial of service | Can it be overwhelmed? | Rate limiting, input size caps, timeouts |
| **E**levation of privilege | Can a user gain rights they shouldn't? | Authorization checks, least privilege |
