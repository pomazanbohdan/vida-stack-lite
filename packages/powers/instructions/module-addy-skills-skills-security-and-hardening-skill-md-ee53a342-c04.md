---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-security-and-hardening-skill-md-ee53a342-c04"
title: "addy-skills: skills/security-and-hardening/SKILL.md module"
summary: "Carrier for 7 atomic instructions from addy-skills:skills/security-and-hardening/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/security-and-hardening/SKILL.md\"}"
atom_ids:
  - run-stride-over-each-trust-boundary
  - set-security-headers-on-every-response
  - strip-sensitive-fields-from-responses
  - treat-model-output-as-untrusted-input
  - triage-audit-findings-by-reachability
  - validate-with-a-schema-at-the-boundary
  - write-the-abuse-case-next-to-the-use-case
atom_count: 7
atoms: "[{\"atom_id\":\"run-stride-over-each-trust-boundary\",\"file_sha256\":\"32c30ed487636d64912e4166089f820ccc9f9efd0eb60ed6dd0757b4d34dce25\",\"content_sha256\":\"644eebe1ed09ccb7b6313fd818e18c55617277a0475691446c6c5c38b75ffca6\",\"file_bytes\":1793,\"body_bytes\":761},{\"atom_id\":\"set-security-headers-on-every-response\",\"file_sha256\":\"01bec9064f924ad6204087739a711c7e6b4f3b8eafd9c2643fea45b327d52d15\",\"content_sha256\":\"5021e6dde1f88720daeeb9a2af0f75eebd015f49d879bbc76e1208c75f44068b\",\"file_bytes\":1333,\"body_bytes\":184},{\"atom_id\":\"strip-sensitive-fields-from-responses\",\"file_sha256\":\"dff6e6e026a70b29571f044ec2ffadbc9fe3167a3c71452ff67279dc400d1d4a\",\"content_sha256\":\"911e6d08e36a08041ca9edf7096a69b458e8b0afed8420e0a3ae37b761bc2968\",\"file_bytes\":1431,\"body_bytes\":176},{\"atom_id\":\"treat-model-output-as-untrusted-input\",\"file_sha256\":\"46b3134e7da0fda11d51979c6aeed586e2c66b39c431413ffc3bc8e24cfce2e4\",\"content_sha256\":\"de6864b8756fab969921d3f55e5a52e89c890084253c202d2c867bb9a9f3570f\",\"file_bytes\":1813,\"body_bytes\":605},{\"atom_id\":\"triage-audit-findings-by-reachability\",\"file_sha256\":\"4e606df89240850e11260f4ab964408af0354c843f07b854974a126b43523225\",\"content_sha256\":\"070fd43b524c2177a42cf17e9f8ebb5ef94b0ff54f4b47f5f3a7635a1808db1f\",\"file_bytes\":2950,\"body_bytes\":1588},{\"atom_id\":\"validate-with-a-schema-at-the-boundary\",\"file_sha256\":\"1998a4ab1517d7046c7f3568e1f1e1aa5fa1aec3987e36a312bfae975f70e81f\",\"content_sha256\":\"5cf3994d1f51c52a2f4607f15e3fdbc7ca754de2af1d703676722b1ae5aabd11\",\"file_bytes\":1553,\"body_bytes\":217},{\"atom_id\":\"write-the-abuse-case-next-to-the-use-case\",\"file_sha256\":\"1207fc0ed86b3ddf435cf5e20ef2df378572ff6eea76966513c72f3e50ccc45f\",\"content_sha256\":\"78c189e02b85455e1962c841568435a5232012e574e83dec17a9619ac3416b87\",\"file_bytes\":1143,\"body_bytes\":171}]"
carrier_sha256: ab3db46c424b30288378fefca1194bc0c222342f28291221c4e13b5d9d7eaf7d
carrier_bytes: 12947
revision: 1
status: active
---
<!-- vpmodule:atom:begin run-stride-over-each-trust-boundary -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
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
<!-- vpmodule:atom:end run-stride-over-each-trust-boundary -->
<!-- vpmodule:atom:begin set-security-headers-on-every-response -->
---
instruction_id: set-security-headers-on-every-response
title: Set security headers on every response
summary: "Start the content security policy from the default self source and tighten it, never loosen it."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The application serves responses over HTTP.
conditions_does_not_apply_when: The application serves no HTTP responses.
artifact_contract_output_type: security-headers
artifact_contract_required_data:
  - the headers
  - the content security policy directives
artifact_contract_verified_by: the headers are present on the response
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

# Set security headers on every response

Security headers on every response (helmet or the framework equivalent); CSP starts from `default-src 'self'` and is tightened, not loosened.
<!-- vpmodule:atom:end set-security-headers-on-every-response -->
<!-- vpmodule:atom:begin strip-sensitive-fields-from-responses -->
---
instruction_id: strip-sensitive-fields-from-responses
title: Strip sensitive fields from responses
summary: "Remove the secret-bearing fields before a response is built, and keep the error bodies generic while the internals go to the server log only."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "A response carries a record that holds secret-bearing fields, or an error."
conditions_does_not_apply_when: The response carries no record and no error.
artifact_contract_output_type: response-policy
artifact_contract_required_data:
  - the stripped fields
  - the error body
artifact_contract_verified_by: no secret-bearing field and no internal detail reaches the response
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
  - operations
---

# Strip sensitive fields from responses

Strip sensitive fields (`passwordHash`, reset tokens) before any response.
Error bodies are generic; internals go to server logs only.
<!-- vpmodule:atom:end strip-sensitive-fields-from-responses -->
<!-- vpmodule:atom:begin treat-model-output-as-untrusted-input -->
---
instruction_id: treat-model-output-as-untrusted-input
title: Treat model output as untrusted input
summary: "Never pass model output into a query, the DOM, a shell, an eval or a file path, and parse it defensively, validate it against a schema and then encode it."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: Text produced by a model reaches the program.
conditions_does_not_apply_when: No model output is used.
artifact_contract_output_type: model-output-handling
artifact_contract_required_data:
  - the parse
  - the schema
  - the encoding
artifact_contract_verified_by: "the model output is parsed, validated and encoded before it is used"
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

# Treat model output as untrusted input

**Model output is untrusted input.**
Never into `eval`, SQL, a shell, `innerHTML`, or a file path; parse defensively, validate against a schema, then encode.

```typescript
// GOOD: model output is data — parse defensively, then validate, then encode
let intent;
try {
  intent = CommandSchema.parse(JSON.parse(await llm.replyJson(userMessage)));
} catch {
  throw new ValidationError('unexpected model output'); // JSON.parse or schema failed
}
await runAllowlistedAction(intent.action, intent.params);
container.textContent = await llm.reply(userMessage);
```
<!-- vpmodule:atom:end treat-model-output-as-untrusted-input -->
<!-- vpmodule:atom:begin triage-audit-findings-by-reachability -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/references/hardening-patterns.md
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
<!-- vpmodule:atom:end triage-audit-findings-by-reachability -->
<!-- vpmodule:atom:begin validate-with-a-schema-at-the-boundary -->
---
instruction_id: validate-with-a-schema-at-the-boundary
title: Validate with a schema at the boundary
summary: "Validate at the boundary against a schema of allowlisted shapes, lengths, enums and formats, reject with a structured error, and let only the parsed value downstream."
capability_tags:
  - harden-validation
pattern_tags:
  - defense-in-depth
conditions_applies_when: "A request body, a form field or a query parameter enters the system."
conditions_does_not_apply_when: The value was already parsed and validated at its boundary.
artifact_contract_output_type: schema-validation
artifact_contract_required_data:
  - the schema
  - the rejection status and details
  - the parsed value
artifact_contract_verified_by: invalid input is rejected with the structured error and the downstream code receives only the parsed value
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

# Validate with a schema at the boundary

Validate at the boundary with a schema: allowlisted shape, lengths, enums, formats.
Reject with 422 and structured details; downstream code uses only the parsed, typed value.
<!-- vpmodule:atom:end validate-with-a-schema-at-the-boundary -->
<!-- vpmodule:atom:begin write-the-abuse-case-next-to-the-use-case -->
---
instruction_id: write-the-abuse-case-next-to-the-use-case
title: Write the abuse case next to the use case
summary: "For each feature ask how you would misuse it, and make that the first test."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: The use cases of a feature are written.
conditions_does_not_apply_when: The feature takes no input and performs no action.
artifact_contract_output_type: abuse-case
artifact_contract_required_data:
  - the misuse
  - the first test it drives
artifact_contract_verified_by: the abuse case is the first test for the feature
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

# Write the abuse case next to the use case

**Write abuse cases next to use cases.**
For each feature, ask "how would I misuse this?" — then make that your first test.
<!-- vpmodule:atom:end write-the-abuse-case-next-to-the-use-case -->