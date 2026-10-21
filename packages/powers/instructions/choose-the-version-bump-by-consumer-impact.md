---
instruction_id: choose-the-version-bump-by-consumer-impact
title: Choose the version bump by consumer impact
summary: "Let the version number say what a consumer will observe: breaking change, new behaviour or a fix."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A release is being prepared for something that depends on the code.
conditions_does_not_apply_when: Nothing outside the project depends on the code.
artifact_contract_output_type: version-decision
artifact_contract_required_data:
  - what consumers observe
  - the chosen bump
  - the promise the number makes
artifact_contract_verified_by: the number matches the observable change and the code behaves as the number promises
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/version-a-capability.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=VERSIONING.md
status: active
revision: 2
---

# Choose the version bump by consumer impact

Commits are how *you* track change; a **version** is how your *consumers* track it. The moment anything else depends on your code — another team, a published package, a deployed client — "latest on main" stops being a sufficient answer to "what am I running, and is it safe to upgrade?" A version number and a changelog are the contract that answers it.

For anything with consumers, version `MAJOR.MINOR.PATCH` and let the number carry meaning:

```
  MAJOR  breaking change — consumers must change their code to upgrade
  MINOR  new functionality, backward-compatible — safe to upgrade
  PATCH  bug fix, backward-compatible — safe to upgrade
```

The number is a promise, so make the code match it. A "patch" that changes behavior consumers relied on is a major change wearing a disguise (Hyrum's Law — see the interface-design skill). When unsure whether a change is breaking, assume it is; a surprise major is far cheaper than a broken consumer.

"It's just a small fix, bump the patch" | Check what consumers can observe. A behavior change they relied on is a major, whatever the diff size.

A breaking change shipped under a minor or patch version bump
| Backwards-compatible bug fixes or minor prompt improvements | **patch** (0.0.x) | Fix a typo in an agent instruction; tighten a hook condition. |
| New extension point, new skill, or new config key — existing consumers unaffected | **minor** (0.x.0) | Add a new optional config key. |
| Breaking change to the hook contract, removal of a skill or config key, change of `id` | **major** (x.0.0) | Rename a hook extension point; remove a skill consumers depend on. |
Concretely:
| Increment | When | Examples |
|-----------|------|----------|
| **PATCH** | Bug fixes, typo corrections, test additions | A config corruption fix |
| **MINOR** | Non-breaking enhancements, new commands, new runtime support | A new workflow command |
| **MAJOR** | Breaking changes to config format, CLI flags, or runtime API; new features that alter existing behavior | Removing a command, changing a config schema |
Branch names map to commit types:
| Branch prefix | Commit type | Version bump |
|--------------|-------------|-------------|
| `fix/` | `fix:` | PATCH |
| `feat/` | `feat:` | MINOR |
| `hotfix/` | `fix:` | PATCH (immediate) |
| `chore/` | `chore:` | none |
| `docs/` | `docs:` | none |
| `refactor/` | `refactor:` | none |
