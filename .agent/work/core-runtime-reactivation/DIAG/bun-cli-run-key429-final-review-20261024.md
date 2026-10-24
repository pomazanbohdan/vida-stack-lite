# Key429 independent review evidence

The read-only native Luna final diff review examined only
`packages/agent/tests/run-entrypoint.test.ts`. It found no must-fix issues. In
particular, the Unix socket exists under `vida-agent/bin` before
`forwardUpdateAuthority` runs, the exact `Installed bundle node is unsafe.`
refusal is asserted, socket/root/bin/launcher metadata are checked, and the
server/socket are cleaned on both normal and failure paths.

A separate read-only review examined the current source, `TESTING.md`, and the
bound Key428 report for three candidate objective skips. The report entries are
branch IDs 55/58/59 at `packages/agent/bin/run.ts:534`, `:550`, and `:556`, with
raw counts `[0,29]`, `[0,1706]`, and `[0,1]`. Their false arms are entailed away
by preceding exact-record/field checks, prepared-relative-path validation, and
preserved-output record validation, respectively. The reviewer found no
supported-flow counterexample. These remain candidates until recorded against
the final Key429 report and its Source/test/config identity; this review does
not change counters or numeric qualification.

The current TESTING policy is `packages/agent/TESTING.md:2024-2045`: each
disposition must bind report/run, Source/test/config identity, exact counter,
causal prerequisite, independent review, and remaining qualification while
preserving raw totals and `BLOCKED`.

The subsequent terminal report `3221d342-355d-4b74-8690-0b1193d4fc09` was
read-only checked against the same source. It retains branch IDs 55/58/59 at
the exact locations with raw values `[0,33]`, `[0,1709]`, and `[0,1]`.
Source/test fingerprints are `5bbb206bc29554d3a5daaf2ea8fd429ec5d2ded020daf869ee8527e8352d2851`
and `677682572530c224be2c7efab1734fffb9ad45b2c00471f125fac3ef3b8507ec`;
the report manifest digest is
`17df753d8d778b11e59c1dc3e4822b93e6e28e3fec8a54fbea71f8d4ec92d726`.
The producer's terminal receipt binds this report to source commit
`c33425384c0a7593ef4f8302140b88ea7a49e16c`, source tree
`961713ff2dc1dfea2671b40e0f922b8cccfb633e`, and execution-image manifest
`d787367d42e82f9e3ebce5cc3410ec2c053becb7a7e416f023f15169e254b5f5`.

## Key429 next-packet review

The read-only source review confirmed all three next zero branches are
reachable: the repair default argument selects installed-bundle validation;
an evidence entry with a failed status passes the required-kind array guard
and reaches the per-entry refusal; an extra parent-selector field reaches its
exact-field refusal when the fixture rebinds the dependent repair records. The
final test-diff review confirmed the target assertions and hash bindings. It
initially found that the extra field was added after
`parentDecision.selector_intent_sha256` had been computed; the fixture was
corrected to add the field to `parentIntent` before computing that digest, and
all downstream hashes are rebuilt. Final review found no remaining must-fix.
