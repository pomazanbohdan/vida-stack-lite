---
instruction_id: enforce-package-boundaries-with-a-check
title: Enforce package boundaries with a check
summary: Make each package a deep module by wiring a dependency check that fails on deep imports and proving the rules bite on a deliberate violation.
capability_tags:
  - harden-validation
pattern_tags:
  - defense-in-depth
conditions_applies_when: "A multi-package repo must keep each package's implementation hidden behind its entry points."
conditions_does_not_apply_when: The repo is a single package.
artifact_contract_output_type: boundary-check
artifact_contract_required_data:
  - rules
  - check command
  - observed pass and fail
artifact_contract_verified_by: "the check passes clean, fails on a deep import, and passes again after the revert"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/in-progress/setup-ts-deep-modules/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Enforce package boundaries with a check
Make every package in this repo a **deep module**: a lot of behaviour behind a small interface. A package's public surface is its **entry points** (the files at the package root), and everything in its subfolders is hidden. This skill installs a dependency-cruiser and the rules that make the entry points the only way in, then proves the rules bite.
The public surface is the package's **root files**, not one designated `index.ts`. By convention implementation lives in `lib/` and tests in `tests/`, giving every package the same two-folder shape. The rule itself is general, though: *anything* in *any* subfolder is private, so you never extend the config to add a folder.
Four rules, all `error`:
1. **Entry-point boundary**: code outside a package (app code or another package) may import only that package's entry points (its root files), never anything in its subfolders.
2. **Intra-package freedom**: a package's own files import each other freely.
3. **Tests through the entry points**: files under `<pkg>/tests/` may import any package's entry points and their own `tests/` fixtures, but never any package's subfolder internals (not even their own). Integration tests across packages are fine; deep imports are not.
4. **No cycles**: no dependency cycles.
**Entry points, not a barrel.** Because the public surface is *every* root file, a package can expose several small entry points (`index.ts`, `client.ts`, `server.ts`) instead of funnelling everything through one giant `index.ts`. Barrel files that re-export a whole subtree are discouraged; keep entry points small and hide implementation in subfolders.
## Prove the rules bite
This is the completion criterion for the whole skill: a config that doesn't fail on a violation is worthless.
1. Run the boundary check. It must **pass** on the clean example.
2. Temporarily add a deep import to a test file (e.g. `import { thing } from "../lib/impl"`). Run the check again; it must **fail** with `tests-through-entrypoints`.
3. Revert the deep import. Run once more, and it must **pass**.
**Done when:** you have observed a pass, then a fail on the deep import, then a pass again. If step 2 does not fail, the rules are not wired correctly, so fix before finishing.
## Document the convention
Write a `README.md` **in the packages folder** covering: the layout (entry points at the root, `lib/` for implementation, `tests/` for tests), "import only through a package's entry points (its root files)", and how to run the boundary check. **Discourage barrel files** explicitly: expose several small entry points instead of re-exporting a whole subtree through one index. Then add a **context pointer** to it from the repo's agent-instructions file. One line is enough, e.g. `Packages are deep modules: see the packages README before adding or importing one.` This is what makes an agent discover the boundary rule instead of tripping over it.
