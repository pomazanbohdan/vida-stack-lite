---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-security-and-hardening-skill-md-ee53a342-c03"
title: "addy-skills: skills/security-and-hardening/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/security-and-hardening/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/security-and-hardening/SKILL.md\"}"
atom_ids:
  - keep-secrets-in-the-environment
  - make-personal-data-deletable
  - name-the-trust-boundaries-before-hardening
  - parameterize-every-query
  - restrict-cors-to-an-explicit-origin-list
  - restrict-uploads-by-type-size-and-content
  - review-new-dependencies-beyond-the-audit
  - rotate-a-leaked-secret-before-purging-history
atom_count: 8
atoms: "[{\"atom_id\":\"keep-secrets-in-the-environment\",\"file_sha256\":\"98f2c11e9fa8dc257d8e6ee8d6dee2b800ba455d3e81bc03b334a1475ffd1716\",\"content_sha256\":\"9f03545cdea231946e1f7aee35a7c1cdb2b4da9ff030bebdf80e2bcc335ffe09\",\"file_bytes\":1732,\"body_bytes\":512},{\"atom_id\":\"make-personal-data-deletable\",\"file_sha256\":\"4f616c337c262889cf681b663f4fd5489598e1ccf0f2899d1a879c3fe2efbb7b\",\"content_sha256\":\"f7b42449b785a226cf581fbad755993afa6a7b32fe8289b256c27f1747af5b94\",\"file_bytes\":1576,\"body_bytes\":427},{\"atom_id\":\"name-the-trust-boundaries-before-hardening\",\"file_sha256\":\"921be4c3b772632bdcf6f31328a70ece0abad2732a08847d3dc31339c9d9bb33\",\"content_sha256\":\"5e44b8a0ba835b82409199770bd55bd032a15f2378954dcb59a2af2d071e695d\",\"file_bytes\":2102,\"body_bytes\":925},{\"atom_id\":\"parameterize-every-query\",\"file_sha256\":\"bc45c29d1938c60065bbf0dd4d8d947c2bb3ab58f7b50a1ec710bef683d6964b\",\"content_sha256\":\"2be0c1a04f29e6974e91466fa4ebcb6718102c8085ac594c1ccdaca71d84ef6e\",\"file_bytes\":1297,\"body_bytes\":116},{\"atom_id\":\"restrict-cors-to-an-explicit-origin-list\",\"file_sha256\":\"e8d2a869e4dfa39e8a499de3359419804cd421dce9bf472d240212c983f3ad81\",\"content_sha256\":\"7c4d730ce20b291316e53d33f614b19f36e89c48ad40a005a0180062be84654a\",\"file_bytes\":1348,\"body_bytes\":135},{\"atom_id\":\"restrict-uploads-by-type-size-and-content\",\"file_sha256\":\"9ac6b6f54c10ba0473199ff7980e7eee24a8e17f9de8b4323210b40384e43473\",\"content_sha256\":\"61ede89fa09a4f2ada61c25f7b351aeac22d5fef96a9ac07473a69421c0aa5a7\",\"file_bytes\":1353,\"body_bytes\":163},{\"atom_id\":\"review-new-dependencies-beyond-the-audit\",\"file_sha256\":\"fcc6cbb31bd1d9d64291f66ea06c1cbe87377b4db744895026b2ea3cb2a82c1d\",\"content_sha256\":\"48f4fd1d3d8e02c9deeccdc7d58141467d21ae9a1edd104beabd149df087bc8a\",\"file_bytes\":1701,\"body_bytes\":510},{\"atom_id\":\"rotate-a-leaked-secret-before-purging-history\",\"file_sha256\":\"f3d7766ba6126dbac596e551e81fb32e7bf9e99b2bd58b6ae4333ec6b862efca\",\"content_sha256\":\"bfba7e308f662f307bccea9ab301da2e32f948524d3d740e518d25774dcf9db7\",\"file_bytes\":1837,\"body_bytes\":441}]"
carrier_sha256: 6bb74686d28e4af5b7cb684bf88a294ad181550def000b5bb11ff45889a37782
carrier_bytes: 13991
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-secrets-in-the-environment -->
---
instruction_id: keep-secrets-in-the-environment
title: Keep secrets in the environment
summary: "Secrets come from the environment, the committed example file carries placeholders, and the staged diff is checked before every commit."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The project holds secrets or key material.
conditions_does_not_apply_when: The project holds no secret.
artifact_contract_output_type: secret-handling
artifact_contract_required_data:
  - where each secret comes from
  - the committed example file
  - the staged diff check
artifact_contract_verified_by: the staged diff was checked for secrets before the commit
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
  - operations
---

# Keep secrets in the environment

Secrets come from the environment.
`.env.example` is committed with placeholders; real `.env*` files and key material are gitignored; grep the staged diff before committing.

```
.env files:
  ├── .env.example  → Committed (template with placeholder values)
  ├── .env          → NOT committed (contains real secrets)
  └── .env.local    → NOT committed (local overrides)

.gitignore must include:
  .env
  .env.local
  .env.*.local
  *.pem
  *.key
```
<!-- vpmodule:atom:end keep-secrets-in-the-environment -->
<!-- vpmodule:atom:begin make-personal-data-deletable -->
---
instruction_id: make-personal-data-deletable
title: Make personal data deletable
summary: "Every personal-data store needs a retention limit and a working deletion path, including the backups, the caches, the search indexes and the analytics copies."
capability_tags:
  - manage-personal-data
pattern_tags:
  - data-minimization
conditions_applies_when: The system stores personal data.
conditions_does_not_apply_when: The system stores no personal data.
artifact_contract_output_type: retention-and-deletion
artifact_contract_required_data:
  - the retention limit of each store
  - the deletion path
  - the export and correction paths
artifact_contract_verified_by: "a deletion request removes the data from every store including the backups, the caches and the analytics copies"
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

# Make personal data deletable

**Set retention up front, then actually delete.**
Every personal-data store needs a TTL and a working deletion path, including backups, caches, search indexes, and analytics copies.
**Support the data-subject rights your jurisdiction requires** (GDPR, CCPA, and kin): export, correct, delete.
Design the schema so a user's data is findable and erasable, not smeared irreversibly across systems.
<!-- vpmodule:atom:end make-personal-data-deletable -->
<!-- vpmodule:atom:begin name-the-trust-boundaries-before-hardening -->
---
instruction_id: name-the-trust-boundaries-before-hardening
title: Name the trust boundaries before you harden
summary: "Map where untrusted data crosses into the system and name the assets, because trust follows who wrote a value and not which channel delivered it."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: "A feature accepts untrusted data, stores sensitive data or calls an external service."
conditions_does_not_apply_when: The change touches no external input and handles no sensitive data.
artifact_contract_output_type: trust-boundary-map
artifact_contract_required_data:
  - the boundaries
  - the assets
  - the values that look internal but are not
artifact_contract_verified_by: every boundary names what crosses it and what is worth stealing or breaking
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

# Name the trust boundaries before you harden

Controls bolted on without a threat model are guesses.
Before hardening, spend five minutes thinking like an attacker:

**Map the trust boundaries.**
Where does untrusted data cross into your system? HTTP requests, form fields, file uploads, webhooks, third-party APIs, message queues, and **LLM output** — plus the local values that look internal because the OS handed them to you: another process's command line or environment, filenames on a shared volume, a path in a job payload.
Trust follows who *wrote* a value, not which channel delivered it.
Every boundary is attack surface.

**Name the assets.**
What's worth stealing or breaking? Credentials, PII, payment data, admin actions, money movement.

If you can't name the trust boundaries for a feature, you're not ready to secure it. This is OWASP **A04: Insecure Design** — most breaches begin in design, not code.
<!-- vpmodule:atom:end name-the-trust-boundaries-before-hardening -->
<!-- vpmodule:atom:begin parameterize-every-query -->
---
instruction_id: parameterize-every-query
title: Parameterize every query
summary: "Never build a SQL, NoSQL or shell command from an input string, and bind the input as a parameter instead."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: Code builds a query or a command from data that came from outside the program.
conditions_does_not_apply_when: The query is a fixed literal with no external input.
artifact_contract_output_type: query-hardening
artifact_contract_required_data:
  - the query
  - its parameterized form
artifact_contract_verified_by: no query string in the changed code is built by concatenation
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

# Parameterize every query

Parameterize every query.
Never build SQL, NoSQL, or shell commands from input strings.
<!-- vpmodule:atom:end parameterize-every-query -->
<!-- vpmodule:atom:begin restrict-cors-to-an-explicit-origin-list -->
---
instruction_id: restrict-cors-to-an-explicit-origin-list
title: Restrict CORS to an explicit origin list
summary: "Take the allowed origins from configuration, and never answer with a wildcard when credentials are allowed."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A browser may call the application cross-origin.
conditions_does_not_apply_when: The application serves no cross-origin browser traffic.
artifact_contract_output_type: cors-policy
artifact_contract_required_data:
  - the allowed origins
  - the credentials setting
artifact_contract_verified_by: the allowed origin list is explicit and no wildcard is combined with credentials
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

# Restrict CORS to an explicit origin list

CORS restricted to an explicit origin list from configuration.
Never `*` with credentials.
<!-- vpmodule:atom:end restrict-cors-to-an-explicit-origin-list -->
<!-- vpmodule:atom:begin restrict-uploads-by-type-size-and-content -->
---
instruction_id: restrict-uploads-by-type-size-and-content
title: "Restrict uploads by type, size and content"
summary: "Allowlist the media types, cap the size and verify the content, because the extension proves nothing."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The system accepts uploaded files.
conditions_does_not_apply_when: The system accepts no uploads.
artifact_contract_output_type: upload-policy
artifact_contract_required_data:
  - the allowed types
  - the size cap
  - the content check
artifact_contract_verified_by: "an upload outside the allowlist, above the cap or with the wrong content is rejected"
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

# Restrict uploads by type, size and content

Uploads: allowlist MIME types, cap size, verify content (magic bytes) when it matters.
The extension proves nothing.
<!-- vpmodule:atom:end restrict-uploads-by-type-size-and-content -->
<!-- vpmodule:atom:begin review-new-dependencies-beyond-the-audit -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
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
<!-- vpmodule:atom:end review-new-dependencies-beyond-the-audit -->
<!-- vpmodule:atom:begin rotate-a-leaked-secret-before-purging-history -->
---
instruction_id: rotate-a-leaked-secret-before-purging-history
title: Rotate a leaked secret before you purge the history
summary: "A secret that reaches a remote is compromised the moment it lands, so revoke and reissue it first and only then remove it from the history."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "A secret was committed, logged, shared or otherwise left the machine."
conditions_does_not_apply_when: The secret never left the machine and was never committed.
artifact_contract_output_type: rotation-record
artifact_contract_required_data:
  - the secret
  - the rotation
  - the purge
artifact_contract_verified_by: the key was revoked and reissued before the history was rewritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/references/hardening-patterns.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/security/baseline.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Rotate a leaked secret before you purge the history

**If a secret is ever committed, rotate it.**
Deleting the line or rewriting history is not enough — assume it's compromised the moment it reaches a remote.
Revoke and reissue the key first, then purge it from history.
- Immediately revoke the exposed credential in the issuing service (GitHub, npm, cloud, etc.)
- Rotate all credentials that shared the same scope as the exposed one
<!-- vpmodule:atom:end rotate-a-leaked-secret-before-purging-history -->