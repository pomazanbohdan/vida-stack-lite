# Bun migration candidates from the declaration catalog

These are Source-bound research candidates, not approved changes. The Source syntax inventory is bound to `f4db048ab9c9e67c13ba22e62f144aafb3d3d6fa`; names and ownership need fresh verification before implementation. The later reported mainline controller SHA conversion is excluded below. The `bin`/`src` scan has the limitations stated in [README](README.md#boundaries); `not-established` is not evidence of absence.

| Priority | Current Source anchor | Candidate | Gate before change |
| --- | --- | --- | --- |
| 1 | [repair-work-state direct-entry guard](../../../bin/repair-work-state.ts) | `Bun.fileURLToPath` for the Node URL conversion at line 122 | Import remains inert; direct CLI error, exit, arguments, path decoding and platform identity match. The existing owner test is SDK-dependent and current SDK readiness remains blocked; obtain a qualified baseline and final run. |
| 2 | [qualified runtime continuation digest](../../../bin/qualified-runtime-code-continuation.ts) | `Bun.CryptoHasher` for the helper at line 57 | Preserve string and byte encoding, lowercase digest, old/current manifest bindings and recovery semantics; determine SDK and ownership reachability. |
| 3 | [historical normalization digest](../../../bin/historical-normalization-resume.ts) | `Bun.CryptoHasher` for `sha256` at line 34 | Preserve exact persisted bytes and digest and independently exercise the real recovery owner; no custody or admission change. |
| 4 | [initial Source continuation digest](../../../bin/continue-initial-source.ts) | `Bun.CryptoHasher` for `sha256` at line 66 | Establish byte parity and actual receipt/caller behavior before migration; do not alter continuation or Source-write authority. |

`Bun.deepEquals`, `Bun.spawn`, `Bun.spawnSync`, `Bun.file`, `Bun.write` and `Bun.YAML` are candidate families, not drop-in equivalences. Preserve strict comparison semantics, process-tree observation and UNKNOWN handling, protected filesystem/CAS/fsync semantics, and YAML policy. `bun:sqlite` is already used and its storage admission, transaction and recovery owners remain authoritative. Timing-safe comparisons, native delivery, SDK public compatibility and VA-reserved controller/CLEAR/coverage contours are not migration shortcuts.

The observed controller SHA helper in the `f4db` snapshot is stale relative to the coordinator's later mainline observation and is not listed as unconverted. A syntax match does not grant Source ownership or prove a migration safe.
