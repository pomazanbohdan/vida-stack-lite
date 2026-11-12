---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-references-security-checklist-md-e8c81bd8-c02"
title: "addy-skills: references/security-checklist.md module"
summary: "Carrier for 7 atomic instructions from addy-skills:references/security-checklist.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"references/security-checklist.md\"}"
atom_ids:
  - keep-secrets-out-of-code-and-logs
  - keep-untrusted-values-out-of-code-and-queries
  - locate-the-installation-boundary
  - minimise-and-expire-personal-data
  - model-threats-before-adding-controls
  - return-generic-errors-in-production
  - vet-dependencies-for-advisories-and-provenance
atom_count: 7
atoms: "[{\"atom_id\":\"keep-secrets-out-of-code-and-logs\",\"file_sha256\":\"41d434f8d31b9c4c2a2231ff94126c63830d5274a1aecbd245676fa8897b86cb\",\"content_sha256\":\"35cdec04bca85632b72566af9ba760b92fd4354b5cc05d5454b286bbbc935d81\",\"file_bytes\":2103,\"body_bytes\":565},{\"atom_id\":\"keep-untrusted-values-out-of-code-and-queries\",\"file_sha256\":\"1db10bfc4d1edd00c80c9906ac30f24fb2aa403a53ef83d419bc9c4561b74a49\",\"content_sha256\":\"e237ab06d8979509ac49bc1a2680e69e0533d0f3367d2b3bdaffe9a832714979\",\"file_bytes\":1479,\"body_bytes\":291},{\"atom_id\":\"locate-the-installation-boundary\",\"file_sha256\":\"ea19e50d4f8efd94b490666b113f2a10e1b890f6c612729caebb1cd7f94bbd09\",\"content_sha256\":\"192fac65c70670bc903605b5f41108241467675e24f9d7a1feb7fdefcfdaf464\",\"file_bytes\":1886,\"body_bytes\":696},{\"atom_id\":\"minimise-and-expire-personal-data\",\"file_sha256\":\"60b0e4c80a9ce2e10264c624461898707750ceea4ceb10842b6e4043726945f8\",\"content_sha256\":\"4e5cdc549741d24da6be46f8e9a0c5001931e529c79fffe70aa2b6f68e287dc0\",\"file_bytes\":1620,\"body_bytes\":458},{\"atom_id\":\"model-threats-before-adding-controls\",\"file_sha256\":\"32fb3fb76df24728a51d04850f70e8f2614ac4220e411c182dda8d238c5380d7\",\"content_sha256\":\"d2cf3a1ce3f584df23fb3d46d603a0b82f995da371f6e13dfaf18a25a6b13482\",\"file_bytes\":1932,\"body_bytes\":708},{\"atom_id\":\"return-generic-errors-in-production\",\"file_sha256\":\"67ad3bcdb33e13e089b3499924f4ed5052d4a75ea75739f31547a1d9aa58cf5e\",\"content_sha256\":\"f2babf90b34d8bfc2937d03b747421ca8c9ea7ac210be570cc588a567f264431\",\"file_bytes\":1387,\"body_bytes\":325},{\"atom_id\":\"vet-dependencies-for-advisories-and-provenance\",\"file_sha256\":\"eaefac199e057e60c9c2b7d518edd97633051c873f89cdbbba0b3f6fe36d3342\",\"content_sha256\":\"e1f941c4ea5a36dee3ea07c09658262c6c07a627b00fa7e77bf5afacd58fe4e1\",\"file_bytes\":2289,\"body_bytes\":1024}]"
carrier_sha256: 8028c59a3e819d84a2f9a94b6231ef8a8ef1776fb248053af6c08d03147b7095
carrier_bytes: 13621
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-secrets-out-of-code-and-logs -->
---
instruction_id: keep-secrets-out-of-code-and-logs
title: Keep secrets out of code and logs
summary: "No secret is written into the repository, into an example file or into a log line, secret fields never leave the server in a response, and a report that leaves the working copy is stripped of keys, tokens and machine paths."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work handles a secret, a token, a credential or personal data."
conditions_does_not_apply_when: The work handles no secret at all.
artifact_contract_output_type: secret-handling-review
artifact_contract_required_data:
  - the secrets in scope
  - where each one is allowed to appear
  - the secret fields excluded from responses
  - the values stripped from the report
artifact_contract_verified_by: "no secret appears in the tracked files, in the example files, in the responses, in the logs or in the report"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=commands/gsd/forensics.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=skills/gsd-forensics/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Keep secrets out of code and logs
No secrets in code
`.gitignore` covers: `.env`, `.env.local`, `*.pem`, `*.key`
`.env.example` uses placeholder values (not real secrets)
Sensitive fields excluded from API responses (`passwordHash`, `resetToken`, etc.)
Sensitive data not logged (passwords, tokens, full CC numbers)
LLM02 Sensitive Information Disclosure | Keep secrets/PII out of prompts; filter outputs
Cryptographic Failures | HTTPS, strong hashing, no secrets in code
**Redact sensitive data:** Strip absolute paths, API keys, tokens from reports and issues.
<!-- vpmodule:atom:end keep-secrets-out-of-code-and-logs -->
<!-- vpmodule:atom:begin keep-untrusted-values-out-of-code-and-queries -->
---
instruction_id: keep-untrusted-values-out-of-code-and-queries
title: Keep untrusted values out of code and queries
summary: "Untrusted values never become code: queries are parameterized, output is encoded, and model output never reaches an evaluator, a shell or a file path."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "Untrusted data reaches a query, a rendered page or an executable context."
conditions_does_not_apply_when: The work handles no untrusted data.
artifact_contract_output_type: injection-review
artifact_contract_required_data:
  - the untrusted values
  - where each one lands
  - the mechanism that keeps it out of code
artifact_contract_verified_by: "no untrusted value reaches an evaluator, a query string, a shell or a path without parameterisation or encoding"
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

# Keep untrusted values out of code and queries
SQL queries parameterized (no string concatenation)
HTML output encoded (use framework auto-escaping)
Model output treated as untrusted — never into `eval`/SQL/shell/`innerHTML`/file paths
Injection | Parameterized queries, input validation
<!-- vpmodule:atom:end keep-untrusted-values-out-of-code-and-queries -->
<!-- vpmodule:atom:begin locate-the-installation-boundary -->
---
instruction_id: locate-the-installation-boundary
title: Locate the installation boundary
summary: "The boundary that owns the manifest and the dependency graph is found first, its package manager, lockfile and CI commands are corroborated, and a disagreement stops the work."
capability_tags:
  - harden-security-controls
pattern_tags:
  - supply-chain-gating
conditions_applies_when: "Dependencies are about to be installed, audited or upgraded."
conditions_does_not_apply_when: The work installs nothing and changes no dependency.
artifact_contract_output_type: installation-boundary-note
artifact_contract_required_data:
  - the boundary root
  - the package manager
  - the lockfile
  - the CI install command
artifact_contract_verified_by: "the manager, the lockfile and the CI command agree at the boundary, and a disagreement stops the work"
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

# Locate the installation boundary
First locate the **installation boundary**. If the package is matched by a parent `workspaces` declaration, use that workspace root; otherwise use the nearest project root that owns both its manifest and dependency graph.
At that boundary, corroborate `packageManager` (when present), the lockfile, and CI commands. Stop if they disagree or competing manager lockfiles exist there.
A nested project is independent only when it is outside the parent workspace; independent subprojects may legitimately use different managers.
For an unlisted manager or version, consult its official documentation; do not substitute another manager's commands or newer defaults.
<!-- vpmodule:atom:end locate-the-installation-boundary -->
<!-- vpmodule:atom:begin minimise-and-expire-personal-data -->
---
instruction_id: minimise-and-expire-personal-data
title: Minimise and expire personal data
summary: "Personal data is classified, collected for a stated purpose, kept to a retention limit and can be deleted everywhere it was written."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work collects, stores or shares personal data."
conditions_does_not_apply_when: The work handles no personal data.
artifact_contract_output_type: personal-data-review
artifact_contract_required_data:
  - the data classes
  - the purpose of each collection
  - the retention limit
  - the deletion path
  - the sharing agreements
artifact_contract_verified_by: the retention limit and a working deletion path exist for every class of personal data
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
  - business
  - operations
---

# Minimise and expire personal data
PII encrypted at rest (if required by regulation)
HTTPS for all external communication
Database backups encrypted
Personal data is classified, collected against a stated purpose, and minimized
Personal data has a retention limit and a working deletion path (incl. backups, caches, indexes)
Export/delete (data-subject) requests are supported where required; third-party sharing has consent and a data-processing agreement
<!-- vpmodule:atom:end minimise-and-expire-personal-data -->
<!-- vpmodule:atom:begin model-threats-before-adding-controls -->
---
instruction_id: model-threats-before-adding-controls
title: Model the threats before adding controls
summary: "Trust boundaries, assets, a threat per boundary and the abuse cases are written down before any control is chosen."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A change adds or changes a surface that untrusted input can reach.
conditions_does_not_apply_when: The change touches no external surface.
artifact_contract_output_type: threat-model
artifact_contract_required_data:
  - the trust boundaries
  - the assets
  - the threat per boundary
  - the abuse cases
artifact_contract_verified_by: every boundary has a named threat and an abuse case next to its use cases
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/security-enforcement.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Model the threats before adding controls
Before reaching for controls, spend five minutes thinking like an attacker:
Trust boundaries mapped (requests, uploads, webhooks, third-party APIs, LLM output, and local values written by processes you don't control)
Assets named (credentials, PII, payment data, admin actions, money movement)
STRIDE run per boundary (Spoofing, Tampering, Repudiation, Info disclosure, DoS, Elevation)
Abuse cases written next to use cases ("how would I misuse this?")
Insecure Design | Threat modeling, spec-driven development
System MUST perform threat-model-anchored verification (not blind scanning)
System MUST block phase advancement based on configurable severity threshold
<!-- vpmodule:atom:end model-threats-before-adding-controls -->
<!-- vpmodule:atom:begin return-generic-errors-in-production -->
---
instruction_id: return-generic-errors-in-production
title: Return generic errors in production
summary: "A production error carries a code and a generic message, never the exception text, the stack or the query."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A request fails and the error is turned into a response.
conditions_does_not_apply_when: The work returns no error response.
artifact_contract_output_type: error-response-review
artifact_contract_required_data:
  - the error code
  - the message returned
  - where the details went
artifact_contract_verified_by: "the production response body carries no message, stack or query from the internals"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Return generic errors in production
Production: generic error, no internals
`error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' }`
// NEVER in production:
res.status(500).json({
  error: err.message,
  stack: err.stack,         // Exposes internals
  query: err.sql,           // Exposes database details
});
<!-- vpmodule:atom:end return-generic-errors-in-production -->
<!-- vpmodule:atom:begin vet-dependencies-for-advisories-and-provenance -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/security-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
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
<!-- vpmodule:atom:end vet-dependencies-for-advisories-and-provenance -->