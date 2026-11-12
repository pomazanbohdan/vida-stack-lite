---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-security-md-714510df-c01"
title: "gsd-core: SECURITY.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:SECURITY.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"SECURITY.md\"}"
atom_ids:
  - annotate-every-security-exclusion-with-a-reason-an-owner-and-an-expiry
  - check-the-installed-dependencies-against-the-declared-ranges
  - report-a-vulnerability-through-a-private-channel
  - separate-an-empty-scope-from-a-scan-that-could-not-run
atom_count: 4
atoms: "[{\"atom_id\":\"annotate-every-security-exclusion-with-a-reason-an-owner-and-an-expiry\",\"file_sha256\":\"910f5697e52c24fbcdea45b89203bc3208dd586009ee89f32fe2e92600983c4a\",\"content_sha256\":\"b581e3bde3e800722c89da98046cb016511983bda43ec57d552a6232cb0a19ea\",\"file_bytes\":2216,\"body_bytes\":931},{\"atom_id\":\"check-the-installed-dependencies-against-the-declared-ranges\",\"file_sha256\":\"df5d5adad1e79baa2bbe33c7d1ae21b5beaf62c99e214a2e11b68ed7d64f4165\",\"content_sha256\":\"bb9265455605cd7aaefcc02ebe0d7a0d1af116c23543422927a2d339272e6669\",\"file_bytes\":2353,\"body_bytes\":1098},{\"atom_id\":\"report-a-vulnerability-through-a-private-channel\",\"file_sha256\":\"ca1926d972a0b56465593b11706ed2df3b29703a2eb4ee0dfb5473e9c0b932ad\",\"content_sha256\":\"dbc28b919bf899889e7897306cb856b7b33b1fb6b5b176d584db08bcd3fe6992\",\"file_bytes\":2003,\"body_bytes\":787},{\"atom_id\":\"separate-an-empty-scope-from-a-scan-that-could-not-run\",\"file_sha256\":\"a39fbcc02f46475a3ad7035a6bc41877e69a60e55a0a2ac1cb12312b4a3351d3\",\"content_sha256\":\"07d4e011e2c6a36e89c7d769dac9e6f21527fe91a56380a66f0807da2d2d2935\",\"file_bytes\":2860,\"body_bytes\":1508}]"
carrier_sha256: 7338f8ab79d5bc09dd72d265f2633bec65bb34777bf210d7ee7b54baa9a932ed
carrier_bytes: 10127
revision: 1
status: active
---
<!-- vpmodule:atom:begin annotate-every-security-exclusion-with-a-reason-an-owner-and-an-expiry -->
---
instruction_id: annotate-every-security-exclusion-with-a-reason-an-owner-and-an-expiry
title: "Annotate every security exclusion with a reason, an owner and an expiry"
summary: "A scanner exclusion is a structured annotation with a reason, an owner and an expiry; a strict scan honours neither an un-annotated nor an expired exclusion."
capability_tags:
  - harden-security-controls
pattern_tags:
  - supply-chain-gating
conditions_applies_when: "A file is excluded from a security scan, or the exclusion list is reviewed."
conditions_does_not_apply_when: No file is excluded from any scan.
artifact_contract_output_type: exclusion-annotation
artifact_contract_required_data:
  - the reason for the exclusion
  - the owner of the exclusion
  - the expiry date of the exclusion
  - the rule id for a wildcard pattern
artifact_contract_verified_by: "a strict scan scans a file whose exclusion is un-annotated or expired, and the lint rejects a bare path"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=SECURITY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Annotate every security exclusion with a reason, an owner and an expiry
Bare paths are accepted in default mode with a deprecation warning but are rejected in strict mode.
The lint runs on every PR.
Required keys: `reason`, `owner`, `expires`.
Wildcard patterns (`**`, `*.ext`) also require `rule-id`.
Run this during every release and scheduled security review:
The `--strict` flag:
- Does **not** honour grandfathered (un-annotated) exclusions — those files are scanned.
- Skips any exclusion whose `expires` date is in the past — those files are scanned.
- Is intended to surface accumulated exclusion debt that default mode masks.
If `--strict` finds findings that default mode does not, those findings represent either (a) an entry that should have been annotated and renewed, or (b) an actual secret that was only hidden by a stale exclusion.
In both cases: investigate, remediate, and update the exclusion annotation.
<!-- vpmodule:atom:end annotate-every-security-exclusion-with-a-reason-an-owner-and-an-expiry -->
<!-- vpmodule:atom:begin check-the-installed-dependencies-against-the-declared-ranges -->
---
instruction_id: check-the-installed-dependencies-against-the-declared-ranges
title: Check the installed dependencies against the declared ranges
summary: "A gate detects invalid, missing and extraneous packages; it has no bypass, and a skipped gate is documented and reversed before the change lands."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: "Dependencies are installed, upgraded or locked in a change."
conditions_does_not_apply_when: The project has no declared dependencies.
artifact_contract_output_type: dependency-integrity-report
artifact_contract_required_data:
  - each invalid package with its declared and installed versions
  - each missing dependency
  - each extraneous package
  - the reason recorded for any skipped gate
artifact_contract_verified_by: the gate exits clean on a correct install and every skipped gate is reversed in a later commit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=SECURITY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Check the installed dependencies against the declared ranges
Three classes of dependency drift that can silently introduce security or reliability risk:
- **Invalid** — an installed package version does not satisfy the declared semver range (e.g., `ws@8.20.0` installed when `8.20.1` is declared).
- **Missing** — a declared dependency is absent from `node_modules/`.
- **Extraneous** — a package is present in `node_modules/` but not declared as a dependency.
The script exits 0 on a clean install and 1 on any finding, with a structured report to stderr listing every offender and both the declared and installed versions for invalid packages.
The canonical fix for any drift is:
rm -rf node_modules && npm ci
Verify the gate before committing.
There is no bypass flag.
If the gate must be skipped for a specific commit (e.g., during a lockfile migration), document the reason in the commit message.
CI workflow steps can be skipped via `if: false` with a comment explaining why and a follow-up issue number.
Any such skip must be reversed in a subsequent commit before the PR is merged.
<!-- vpmodule:atom:end check-the-installed-dependencies-against-the-declared-ranges -->
<!-- vpmodule:atom:begin report-a-vulnerability-through-a-private-channel -->
---
instruction_id: report-a-vulnerability-through-a-private-channel
title: Report a vulnerability through a private channel
summary: "A vulnerability is reported through a private advisory, never a public issue, with the description, the reproduction and the impact."
capability_tags:
  - harden-security-controls
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A security vulnerability has been found in the codebase.
conditions_does_not_apply_when: The finding is an ordinary defect with no security consequence.
artifact_contract_output_type: vulnerability-report
artifact_contract_required_data:
  - the description of the vulnerability
  - the steps to reproduce
  - the potential impact
  - the channel the report was sent to
artifact_contract_verified_by: "the report went to the private advisory channel and carries the description, the reproduction and the impact"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=SECURITY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Report a vulnerability through a private channel
**Please do not report security vulnerabilities through public GitHub issues.**
Instead, please report them via a **private GitHub security advisory**:
Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)
**Acknowledgment**: Within 48 hours
**Initial assessment**: Within 1 week
**Fix timeline**: Depends on severity, but we aim for:
- Critical: 24-48 hours
- Important: 1 week
- Minor: Next release
In scope:
- Execute arbitrary code on user machines
- Expose sensitive data (API keys, credentials)
- Compromise the integrity of generated plans/code
We appreciate responsible disclosure and will credit reporters in release notes (unless you prefer to remain anonymous).
<!-- vpmodule:atom:end report-a-vulnerability-through-a-private-channel -->
<!-- vpmodule:atom:begin separate-an-empty-scope-from-a-scan-that-could-not-run -->
---
instruction_id: separate-an-empty-scope-from-a-scan-that-could-not-run
title: Separate an empty scope from a scan that could not run
summary: "Exit codes distinguish a clean run, findings, a genuinely empty scope and a scope that could not be established; only the empty scope is a pass."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - empty-result-policy
conditions_applies_when: A scanner or a check reports its outcome through an exit code.
conditions_does_not_apply_when: The check has only a pass/fail outcome and needs no more specific code.
artifact_contract_output_type: exit-code-contract
artifact_contract_required_data:
  - the allocated code and its meaning
  - the module that owns the code
  - the proof that the scope was established
artifact_contract_verified_by: a scan that could not establish its scope fails the build and never reads as a clean pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=SECURITY.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/adr/3889-process-exit-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Separate an empty scope from a scan that could not run
**`0` and `1` are free. Every other exit code is allocated from one registry.**
| Code | Meaning |
|--:|---|
| `0` | Clean — files were scanned, no findings. |
| `1` | Findings detected. |
| `64` (`USAGE`) | Bad argv — unknown mode, or a `--file`/`--dir` target that does not exist. |
| `66` (`NO_INPUT`) | Ran; the scope was established and is genuinely empty (e.g. a diff touching only image files, or an all-docs PR). Not a failure. |
| `69` (`UNAVAILABLE`) | Could not establish scope — a nonexistent `--diff` ref, running outside a git repository, a repository with no commits, or an unreadable `--dir`. Distinct from `NO_INPUT`: the scanner never actually ran. |
Treats `0` and `66` as passing steps and `1`/`69` as failing steps — a scan that could not run is a build failure, not a silent clean pass.
**One number, one meaning.** A second declaration of an allocated code is a hard error.
**One owner.** A code is emitted only by its declaring module.
A second emitter is a hard error.
A tool that only needs pass/fail registers nothing.
The moment it needs to say anything **more specific** than pass/fail, it takes a number from the registry — because a locally-invented number is exactly how `2` came to mean four things.
`NO_INPUT` versus `UNAVAILABLE` is the distinction the failures in (a) and (b) collapse, and it is deliberately uncomfortable to author
emitting `NO_INPUT` honestly requires proving the scope was established
<!-- vpmodule:atom:end separate-an-empty-scope-from-a-scan-that-could-not-run -->