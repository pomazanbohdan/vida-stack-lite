# Existing storage admission frozen lineage review v354

## Verdict

The current Source can retain the reviewed set of 18 callable roles and each prospective 10/10 ceiling after Root binds the current file at the supplied digest. The old `b549951` Source has no file at this path, so these are new roles relative to that baseline; no historical allowance is available to transfer. The selected partial owner already records 18 new rows, zero retained rows, zero removals, no identity reuses, and the prospective 10/10 ceilings.

## Correspondence

I compared the supplied frozen Source with the current file. The named top-level helpers and the nested functions/methods retain their callable ownership and nesting. The outer `withExistingStorageMergeCapability` remains the owner of its fence verifier, store verifier, exclusive-owner callbacks and capability methods. The three separately recorded nested roles (`checkpointSource`, the close callback, and the fence-verification close callback) remain present in that same source structure. The diff adds no callable, removes no callable, and does not move an allowance between roles.

The implementation changes are confined to existing owners. `closedImage` rechecks link count after reading. `fenceBindingMatches` now compares the actual binding digest with a digest computed from a frozen canonical image. `withExistingStorageMergeCapability` snapshots the request and canonicalizes/freezes the expected fence binding before asynchronous work. The callback no longer repeats `gate.assertActive()` immediately before the exclusive owner's callback, and the capability path no longer repeats `assertActive()` immediately before `assertSourcesUnchanged()`; that method begins with the same activity check. These edits preserve the existing role boundaries and fit within the retained 10/10 ceilings.

The only Source binding in the selected partial scope is the frozen digest `324ba3d8…6053dd1`; the current digest supplied for Root's binding is `4f2b17db…9db5f103`. The digest change requires the selected scope's Source binding to be updated. It does not itself require new, removed or reused role dispositions. The earlier `824c6df` digest reuse is not treated as proof for the current bytes.

## Limits

This is a bounded source-lineage review, not numeric qualification or global acceptance. I read only the named budget section and the two assigned Source files. I did not run a function inventory, scan the full budget JSON, calculate hashes, run tests or launch numeric producers. The supplied digests are treated as Root-provided bindings; I did not independently verify them. Root retains responsibility for updating and pinning the current binding, exact inventory checks, and numeric evidence.

## Current shared-close binding review v446

Blind Luna independently compared the immutable1d3f135 Source above with the
shared-close Source published as073b770. Root's existing single-file digest is
`0e9b25ad47ba71dd40d8c08b1bf03a19d5f1c8d9a3fe0926349783efb15c4ed0`;
the prior digest remains `4f2b17dbd2f34b77e538e23307becc5ee798dd3358d188bd978dbf6e9db5f103`.
The review confirms the same18prospective10/10 roles, zero additions/removals,
no identity reuse and no allowance transfer. `verifyCurrentFence.bind` adapts
the existing verifier without adding a Source-defined callable. The shared
`withWorkspaceDatabaseClose` preserves verify-before-close, paired close custody,
sole values including undefined, and ordered simultaneous causes with the same
aggregate message. Subsequent client drain, checkpoints, identity checks and
capability lifetime remain unchanged.

The independent bounded note is retained at
`/workspace/attachments/storage-frozen-shared-close-review-v446.md`. It generated
no numeric proof, AST inventory or hash. Root's fresh existing coverage run
`0f43bb36-f4ee-45ca-87b7-6a36cb12fbec` observes18functions and measured maxCC/CRAP4/4;
the frozen owner must still validate the exact current roles and unchanged
ceilings against a published, registered review pin. No historical evidence is
re-attested by this binding update.
