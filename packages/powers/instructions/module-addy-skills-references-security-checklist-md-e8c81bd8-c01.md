---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-references-security-checklist-md-e8c81bd8-c01"
title: "addy-skills: references/security-checklist.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:references/security-checklist.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"references/security-checklist.md\"}"
atom_ids:
  - allowlist-outbound-fetches-and-redirect-targets
  - block-dependency-scripts-until-reviewed
  - bound-model-consumption
  - check-authorization-on-every-resource-access
  - contain-destructive-path-operations
  - enforce-permissions-outside-the-prompt
  - harden-credential-handling
  - harden-the-http-response-boundary
atom_count: 8
atoms: "[{\"atom_id\":\"allowlist-outbound-fetches-and-redirect-targets\",\"file_sha256\":\"c537f21c8496c6092f74385eb87bd5d7ad6944d49344e984637edcb455de0be4\",\"content_sha256\":\"eaa38c4823b4aa071ade5f825e457c37ae9af79476025f086c70c90e4cecc505\",\"file_bytes\":2257,\"body_bytes\":962},{\"atom_id\":\"block-dependency-scripts-until-reviewed\",\"file_sha256\":\"9b46d331cacc82101a91e2b0d451e33cf29c417d979e6932c4ab8ae6d0ec0693\",\"content_sha256\":\"d1ffe4bfc564120586bde350244b120539bc8f3232b70e602a0066081db67bec\",\"file_bytes\":2270,\"body_bytes\":832},{\"atom_id\":\"bound-model-consumption\",\"file_sha256\":\"36dffffa8c0eadaa59001adb5324d0647b6806458827c81a919b77aa3d6efe12\",\"content_sha256\":\"8cd44bf7598f21ea5b844bcaa2b701f6a682ff4bba66ccad163633410fc63775\",\"file_bytes\":1154,\"body_bytes\":170},{\"atom_id\":\"check-authorization-on-every-resource-access\",\"file_sha256\":\"03f105cb6fdcc7bd0ee0722b4f8f8ddea53d67a4b9ab534a11ab28bf6eb029aa\",\"content_sha256\":\"e06acedd6e3c20ffbc84ea7847e721d2e9c19195531065f238138c7fe2105249\",\"file_bytes\":1555,\"body_bytes\":382},{\"atom_id\":\"contain-destructive-path-operations\",\"file_sha256\":\"22bf77aa9ac0a5738a20b4d5819bf196fd7c2b82db3f1cc91394a3742ca62dd4\",\"content_sha256\":\"2ee19b822f3d12a601d1d1133e232e3e1d077ad59cfd9a0aafe9ac79e94915e6\",\"file_bytes\":2095,\"body_bytes\":878},{\"atom_id\":\"enforce-permissions-outside-the-prompt\",\"file_sha256\":\"212e30d633d83cb3edd377b2d6e67ed7d746e630c672c246d2eb6352247aefc3\",\"content_sha256\":\"23ff8aa2aa535ab38251fcc8231ca37e57d3d3a07be77a641f5a27d0ee0cf206\",\"file_bytes\":1952,\"body_bytes\":763},{\"atom_id\":\"harden-credential-handling\",\"file_sha256\":\"544053013e531c10b95f360fe94c23dd4f6f82370420e513a4afc553f267b3f3\",\"content_sha256\":\"bc803d4e775ec131880651e91d558f8f982cb2f7ea66e615363d8fc18c8c058b\",\"file_bytes\":1647,\"body_bytes\":528},{\"atom_id\":\"harden-the-http-response-boundary\",\"file_sha256\":\"70dc91ffa3785d4c4cae1951af4202550a5c3f25bd283826a9b78eeba6ba0464\",\"content_sha256\":\"327ef9209c00b14fc2e841b3e10ab1c47c3809846d29cefb6874eb66ac389e50\",\"file_bytes\":1914,\"body_bytes\":756}]"
carrier_sha256: 4a2b34ef07d13126e7fd853f29accfc83545ed1e63e02ff13660f4297a4a90a3
carrier_bytes: 15877
revision: 1
status: active
---
<!-- vpmodule:atom:begin allowlist-outbound-fetches-and-redirect-targets -->
---
instruction_id: allowlist-outbound-fetches-and-redirect-targets
title: Allowlist outbound fetches and redirect targets
summary: A redirect target is validated before it is followed and a server-side fetch may only reach an allowlisted host that is not a private or reserved address.
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The work follows a redirect or fetches a URL that the caller supplies.
conditions_does_not_apply_when: Every URL the work follows is fixed in the code.
artifact_contract_output_type: outbound-request-review
artifact_contract_required_data:
  - the allowed destinations
  - the redirect validation
  - the blocked address ranges
artifact_contract_verified_by: a caller-supplied URL that names a private or reserved address is refused
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-trust-model.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Allowlist outbound fetches and redirect targets
URLs validated before redirect (prevent open redirect)
Server-side URL fetches allowlisted; private/reserved IPs blocked (prevent SSRF)
SSRF | Validate/allowlist URLs, restrict outbound requests
- **loopback, link-local, and unspecified hosts** — `127.0.0.0/8`, `169.254.0.0/16` (which contains the cloud metadata addresses), `0.0.0.0/8`, `::1`, `fe80::/10`, `::`, their IPv4-mapped IPv6 spellings, and `localhost`/`*.localhost` names. No legitimate capability install fetches these.
- **plaintext `http://` URLs** — the transport is `https`-only; an `http://` tarball spec still *classifies* (so an internal-mirror workflow fails with a clear, named reason instead of a raw protocol error) but never fetches.
- Deliberate limits: RFC1918 private ranges (`10/8`, `172.16/12`, `192.168/16`) are **not** denied — an internal https mirror is a legitimate install source, and the denylist is not an allowlist.
<!-- vpmodule:atom:end allowlist-outbound-fetches-and-redirect-targets -->
<!-- vpmodule:atom:begin block-dependency-scripts-until-reviewed -->
---
instruction_id: block-dependency-scripts-until-reviewed
title: Block dependency scripts until they are reviewed
summary: "Dependency lifecycle scripts never run before they are read: the install starts with scripts disabled, each script is inspected, and the narrow policy is committed at the boundary."
capability_tags:
  - harden-security-controls
pattern_tags:
  - supply-chain-gating
conditions_applies_when: Dependencies are installed on a client whose defaults have not been verified.
conditions_does_not_apply_when: No dependency is installed.
artifact_contract_output_type: install-script-gate-record
artifact_contract_required_data:
  - the bootstrap with scripts disabled
  - the scripts inspected with their versions
  - the recorded allow/deny policy
  - the clean frozen install that still builds
artifact_contract_verified_by: "the scripts were blocked before their first execution and approved only through the pinned manager's own policy"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/research-documentation-lookup.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Block dependency scripts until they are reviewed
Never discover dependency lifecycle scripts by first executing an ordinary install on a client whose defaults have not been verified.
Bootstrap with dependency scripts disabled, or with a documented default-deny policy plus fail-closed enforcement.
Inspect the exact script source and package version before approval.
Record the narrowest native allow/deny policy at the installation boundary and commit it.
Run a clean frozen/immutable install with that policy and verify the required packages still build.
Dependency lifecycle scripts are blocked before first execution and approved only through the pinned manager's native policy

Do NOT use `npx --yes` to auto-download a package - this silently executes unverified packages from the registry. Verify it at the registry first.
<!-- vpmodule:atom:end block-dependency-scripts-until-reviewed -->
<!-- vpmodule:atom:begin bound-model-consumption -->
---
instruction_id: bound-model-consumption
title: Bound model consumption
summary: "Tokens, request rate and recursion depth are capped, so a model call cannot run away."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work calls a model, directly or through an agent loop."
conditions_does_not_apply_when: No model is called.
artifact_contract_output_type: consumption-limits
artifact_contract_required_data:
  - the token cap
  - the request rate cap
  - the recursion or loop cap
artifact_contract_verified_by: all three caps are set and the call stops when one of them is reached
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Bound model consumption
Token, rate, and recursion/loop limits set (bound consumption)
LLM10 Unbounded Consumption | Cap tokens, request rate, and loop/recursion depth
<!-- vpmodule:atom:end bound-model-consumption -->
<!-- vpmodule:atom:begin check-authorization-on-every-resource-access -->
---
instruction_id: check-authorization-on-every-resource-access
title: Check authorization on every resource access
summary: "Every protected entry point checks authentication and every resource access checks ownership or role, so no object is reachable by accident."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work exposes a protected endpoint, an object, an admin action or a token."
conditions_does_not_apply_when: The surface is public and carries no data.
artifact_contract_output_type: authorization-review
artifact_contract_required_data:
  - the protected entry points
  - the ownership or role check of each
  - the scope of every issued key
artifact_contract_verified_by: every protected entry point and every resource access names the check that guards it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Check authorization on every resource access
Every protected endpoint checks authentication
Every resource access checks ownership/role (prevents IDOR)
Admin endpoints require admin role verification
API keys scoped to minimum necessary permissions
JWT tokens validated (signature, expiration, issuer)
Broken Access Control | Auth checks on every endpoint, ownership verification
<!-- vpmodule:atom:end check-authorization-on-every-resource-access -->
<!-- vpmodule:atom:begin contain-destructive-path-operations -->
---
instruction_id: contain-destructive-path-operations
title: Contain destructive path operations
summary: "A path named by data is resolved first, checked against an allowlisted root with a minimum depth and proven ownership, and the check is not left open to a race."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work deletes, moves or overwrites a path that data can name."
conditions_does_not_apply_when: The path is fixed in the code and not derived from data.
artifact_contract_output_type: path-containment-review
artifact_contract_required_data:
  - the allowed roots
  - the minimum depth
  - where the ownership evidence comes from
  - how the check/use race is closed
artifact_contract_verified_by: the resolved path is inside an allowlisted root and the ownership proof comes from authenticated state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Contain destructive path operations
Destructive path operations (delete/move/overwrite): symlinks resolved, allowlisted root, minimum depth, ownership evidence read before the call
Containment for a target named by data. Resolve first, then decide — and treat the result as a candidate, not as authorization
**The marker is self-attestation.** Anything that can write inside the root can write `.owner`. `expectedOwner` has to come from authenticated state, and the marker needs integrity protection (restrictive ownership, or a MAC) before it is authorization rather than a consistency check against a misderived target.
**Returning a path leaves a check/use race.** Where an untrusted process can swap an ancestor between the check and the call, operate on a descriptor with no-follow, beneath-the-root semantics, or guarantee the hierarchy is immutable for the duration.
<!-- vpmodule:atom:end contain-destructive-path-operations -->
<!-- vpmodule:atom:begin enforce-permissions-outside-the-prompt -->
---
instruction_id: enforce-permissions-outside-the-prompt
title: Enforce permissions outside the prompt
summary: "Prompt injection is assumed, the permissions are enforced in code, and the secrets, the cross-tenant data and the system prompt stay out of the context window."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The work calls a model or lets an agent act.
conditions_does_not_apply_when: No model is called and no agent acts.
artifact_contract_output_type: model-permission-review
artifact_contract_required_data:
  - the permissions enforced in code
  - the tool scopes
  - the confirmations required
  - what is kept out of the context window
artifact_contract_verified_by: every permission is enforced outside the prompt and no destructive action happens without a confirmation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Enforce permissions outside the prompt
Prompt injection assumed; permissions enforced in code, not in the system prompt
Secrets, cross-tenant data, and full system prompts kept out of the context window
Tool/agent permissions scoped; destructive or irreversible actions require confirmation
LLM01 Prompt Injection | Don't trust the system prompt as a boundary; enforce permissions in code
LLM05 Improper Output Handling | Treat model output as untrusted; validate, parameterize, encode
LLM06 Excessive Agency | Scope tool permissions; confirm destructive actions
LLM07 System Prompt Leakage | Assume the system prompt can leak; put no secrets in it
LLM08 Vector and Embedding Weaknesses | Partition RAG embeddings per tenant; validate documents before indexing
<!-- vpmodule:atom:end enforce-permissions-outside-the-prompt -->
<!-- vpmodule:atom:begin harden-credential-handling -->
---
instruction_id: harden-credential-handling
title: Harden credential handling
summary: "Passwords are hashed with a strong algorithm, sessions are protected by cookie flags and expiry, and login and reset flows are rate limited."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work stores, transports or accepts credentials."
conditions_does_not_apply_when: The work handles no credential at all.
artifact_contract_output_type: credential-review
artifact_contract_required_data:
  - the hashing algorithm and cost
  - the session cookie flags
  - the session lifetime
  - the rate limit
  - the reset token lifetime
artifact_contract_verified_by: every credential-handling item is checked against the stated values
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Harden credential handling
Passwords hashed with bcrypt (≥12 rounds), scrypt, or argon2
Session cookies: `httpOnly`, `secure`, `sameSite: 'lax'`
Session expiration configured (reasonable max-age)
Rate limiting on login endpoint (≤10 attempts per 15 minutes)
Password reset tokens: time-limited (≤1 hour), single-use
Account lockout after repeated failures (optional, with notification)
MFA supported for sensitive operations (optional but recommended)
Auth Failures | Strong passwords, rate limiting, session management
<!-- vpmodule:atom:end harden-credential-handling -->
<!-- vpmodule:atom:begin harden-the-http-response-boundary -->
---
instruction_id: harden-the-http-response-boundary
title: Harden the HTTP response boundary
summary: "The response carries a restrictive content policy, transport security and frame protection, and the allowed origins are an explicit list rather than a wildcard."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The work serves HTTP responses to a browser or to a client that can be cross-origin.
conditions_does_not_apply_when: The work serves no HTTP response.
artifact_contract_output_type: response-header-review
artifact_contract_required_data:
  - the headers sent
  - the allowed origins
  - the allowed methods and headers
artifact_contract_verified_by: every response carries the security headers and the wildcard origin appears nowhere in production
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Harden the HTTP response boundary
Content-Security-Policy: default-src 'self'; script-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0  (disabled, rely on CSP)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
// Restrictive (recommended)
cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
// NEVER use in production:
cors({ origin: '*' })  // Allows any origin
Security Misconfiguration | Security headers, minimal permissions, audit deps
<!-- vpmodule:atom:end harden-the-http-response-boundary -->