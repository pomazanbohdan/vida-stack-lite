---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-security-and-hardening-skill-md-ee53a342-c01"
title: "addy-skills: skills/security-and-hardening/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/security-and-hardening/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/security-and-hardening/SKILL.md\"}"
atom_ids:
  - allowlist-server-side-fetch-targets
  - apply-the-three-tier-security-boundary
  - back-rate-limits-with-a-shared-store
  - block-dependency-scripts-before-first-execution
  - cap-and-scope-what-a-model-run-may-do
  - check-authorization-on-every-request
  - classify-personal-data-as-you-add-it
  - collect-personal-data-only-against-a-stated-purpose
atom_count: 8
atoms: "[{\"atom_id\":\"allowlist-server-side-fetch-targets\",\"file_sha256\":\"8de213b0ac4484306e0191bff52d905a0713a1ac37a91eac8ae81025d9f38456\",\"content_sha256\":\"3a5adabd8ef6a9f98ab8fd9be715635215757f1982a7b24d7adea2fb5465031e\",\"file_bytes\":1780,\"body_bytes\":507},{\"atom_id\":\"apply-the-three-tier-security-boundary\",\"file_sha256\":\"e50448f2b1dcaaf55646f57e91a3affaad88efe30af7ce508f0f297ba1558bc1\",\"content_sha256\":\"d58c4b105db9ed0bba9e4b9519631cd361dc611b6ab4c69d50c8ebb6ddd930d3\",\"file_bytes\":2783,\"body_bytes\":1679},{\"atom_id\":\"back-rate-limits-with-a-shared-store\",\"file_sha256\":\"38c80e31d69c38f1744ce5cd1c5da62e1d7bb671c65763930c904facec978967\",\"content_sha256\":\"512e5f9d3725a43617bddd49d82f99d816531d424117b78fb1431cb87ba1a0b6\",\"file_bytes\":1549,\"body_bytes\":296},{\"atom_id\":\"block-dependency-scripts-before-first-execution\",\"file_sha256\":\"9c830a3e71d98998bd0ca9d7f3cad29bd92548a01122ab1dc1e2b3b83d2648ee\",\"content_sha256\":\"9b4d604367bfe69ddeafc220140df94980734d73b20db6a4ae28e2f73dfa48c6\",\"file_bytes\":1451,\"body_bytes\":330},{\"atom_id\":\"cap-and-scope-what-a-model-run-may-do\",\"file_sha256\":\"8c26e0d65c6a22d8ac5669ed1e04edc1d6a7b5f24dbae9826995f33a84988329\",\"content_sha256\":\"3ae38787d7a6532a76b63bddb05cf20d3532ba2da420395bcd4a1109a03c7d70\",\"file_bytes\":1354,\"body_bytes\":275},{\"atom_id\":\"check-authorization-on-every-request\",\"file_sha256\":\"187803e6c5dbca9f918bd545b46f3cc929f9eeb09873a6f25a99d249b8e0ff0a\",\"content_sha256\":\"445ce753217e55f59c9f73f591a89895e6c2abff56002c14bce85182b4b5d5cf\",\"file_bytes\":1410,\"body_bytes\":195},{\"atom_id\":\"classify-personal-data-as-you-add-it\",\"file_sha256\":\"37725a64968bf4cbb88c1e01b1ed3e5ff73c166ab43e7109cc1b47acb225b7d4\",\"content_sha256\":\"ea6a4f17eaedc7f9861e0b493fd9c8a87b781b5b717ec039d6a3d2506e45f303\",\"file_bytes\":1829,\"body_bytes\":612},{\"atom_id\":\"collect-personal-data-only-against-a-stated-purpose\",\"file_sha256\":\"708b101c6e0b6fafbe9e83d94abea37fec24d3d2239d68d70741f0b38a60f8fb\",\"content_sha256\":\"c0329d8254afcb7f097c13a7dc11d57dfcabbf4b86f28b95cdde5a703dac1baf\",\"file_bytes\":1975,\"body_bytes\":698}]"
carrier_sha256: 6b40d999354c3b1490730e73441801668d0bbd6d797a06402902a24bb569068e
carrier_bytes: 15226
revision: 1
status: active
---
<!-- vpmodule:atom:begin allowlist-server-side-fetch-targets -->
---
instruction_id: allowlist-server-side-fetch-targets
title: Allowlist the targets of a server-side fetch
summary: "Allowlist the scheme and the host, resolve every address and refuse the private or reserved ones, and forbid the redirects."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The server fetches a URL that a user can influence.
conditions_does_not_apply_when: The fetch target is fixed in the code and cannot be influenced.
artifact_contract_output_type: fetch-allowlist
artifact_contract_required_data:
  - the allowed schemes and hosts
  - the address check
  - the redirect policy
artifact_contract_verified_by: a fetch to a private or reserved address is refused and the redirects are not followed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Allowlist the targets of a server-side fetch

Any URL the user influences — webhooks, import-from-URL, image proxies, link previews — can be aimed at internal services.
Allowlist scheme and host, resolve **all** DNS records and reject any private or reserved address (loopback, link-local `169.254.169.254`, private, unique-local, for IPv4 and IPv6), and forbid redirects.
That check still has a DNS-rebinding TOCTOU gap: for high-risk surfaces, pin the resolved IP or put a filtering agent in front.
<!-- vpmodule:atom:end allowlist-server-side-fetch-targets -->
<!-- vpmodule:atom:begin apply-the-three-tier-security-boundary -->
---
instruction_id: apply-the-three-tier-security-boundary
title: "Classify every control into always, ask first, or never"
summary: "Each security control is either always applied, requires human approval before it is added, or is never done."
capability_tags:
  - harden-security-controls
pattern_tags:
  - control-tiering
conditions_applies_when: A security control is proposed or an existing one is changed.
conditions_does_not_apply_when: The change has no security consequence.
artifact_contract_output_type: control-classification
artifact_contract_required_data:
  - the control
  - its tier
  - the approval the tier requires
artifact_contract_verified_by: every control named in the change is classified into one of the three tiers
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Classify every control into always, ask first, or never

Security isn't a phase — it's a constraint on every line of code that touches user data, authentication, or external systems.

### Always Do (No Exceptions)

- **Validate all external input** at the system boundary (API routes, form handlers)
- **Parameterize all database queries** — never concatenate user input into SQL
- **Encode output** to prevent XSS (use framework auto-escaping, don't bypass it)
- **Use HTTPS** for all external communication
- **Hash passwords** with bcrypt/scrypt/argon2 (never store plaintext)
- **Set security headers** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **Use httpOnly, secure, sameSite cookies** for sessions
- **Run the detected package manager's native audit** against the committed lockfile before every release

### Ask First (Requires Human Approval)

- Adding new authentication flows or changing auth logic
- Storing new categories of sensitive data (PII, payment info)
- Adding new external service integrations
- Changing CORS configuration
- Adding file upload handlers
- Modifying rate limiting or throttling
- Granting elevated permissions or roles

### Never Do

- **Never commit secrets** to version control (API keys, passwords, tokens)
- **Never log sensitive data** (passwords, tokens, full credit card numbers)
- **Never trust client-side validation** as a security boundary
- **Never disable security headers** for convenience
- **Never use `eval()` or `innerHTML`** with user-provided data
- **Never store sessions in client-accessible storage** (localStorage for auth tokens)
- **Never expose stack traces** or internal error details to users
<!-- vpmodule:atom:end apply-the-three-tier-security-boundary -->
<!-- vpmodule:atom:begin back-rate-limits-with-a-shared-store -->
---
instruction_id: back-rate-limits-with-a-shared-store
title: Back the rate limit with a shared store
summary: "Limit the API generally and the authentication endpoints strictly, and count in a shared store once more than one process serves traffic."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The service is rate limited and more than one process or instance serves its traffic.
conditions_does_not_apply_when: Exactly one process serves the traffic and it always runs.
artifact_contract_output_type: rate-limit-policy
artifact_contract_required_data:
  - the limits
  - the shared store
artifact_contract_verified_by: the limit is enforced across all instances instead of per process
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Back the rate limit with a shared store

Limit the API generally and auth endpoints strictly (about 10 attempts per 15 minutes).
Once more than one process serves traffic, in-memory counters silently become `max × instances`, or never fire on serverless: back the limiter with a shared store.
<!-- vpmodule:atom:end back-rate-limits-with-a-shared-store -->
<!-- vpmodule:atom:begin block-dependency-scripts-before-first-execution -->
---
instruction_id: block-dependency-scripts-before-first-execution
title: Block dependency scripts before the first execution
summary: "Bootstrap with the install scripts disabled, inspect the pending script, approve the minimum, and prove it with a clean frozen install."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A dependency in the project can run an install script.
conditions_does_not_apply_when: No dependency in the project runs an install script.
artifact_contract_output_type: script-policy
artifact_contract_required_data:
  - the policy
  - the approved scripts
  - the clean install result
artifact_contract_verified_by: a clean frozen install succeeds with only the approved scripts running
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Block dependency scripts before the first execution

**Block dependency scripts before first execution.**
Bootstrap with scripts disabled or a documented fail-closed policy, inspect the pending script source, approve only the minimum, commit the policy, then verify with a clean frozen/immutable install.
Never blanket-approve.
<!-- vpmodule:atom:end block-dependency-scripts-before-first-execution -->
<!-- vpmodule:atom:begin cap-and-scope-what-a-model-run-may-do -->
---
instruction_id: cap-and-scope-what-a-model-run-may-do
title: Cap and scope what a model run may do
summary: "Scope the tool permissions, validate every tool argument, confirm the destructive actions, and cap the tokens, the request rate and the recursion depth."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A model can call tools or can run recursively.
conditions_does_not_apply_when: The model only returns text.
artifact_contract_output_type: run-caps
artifact_contract_required_data:
  - the tool permissions
  - the caps
  - the confirmation step
artifact_contract_verified_by: every tool argument is validated and the destructive action is confirmed before it runs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Cap and scope what a model run may do

Scope tool permissions, validate every tool argument, and confirm destructive actions (LLM06); cap tokens, request rate, and recursion depth (LLM10); partition RAG embeddings per tenant and validate documents before indexing (LLM08).
<!-- vpmodule:atom:end cap-and-scope-what-a-model-run-may-do -->
<!-- vpmodule:atom:begin check-authorization-on-every-request -->
---
instruction_id: check-authorization-on-every-request
title: Check authorization on every request
summary: "Authentication is not authorization: the authenticated caller must own, or be permitted on, the specific resource."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A request touches a resource that belongs to somebody.
conditions_does_not_apply_when: The endpoint touches no per-caller resource.
artifact_contract_output_type: authorization-check
artifact_contract_required_data:
  - the resource
  - the ownership rule
  - the response when the check fails
artifact_contract_verified_by: every protected request checks ownership or permission
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Check authorization on every request

Check **authorization** on every request, not just authentication: the authenticated user must own, or be permitted on, the specific resource (A01, IDOR).
<!-- vpmodule:atom:end check-authorization-on-every-request -->
<!-- vpmodule:atom:begin classify-personal-data-as-you-add-it -->
---
instruction_id: classify-personal-data-as-you-add-it
title: Classify personal data as you add it
summary: "Tag every new field as non-personal, personal or sensitive, because data you cannot find cannot be protected or erased."
capability_tags:
  - manage-personal-data
pattern_tags:
  - data-minimization
conditions_applies_when: A field is added that may hold personal data.
conditions_does_not_apply_when: The field carries no personal data.
artifact_contract_output_type: data-classification
artifact_contract_required_data:
  - the fields
  - the class of each
  - the handling of each class
artifact_contract_verified_by: every new field carries a class and the handling that follows from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - business
---

# Classify personal data as you add it

**Classify fields as you add them** (non-personal, PII, sensitive) and handle each class accordingly.
You cannot protect, or honor a deletion request for, data you cannot find.

| Class | Examples | Handling |
|---|---|---|
| **Non-personal** | Aggregates, anonymized counts | Normal handling |
| **Personal (PII)** | Name, email, IP, device/user IDs | Minimize, access-control, include in export/delete |
| **Sensitive** | Health, finance, location, biometrics, gov IDs, anything about minors | Extra basis to collect, stricter access, often encryption + audit logging |
<!-- vpmodule:atom:end classify-personal-data-as-you-add-it -->
<!-- vpmodule:atom:begin collect-personal-data-only-against-a-stated-purpose -->
---
instruction_id: collect-personal-data-only-against-a-stated-purpose
title: Collect personal data only against a stated purpose
summary: "A later need is latent breach scope and not a purpose, so collect against a stated purpose, keep personal data out of telemetry and make the region a configurable policy."
capability_tags:
  - manage-personal-data
pattern_tags:
  - data-minimization
conditions_applies_when: "A field is added to a personal-data store, or personal data is sent to a third party."
conditions_does_not_apply_when: The field carries no personal data.
artifact_contract_output_type: purpose-statement
artifact_contract_required_data:
  - the stated purpose
  - the fields collected against it
artifact_contract_verified_by: every collected field maps to a stated purpose
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/profile-user.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Collect personal data only against a stated purpose

Hardening asks "can an attacker read it?" Privacy asks "should *we* hold it at all, and for how long?"
The cheapest data to protect, breach, and comply over is the data you never collected; treat personal data as a liability to minimize.
**Collect only against a stated purpose.**
"Might be useful later" is latent breach scope, not a purpose.
Keep PII out of telemetry.
Make region a configurable policy, not a hardcoded assumption.
Reads session files locally (read-only, nothing modified)
Analyzes message patterns (not content meaning)
Nothing is sent to external services
Sensitive content (API keys, passwords) is automatically excluded
<!-- vpmodule:atom:end collect-personal-data-only-against-a-stated-purpose -->