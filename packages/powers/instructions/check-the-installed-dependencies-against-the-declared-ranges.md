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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=SECURITY.md
status: active
revision: 1
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
