---
instruction_id: never-auto-substitute-a-package-name-after-an-install-failure
title: Never auto-substitute a package name after an install failure
summary: "A package that was only verified by search is assumed, not trusted, and a failed install stops for a person instead of trying a similar name."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A recommended or installed package name is unverified or the install fails.
conditions_does_not_apply_when: The package was verified against its registry and its source.
artifact_contract_output_type: package-legitimacy-record
artifact_contract_required_data:
  - "the registry, the age and the download or source signals"
  - the legitimacy verdict and the disposition
  - the human verification checkpoint when the package is only assumed
artifact_contract_verified_by: an assumed package carries a human checkpoint and no package name was substituted after a failed install
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/package-legitimacy-gate.md
status: active
revision: 1
---

# Never auto-substitute a package name after an install failure
Packages verified only through search are treated as `[ASSUMED]`, not trusted.
`[SLOP]` packages are removed from recommendations.
Plans that need `[ASSUMED]` or suspicious packages add a human verification checkpoint.
Executor install failures stop for human verification instead of auto-trying similarly named packages.
Executor MUST NOT auto-substitute package names after failed package-manager installs.
Research MUST record package registry, age, download/source signals, legitimacy verdict, and disposition.
