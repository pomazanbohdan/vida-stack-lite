# VIDA native release delivery implementation plan

> For agentic workers: use Superpowers subagent-driven development, adapted to the repository's single Git owner and the user's prohibition on new worktrees.

**Goal:** Publish one GitHub Release for the Windows x64 and Linux x64 native agent, with internet installation, updates, and a local build that can optionally install.

**Architecture:** Extend the existing standalone builder, native CI producer, release authority, and Windows installer. Add one Linux bootstrap and installer. Both platforms use a version and Source binding shared by one release operation, with separate target manifests. No consumer installation requires Bun, Node, or npm.

**Tech stack:** Pinned Bun 1.4.4, GitHub Actions, Bash, PowerShell, existing standalone manifest and installer ownership.

**Spec:** `packages/agent/docs/system-specification.md` and `packages/agent/instructions/development-lifecycle.md`, amended for the user-approved multi-target GitHub Release contract.

## Global constraints

- Root is the sole Git integrator and numeric producer. Preserve the current staged and local projection changes, SDK artifacts and all historical UNKNOWN fences.
- Do not create worktrees, a second version ledger, a background updater, or new credentials. Do not perform an unapproved live release or consumer runtime cutover.
- Require both Windows x64 and Linux x64 target outcomes for one exact version and Source before publishing a release. Preserve each target's manifest and evidence separately.
- The release gate updates the authoritative version manifest; the default increment is patch (`0.0.1`). Minor (`0.1.0`) or major (`1.0.0`) increments require an explicit user request. Both builds and release metadata must bind the same resulting version and exact Source.
- Resolve latest once per install and bind all assets to that exact release. Explicit local-binary installation must use the same platform installation owner.
- Consumer installation uses Bash and native system utilities on Linux, and built-in PowerShell and Windows facilities on Windows. Do not require jq, Python, Node, or Bun on the consumer.
- CI validates each existing JSON manifest semantically before publication. The Linux installer checks the exact asset and manifest bytes against the release checksum file; it does not claim independent JSON semantic validation.
- Release assets use target-specific names to avoid collisions: `vida-agent-bun-linux-x64`, `vida-agent-bun-linux-x64.manifest.json`, `SHA256SUMS-linux-x64` and the corresponding Windows x64 names, including `.exe` for its binary. Each checksum file contains exactly its target's binary and manifest.
- Preserve user project configuration, databases and state. Retain uncertain effects and make any replacement or rollback conditional on observed ownership and bytes.

## Review focus

- Missing, stale or mixed-version release assets must fail before replacement.
- Unsupported target, missing dependency, redirect failure, timeout or corrupted download must leave installed bytes and project data intact.
- Concurrent or uncertain installation must not be silently retried or treated as success.
- A local development artifact must not become CI provenance or Runtime acceptance evidence.
- Publication must not begin until both target artifacts are verified against the same operation, version and Source.

## Packets

- [ ] Linux internet bootstrap. Add the smallest supported Bash entry in `install/install.sh`; exercise latest resolution, missing prerequisites, malformed checksums, unrelated binaries and failed replacement in private fixtures. Add local-file installation only with a real builder verification owner.
- [ ] Windows release bootstrap. Extend `packages/agent/tooling/install-windows.ps1` and its focused tests to select a release and follow bounded GitHub redirects while retaining its existing installation owner, rollback and receipt contracts. Record native Windows verification as a GAP if unavailable locally.
- [ ] Host-native local build. Reuse `packages/agent/tooling/build-standalone.ts` through one local owner, preserve SDK outputs, and add `agent:build:local` with optional `--install` through the maintained installer for the host. Verify development output separately from delivery qualification.
- [ ] Multi-target CI formation and publication. Extend `.github/workflows/agent-native-delivery.yml`, `tooling/agent/native-ci-delivery.ts` and the existing release evidence/owner only as needed. Join exact Windows and Linux target outcomes under the existing version operation; draft and publish one GitHub Release only after both pass. Test target, version and Source mismatch refusals and run actionlint.
- [ ] Reconcile the system specification, lifecycle, installation guide and package scripts with the implemented contract. Run scoped strict/lint and meaningful tests, independently review each completed packet, and publish exact reviewed Source with normal hooks. Actual GitHub Release publication and consumer installation require their own concrete authorized operation.
