---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-security-and-hardening-skill-md-ee53a342-c02"
title: "addy-skills: skills/security-and-hardening/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/security-and-hardening/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/security-and-hardening/SKILL.md\"}"
atom_ids:
  - encode-output-through-the-framework
  - enforce-permissions-in-code-not-in-the-prompt
  - establish-one-dependency-installation-boundary
  - gate-third-party-sharing-on-consent
  - guard-destructive-operations-on-derived-paths
  - harden-the-session-cookie
  - hash-passwords-with-a-slow-hash
  - keep-secrets-and-other-tenants-data-out-of-the-context-window
atom_count: 8
atoms: "[{\"atom_id\":\"encode-output-through-the-framework\",\"file_sha256\":\"e86ff593f38ebc2610ff2f029f81240b5ee4bae7e9470f0d0984abf07367fc57\",\"content_sha256\":\"a81488d0f218febb20ebe7caa6263dee0a84a242ba79a258866090b91af590c0\",\"file_bytes\":1396,\"body_bytes\":164},{\"atom_id\":\"enforce-permissions-in-code-not-in-the-prompt\",\"file_sha256\":\"6afe6ccfa4f056620b06fd67d2a4960bf9655df2803c9a8c4706e70ae7894299\",\"content_sha256\":\"4c297b8fce2eca770502bf972cd1af0a69ebffb19d9e7e7ea5d6d63a40639b56\",\"file_bytes\":1293,\"body_bytes\":254},{\"atom_id\":\"establish-one-dependency-installation-boundary\",\"file_sha256\":\"a5ec34b1b1762cbd0f0cce42d35af13a0ff0fa5ae062f9cd257ac9b0d068de34\",\"content_sha256\":\"5c3062aa92227536843ec5fc1b79f31807f3d74f800c2d8cd09bb2e47a746902\",\"file_bytes\":1797,\"body_bytes\":553},{\"atom_id\":\"gate-third-party-sharing-on-consent\",\"file_sha256\":\"07e9dd3b39f5f1f88bdc3afa4af0f3fca1495535350844a3c4901c154c7c979c\",\"content_sha256\":\"fc3c01dd287e231d03cf818cf01b4cbf51afeba14a41b2211c3294efc3a6df86\",\"file_bytes\":1277,\"body_bytes\":216},{\"atom_id\":\"guard-destructive-operations-on-derived-paths\",\"file_sha256\":\"82bdcf1141e834f24fb8eed3c3269d90ebd9de7da39a2a52dea28890fbe31db1\",\"content_sha256\":\"961fe1dea2e6b757c77d4039d3d8f85406e0074866b573432a5dbfb11542dc8d\",\"file_bytes\":2595,\"body_bytes\":1259},{\"atom_id\":\"harden-the-session-cookie\",\"file_sha256\":\"fc9e1cd2deab3d03f0221be3423ff96e48a2b62400816f5dab403da11cb36ebd\",\"content_sha256\":\"4808dc53ddd43e25a165f4b27776c44bed6e8f22097b223396c75d112169e445\",\"file_bytes\":1444,\"body_bytes\":266},{\"atom_id\":\"hash-passwords-with-a-slow-hash\",\"file_sha256\":\"635b51ca3d5c0aafa698dcc7de3413b2216de600ccbd79359e1f4d6baeff75e6\",\"content_sha256\":\"aa80e310e74ada72b88b4a9ed4064cc1f30065e2f221ebc7961a7de336742f49\",\"file_bytes\":1229,\"body_bytes\":120},{\"atom_id\":\"keep-secrets-and-other-tenants-data-out-of-the-context-window\",\"file_sha256\":\"75ebaa197d7556613a8836a48008c93899e0f77261842ed61d1137bdb51bb9d5\",\"content_sha256\":\"71b08dfd66e58f3fd2d798adfd652ce69279344a23a61c1fff0f13c03af6ab2c\",\"file_bytes\":1280,\"body_bytes\":174}]"
carrier_sha256: 4726893b817bc18eb3f15cd6334f0e5ad6666c69e0e5cdf7620d831c7b4a2347
carrier_bytes: 13420
revision: 1
status: active
---
<!-- vpmodule:atom:begin encode-output-through-the-framework -->
---
instruction_id: encode-output-through-the-framework
title: Encode output through the framework
summary: "Let the framework escape the output, and sanitize it with an allowlist sanitizer first when raw HTML is unavoidable."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A value that came from outside the program is written into a response.
conditions_does_not_apply_when: The output carries no external value.
artifact_contract_output_type: output-encoding
artifact_contract_required_data:
  - the output path
  - the escaping mechanism
artifact_contract_verified_by: "no external value reaches the output without the framework's escaping or an allowlist sanitizer"
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

# Encode output through the framework

Encode output through the framework's auto-escaping.
If raw HTML is unavoidable, sanitize with an allowlist sanitizer first.
<!-- vpmodule:atom:end encode-output-through-the-framework -->
<!-- vpmodule:atom:begin enforce-permissions-in-code-not-in-the-prompt -->
---
instruction_id: enforce-permissions-in-code-not-in-the-prompt
title: "Enforce permissions in code, not in the prompt"
summary: "Untrusted text in the context can carry instructions, so the system prompt is not a security boundary."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A model is given untrusted text in its context.
conditions_does_not_apply_when: The model never sees untrusted text.
artifact_contract_output_type: permission-enforcement
artifact_contract_required_data:
  - the untrusted context
  - the code check that enforces the permission
artifact_contract_verified_by: the permission is enforced outside the prompt
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Enforce permissions in code, not in the prompt

**Prompts can be hijacked.**
Untrusted text in the context — a user message, a fetched page, a PDF — can carry instructions.
The system prompt is not a security boundary; enforce permissions in code.
<!-- vpmodule:atom:end enforce-permissions-in-code-not-in-the-prompt -->
<!-- vpmodule:atom:begin establish-one-dependency-installation-boundary -->
---
instruction_id: establish-one-dependency-installation-boundary
title: Establish one dependency installation boundary
summary: "Use the workspace root that owns the lockfile, corroborate the declared manager with the lockfile and the build, and stop when they disagree."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: "Dependencies are installed, added or upgraded."
conditions_does_not_apply_when: No dependency is installed.
artifact_contract_output_type: installation-boundary
artifact_contract_required_data:
  - the owning workspace root
  - the lockfile
  - the pinned manager version
artifact_contract_verified_by: "the lockfile, the declared manager and the build agree on one boundary"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/bootstrap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Establish one dependency installation boundary

**Find the installation boundary and manager.**
Use the workspace root that owns the lockfile, or an independent nested project only when it is outside that workspace.
Corroborate `packageManager` (when present), the lockfile, and CI; stop on disagreement or competing lockfiles.
Pin the manager version.
- A version manager ensures you can switch Node versions per project without polluting your global install.
- This project ships a `.nvmrc` file at the root — any of the tools above will read it.
<!-- vpmodule:atom:end establish-one-dependency-installation-boundary -->
<!-- vpmodule:atom:begin gate-third-party-sharing-on-consent -->
---
instruction_id: gate-third-party-sharing-on-consent
title: Gate third-party sharing on consent
summary: "Sending personal data to an analytics, ad or model vendor is sharing, so it needs an auditable consent and a data-processing agreement."
capability_tags:
  - manage-personal-data
pattern_tags:
  - data-minimization
conditions_applies_when: Personal data leaves your system for a third party.
conditions_does_not_apply_when: Nothing leaves the system.
artifact_contract_output_type: sharing-gate
artifact_contract_required_data:
  - the recipient
  - the consent record
  - the agreement
artifact_contract_verified_by: a consent record exists for every recipient and the agreement is in place
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
  - business
---

# Gate third-party sharing on consent

**Consent gates collection and third-party sharing, and is auditable.**
Sending PII to an analytics, ad, or LLM vendor is sharing; the vendor needs a data-processing agreement.
<!-- vpmodule:atom:end gate-third-party-sharing-on-consent -->
<!-- vpmodule:atom:begin guard-destructive-operations-on-derived-paths -->
---
instruction_id: guard-destructive-operations-on-derived-paths
title: Guard destructive operations on derived paths
summary: "Resolve the target and prove that it sits under an allowlisted root, below it, and carries ownership evidence that was read before the operation."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "A delete, a move or an overwrite names its target from a value the program did not author."
conditions_does_not_apply_when: The target is a fixed literal in the code.
artifact_contract_output_type: path-guard
artifact_contract_required_data:
  - the resolved target
  - the allowlisted root
  - the ownership evidence
artifact_contract_verified_by: the three checks run before the operation and a refusal logs the rejected target and stops
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
  - operations
---

# Guard destructive operations on derived paths

A delete, move, or overwrite is only as safe as the value naming its target, and trust follows who *wrote* that value, not which channel delivered it: another process's command line is as attacker-controlled as a form field.
A shape check proves well-formedness, not authorization.
Before the call, require all three: the resolved target (symlinks resolved) sits under an **allowlisted root**; it is at least one level **below** that root; and it carries **ownership evidence read before the operation**.
On refusal, log the rejected target and stop; never fall back to a broader default path.

Two limits, because the check reads stronger than it is. A marker inside the tree is self-attestation — anything that can write there can write the marker — so the expected owner has to come from authenticated state, and the marker needs integrity protection (restrictive ownership, or a MAC) before it counts as authorization. And resolving a path and then operating on the *name* is a check/use race wherever an untrusted process can swap an ancestor: on a shared volume, hold the target by descriptor and use no-follow, beneath-the-root operations, or make sure the hierarchy cannot change for the duration.
<!-- vpmodule:atom:end guard-destructive-operations-on-derived-paths -->
<!-- vpmodule:atom:begin harden-the-session-cookie -->
---
instruction_id: harden-the-session-cookie
title: Harden the session cookie
summary: "Session cookies are httpOnly, secure and sameSite, with a bounded lifetime, and the session secret comes from the environment."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The application issues a session.
conditions_does_not_apply_when: No session is issued.
artifact_contract_output_type: session-policy
artifact_contract_required_data:
  - the cookie flags
  - the bounded lifetime
  - where the secret comes from
artifact_contract_verified_by: the session cookie carries the flags and the secret is read from the environment
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Harden the session cookie

The session secret comes from the environment, never from code.
Session cookies are `httpOnly`, `secure`, and `sameSite: 'lax'` or `'strict'` (the CSRF defense; `'none'` sends the cookie on cross-site requests), with a bounded `maxAge`.
<!-- vpmodule:atom:end harden-the-session-cookie -->
<!-- vpmodule:atom:begin hash-passwords-with-a-slow-hash -->
---
instruction_id: hash-passwords-with-a-slow-hash
title: Hash passwords with a slow hash
summary: "Hash with bcrypt at twelve rounds or more, with scrypt or with argon2, and never store a plaintext password."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A password is stored or compared.
conditions_does_not_apply_when: The system holds no passwords.
artifact_contract_output_type: password-storage
artifact_contract_required_data:
  - the algorithm
  - its cost factor
artifact_contract_verified_by: no password is stored or compared in plaintext
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Hash passwords with a slow hash

Hash passwords with bcrypt (≥12 rounds), scrypt, or argon2.
Never store plaintext.
<!-- vpmodule:atom:end hash-passwords-with-a-slow-hash -->
<!-- vpmodule:atom:begin keep-secrets-and-other-tenants-data-out-of-the-context-window -->
---
instruction_id: keep-secrets-and-other-tenants-data-out-of-the-context-window
title: "Keep secrets and other tenants' data out of the context window"
summary: "The context window carries only what the task needs, with no secret, no other tenant's data and no full system prompt in it."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A context window is assembled for a model call.
conditions_does_not_apply_when: No model call is made.
artifact_contract_output_type: context-policy
artifact_contract_required_data:
  - what the context carries
  - what is excluded from it
artifact_contract_verified_by: "the assembled context contains no secret, no other tenant's data and no full system prompt"
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
---

# Keep secrets and other tenants' data out of the context window

**Keep secrets, other tenants' data, and the full system prompt out of the context window** (LLM02, LLM07);
<!-- vpmodule:atom:end keep-secrets-and-other-tenants-data-out-of-the-context-window -->