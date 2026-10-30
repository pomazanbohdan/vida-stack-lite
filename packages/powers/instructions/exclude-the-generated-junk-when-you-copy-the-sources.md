---
instruction_id: exclude-the-generated-junk-when-you-copy-the-sources
title: Exclude the generated junk when you copy the sources
summary: "When the source files of a package are copied, the generated and machine-owned files are left out."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: The files of a finished experiment are copied into a package.
conditions_does_not_apply_when: The package is a pointer to the originals and copies nothing.
artifact_contract_output_type: packaged-sources
artifact_contract_required_data:
  - the copied source files
  - the excluded file classes
artifact_contract_verified_by: "no dependency, cache, lock or system file travels with the package"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sketch-wrap-up.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Exclude the generated junk when you copy the sources
Exclude node_modules, build artifacts, .DS_Store
`node_modules/`, `__pycache__/`, `.venv/`, build artifacts
Lock files (`package-lock.json`, `yarn.lock`, etc.)
`.git/`, .DS_Store
