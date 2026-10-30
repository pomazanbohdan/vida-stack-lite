---
instruction_id: derive-the-version-from-the-release-tag
title: Derive the version from the release tag
summary: Tag the release as an immutable point in history and derive the version from that tag instead of editing it by hand.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A release is cut and its version has to be fixed in one place.
conditions_does_not_apply_when: The project has no released artifact.
artifact_contract_output_type: release-tag
artifact_contract_required_data:
  - the tag
  - the version derived from it
  - the files that carry the version
artifact_contract_verified_by: "the artifact, the tag and the changelog agree on one version"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=VERSIONING.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/adr/218-release-version-validation.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Derive the version from the release tag

A release is an immutable point in history, not a moving branch. Tag it so it can always be reproduced:

```
git tag -a v1.4.0 -m "Release 1.4.0"
git push origin v1.4.0
```

Derive the version from the tag rather than hand-editing it in scattered files, so the artifact, the tag, and the changelog can never disagree.

A release with no tag, or a version number hand-edited out of sync with the tag
The version travels with the release: derive it once and let the artifacts follow.
Major and minor releases use different pre-release types:
Minor: 1.28.0-rc.1  →  1.28.0-rc.2  →  1.28.0
Major: 2.0.0-beta.1 →  2.0.0-beta.2 →  2.0.0
Validate the version before you spend the release cycle on it.
Replace `^[0-9]+\.[0-9]+\.0$` with `^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.0$`.
Each segment now matches either `0` exactly or a string starting with a non-zero digit followed by zero or more digits.
`1.01.0` fails because the minor segment `01` matches neither alternative.
The error message includes the offending value so maintainers can correct it immediately.
Downstream steps silently normalized the version `1.01.0` to `1.1.0` per the semver specification (leading zeros are stripped).
Reject an already-published version at validation time.
If the version resolves in the registry, the release fails in under 5 seconds with a clear error.
No build or test cycle is wasted.
The late dry-run check is unchanged.
It remains a belt-and-suspenders guard; the new precheck does not remove it.
