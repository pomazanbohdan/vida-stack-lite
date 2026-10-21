---
instruction_id: never-guess-a-replacement-path-in-a-checker
title: Never guess a replacement path in a checker
summary: A checker that proposes a replacement path is exactly the failure it was built to catch; refusing to guess is the design.
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A checker finds a path that does not resolve.
conditions_does_not_apply_when: The path resolves and the checker has nothing to report.
artifact_contract_output_type: checker-refusal
artifact_contract_required_data:
  - the unresolved target
  - the reason the checker will not resolve it
artifact_contract_verified_by: the checker reports the unresolved target and proposes no replacement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-verify-command-path-findings.md
status: active
revision: 1
---

# Never guess a replacement path in a checker
**It will not suggest a replacement path.** Prescribing one is exactly the failure that motivated this check — the checker previously guessed twice and was wrong both times, the second time citing a `package.json` that did not exist.
**It does not recognize every launcher.** `pushd`, `make -C`, `yarn --cwd`, `pnpm -C`, and `cargo --manifest-path` report `unresolvable` rather than being half-parsed. Refusing to guess is the design.
