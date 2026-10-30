---
instruction_id: review-a-dependency-upgrade
title: Review a dependency upgrade against its changelog
summary: "Read the changelog, upgrade one dependency per change, let the tests decide, and review the lockfile diff."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - code-review
conditions_applies_when: "An existing dependency is upgraded, especially in a bulk bump."
conditions_does_not_apply_when: No dependency version changes.
artifact_contract_output_type: upgrade-review
artifact_contract_required_data:
  - the changelog notes read
  - the isolated upgrade
  - the suite result before and after
  - the lockfile diff
artifact_contract_verified_by: "the changelog was read, the suite was green before and after, and the lockfile diff was reviewed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Review a dependency upgrade against its changelog

**Upgrading an existing dependency** is a code change like any other, and the riskiest upgrades are the ones merged in bulk with a message like "bump deps." Review them with the same discipline:

1. **Read the changelog, not just the version number.** Semver is a promise the maintainer may not have kept — a "patch" can carry a behavioral change. For a major bump, read the migration notes and find what breaks.
2. **One dependency per change.** Upgrade and merge them individually (or in small related groups). When a bulk bump breaks the build, you've lost which package did it; a single-package change makes the cause obvious and the revert clean.
3. **Let the tests decide.** The upgrade is verified by a green suite before *and* after, not by "it installed." If coverage around the dependency's behavior is thin, that gap is the real finding — add a test first.
4. **Mind the transitive graph.** Most installed packages are ones nobody chose directly. Review the lockfile diff, not just `package.json`; a single direct bump can pull in dozens of indirect changes.
5. **Keep the lockfile honest.** Commit it, review its diff, and never hand-edit it. The lockfile is the thing that actually pins what ships.

"It's just a version bump" | A bump is a behavior change you didn't write. Read the changelog; semver doesn't guarantee no breakage.

"I'll upgrade everything in one PR to save time" | A bulk bump that breaks the build hides which package did it. One dependency per change keeps the cause and the revert clean.

A lockfile change that's hand-edited, uncommitted, or merged without reviewing its diff
