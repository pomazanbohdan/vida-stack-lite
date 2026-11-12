---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-agents-security-auditor-md-4a372cf3-c01"
title: "Addy security auditor module"
summary: "Carrier for 8 atomic instructions from addy-skills:agents/security-auditor.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"agents/security-auditor.md\"}"
atom_ids:
  - audit-authentication-and-authorization
  - audit-dependency-supply-chain
  - check-data-protection-and-runtime-hardening
  - check-outbound-and-third-party-trust
  - inspect-security-surface
  - map-trust-boundaries-before-finding
  - rate-security-findings-by-exploitability
  - secure-ai-features
atom_count: 8
atoms: "[{\"atom_id\":\"audit-authentication-and-authorization\",\"file_sha256\":\"ca0422ba3158add86f2d3c4950fa17598e9af0815cf20af36377b38f79b1b606\",\"content_sha256\":\"4e07c50b984b210826a30e2cd61d378c204110788f2fb1bb5d0232775d7fbe0d\",\"file_bytes\":1505,\"body_bytes\":449},{\"atom_id\":\"audit-dependency-supply-chain\",\"file_sha256\":\"35ef40235f8d30f79c040eb7d125d58e2e974c521396551a1328ebc1a3991f9e\",\"content_sha256\":\"de254d5cf842cb1425451382caec28a776f5beda5e037e2dde066bc7d8c76bd0\",\"file_bytes\":1276,\"body_bytes\":191},{\"atom_id\":\"check-data-protection-and-runtime-hardening\",\"file_sha256\":\"3cb51cefc6a26cb6585ea2cc468fd92203ec535a22fc311e666bf5b093b6f368\",\"content_sha256\":\"07f6f4dc3e1a8fc514f0501b5c2a663f0d6ef263ed2e2134f1b530c5b9479953\",\"file_bytes\":1687,\"body_bytes\":600},{\"atom_id\":\"check-outbound-and-third-party-trust\",\"file_sha256\":\"21dd3b7725fc3dcee046558092afc30496d457eed570d339d8c3b8bb2baaf49d\",\"content_sha256\":\"90b3b1427a0b2e79ac3d6927857501358343f90562704ebca4bb5ea8f447bdf3\",\"file_bytes\":1471,\"body_bytes\":372},{\"atom_id\":\"inspect-security-surface\",\"file_sha256\":\"78d4aca167314884e5e5877eacca250c4ef9c0233ce36be7dae1738219e462b7\",\"content_sha256\":\"d0e100c94209a156daa0c02ae36a8c7a52b89412d13295216b45631b315e14ac\",\"file_bytes\":2326,\"body_bytes\":570},{\"atom_id\":\"map-trust-boundaries-before-finding\",\"file_sha256\":\"f5f2abfaf2a76252147ee7ac67c4700006faa8e38d053ab868a11d1c3d7b8421\",\"content_sha256\":\"13d2f673323943c8a7c8de7b1f6859783170168e9cbb195eb65c67b9de0703a8\",\"file_bytes\":1934,\"body_bytes\":747},{\"atom_id\":\"rate-security-findings-by-exploitability\",\"file_sha256\":\"fcaabdc717f5455037abe73b17c91dd3ceb139a4bafa5ef6515ee06ce2589e1a\",\"content_sha256\":\"f866d9c62c2a49335e65d927490fdfa3838c43171ff28a4f8c8e486c4c8f66e8\",\"file_bytes\":2017,\"body_bytes\":866},{\"atom_id\":\"secure-ai-features\",\"file_sha256\":\"93493912b73596b0c6ef6ac6362cfed9a1460cab3a04358f4f7c96388421ce1e\",\"content_sha256\":\"e8f9b2de29732a38152f5ae01b530943cc53950874e714309da8202be40ff1aa\",\"file_bytes\":1564,\"body_bytes\":598}]"
carrier_sha256: f52ab6bcbf413ccfadfd8c13806ac14f165c52b6338509ff291179f1ccae896d
carrier_bytes: 14769
revision: 1
status: active
---
<!-- vpmodule:atom:begin audit-authentication-and-authorization -->
---
instruction_id: audit-authentication-and-authorization
title: Audit authentication and authorization
summary: Check how the system proves identity and enforces access on every protected endpoint.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The reviewed system authenticates users or protects resources by access control.
conditions_does_not_apply_when: "The system has no login, no sessions and no protected resources."
artifact_contract_output_type: authentication-review
artifact_contract_required_data:
  - authentication finding
  - authorization finding
  - fix
artifact_contract_verified_by: each finding names the credential flow or the protected endpoint it applies to
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/security-auditor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Audit authentication and authorization
## Authentication & Authorization
- Are passwords hashed with a strong algorithm (bcrypt, scrypt, argon2)?
- Are sessions managed securely (httpOnly, secure, sameSite cookies)?
- Is authorization checked on every protected endpoint?
- Can users access resources belonging to other users (IDOR)?
- Are password reset tokens time-limited and single-use?
- Is rate limiting applied to authentication endpoints?
<!-- vpmodule:atom:end audit-authentication-and-authorization -->
<!-- vpmodule:atom:begin audit-dependency-supply-chain -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/security-auditor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Audit the dependencies for supply-chain risk
Review dependencies for known CVEs and supply-chain risk (typosquats, postinstall scripts)

Are dependencies audited for known vulnerabilities?
<!-- vpmodule:atom:end audit-dependency-supply-chain -->
<!-- vpmodule:atom:begin check-data-protection-and-runtime-hardening -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/security-auditor.md
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
<!-- vpmodule:atom:end check-data-protection-and-runtime-hardening -->
<!-- vpmodule:atom:begin check-outbound-and-third-party-trust -->
---
instruction_id: check-outbound-and-third-party-trust
title: Check outbound calls and third-party integrations
summary: "Check the traffic that leaves the system: stored credentials, verified webhooks, guarded OAuth flows and allowlisted outbound URLs."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The system calls a third-party service or receives its callback.
conditions_does_not_apply_when: The system makes no outbound call and accepts no third-party callback.
artifact_contract_output_type: third-party-trust-review
artifact_contract_required_data:
  - outbound call or callback
  - missing verification
  - fix
artifact_contract_verified_by: each finding names the call or the callback and the check it is missing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/security-auditor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Check outbound calls and third-party integrations
## Third-Party Integrations
- Are API keys and tokens stored securely?
- Are webhook payloads verified (signature validation)?
- Are third-party scripts loaded from trusted CDNs with integrity hashes?
- Are OAuth flows using PKCE and state parameters?
- Are server-side fetches of user-supplied URLs allowlisted (SSRF)?
<!-- vpmodule:atom:end check-outbound-and-third-party-trust -->
<!-- vpmodule:atom:begin inspect-security-surface -->
---
instruction_id: inspect-security-surface
title: Check the security surface
summary: "Look for injection, weak randomness, secrets in code and missing checks on input from users."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The reviewed code takes input from users or handles money, access or secrets."
conditions_does_not_apply_when: The code has no external input and handles no sensitive data.
artifact_contract_output_type: security-surface-review
artifact_contract_required_data:
  - input paths
  - missing check
  - case
artifact_contract_verified_by: each security finding names the input path and the missing check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/security-auditor.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Check the security surface
Look for security holes: injection, weak randomness, secrets in code, missing checks on input from users.

Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs, anything the user asked for.

Is all user input validated at system boundaries?

Are there injection vectors (SQL, NoSQL, OS command, LDAP)?

Is HTML output encoded to prevent XSS?

Are file uploads restricted by type, size, and content?

Are URL redirects validated against an allowlist?
<!-- vpmodule:atom:end inspect-security-surface -->
<!-- vpmodule:atom:begin map-trust-boundaries-before-finding -->
---
instruction_id: map-trust-boundaries-before-finding
title: Map the trust boundaries before the findings
summary: "Find the points where untrusted data enters, reason about each with STRIDE, and only then enumerate findings."
capability_tags:
  - review-code
pattern_tags:
  - threat-modeling
conditions_applies_when: A security review is about to enumerate its findings.
conditions_does_not_apply_when: The trust boundaries are already mapped and the findings are enumerated.
artifact_contract_output_type: trust-boundary-map
artifact_contract_required_data:
  - trust boundary
  - STRIDE threats considered
  - findings
artifact_contract_verified_by: every finding is attached to a mapped trust boundary
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/security-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-trust-model.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Map the trust boundaries before the findings
Start from trust boundaries — where untrusted data enters — and reason about each with STRIDE before enumerating findings
- The barrier is not a technical wall. It is:
- **Consent** — you explicitly approved the executable surfaces this capability declares before they ran.
- **Integrity** — the bundle you consented to is the bundle that ran (SHA verified).
- **Reversibility** — `gsd capability remove <id>` removes exactly what the ledger recorded, including entries in shared config files, leaving no orphaned state.
- These three things together mean: you know what you installed, you got what you were shown, and you can undo it completely. They do not guarantee the content is safe.
<!-- vpmodule:atom:end map-trust-boundaries-before-finding -->
<!-- vpmodule:atom:begin rate-security-findings-by-exploitability -->
---
instruction_id: rate-security-findings-by-exploitability
title: Rate a security finding by exploitability
summary: "Rate a security finding by exploitability. The severity labels are the corpus scale, mapped from the donor own five-level scale."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A security finding needs a severity, a proof and a recommended action."
conditions_does_not_apply_when: The finding is already rated against a fixed severity scale.
artifact_contract_output_type: rated-security-finding
artifact_contract_required_data:
  - severity
  - criteria met
  - action
  - proof of concept for Critical and Important
artifact_contract_verified_by: each Critical or Important finding carries a proof of concept or an exploitation scenario
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/security-auditor.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Rate a security finding by exploitability
Focus on exploitable vulnerabilities, not theoretical risks

Every finding must include a specific, actionable recommendation

Provide proof of concept or exploitation scenario for Critical/Important findings

Never suggest disabling security controls as a "fix"

| Severity | Criteria | Action |
|----------|----------|--------|
| **Critical** | Exploitable remotely, leads to data breach or full compromise | Fix immediately, block release |
| **Important** | Exploitable with some conditions, significant data exposure | Fix before release |
| **Important** | Limited impact or requires authenticated access to exploit | Fix in current sprint |
| **Minor** | Theoretical risk or defense-in-depth improvement | Schedule for next sprint |
| **Minor** | Best practice recommendation, no current risk | Consider adopting |
<!-- vpmodule:atom:end rate-security-findings-by-exploitability -->
<!-- vpmodule:atom:begin secure-ai-features -->
---
instruction_id: secure-ai-features
title: Secure the AI features
summary: "Review AI features for the ways model output, the prompt and agent tools become a way in."
capability_tags:
  - review-code
pattern_tags:
  - threat-modeling
conditions_applies_when: "The code calls a model, feeds a prompt or gives an agent tools."
conditions_does_not_apply_when: No model is called and no agent holds tools.
artifact_contract_output_type: ai-feature-security-review
artifact_contract_required_data:
  - feature
  - risk
  - missing control
artifact_contract_verified_by: each finding names the model output or the tool path it comes from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/security-auditor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Secure the AI features
## AI / LLM Features (if present)
- Is model output treated as untrusted (never into `eval`, SQL, shell, `innerHTML`, file paths)?
- Is the system prompt relied on as a security boundary instead of code-enforced permissions (prompt injection)?
- Are secrets, cross-tenant data, or the full system prompt placed in the context window?
- Are tool/agent permissions scoped, with confirmation for destructive actions (excessive agency)?
- Are token, rate, and recursion limits set (unbounded consumption)?

Map findings to the OWASP Top 10 for LLM Applications where relevant.
<!-- vpmodule:atom:end secure-ai-features -->