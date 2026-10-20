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
status: active
revision: 1
---

# Derive the version from the release tag

A release is an immutable point in history, not a moving branch. Tag it so it can always be reproduced:

```
git tag -a v1.4.0 -m "Release 1.4.0"
git push origin v1.4.0
```

Derive the version from the tag rather than hand-editing it in scattered files, so the artifact, the tag, and the changelog can never disagree.

A release with no tag, or a version number hand-edited out of sync with the tag
