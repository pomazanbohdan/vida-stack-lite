# Envelopes fractional ordering lineage review

Review lane: `/root/envelopes_fraction_review_v334` (bounded, read-only Source review).

Reviewed `packages/agent/src/contracts/envelopes.ts` at SHA-256
`39683ab3d97ee23fbf16e04cc6f3a9512197b353e3dd24707cb836814eca0cec`.
The predecessor Source binding in
`.agent/work/core-runtime-reactivation/crap-budgets.reviewed-partial.v1.json#scope_review_main_envelopes_release_ticket_identity_20261017`
is `6b959082fe88b709ffcdb6e403f279ab33ca57425cd8afee14efb7a7c343679d`.

The bounded Source change removes `.slice(3)`, renames the private fraction
field to `leaseFraction`, and types the active-claims map as the shared ordering
value intersected with its claim and resource-key fields. The comparator,
its tie-break sequence, and callable declarations remain in place. For accepted
timestamps, the validator permits at most nine fractional digits and pads to
nine. If parsed epoch milliseconds tie, the first three fractional digits tie
as well: supported numeric offsets have minute precision, and accepted leap
second normalization preserves fractional digits. The new nine-digit integer
therefore adds the same first-three-digit component to both compared values;
their ordering is the same as the prior six-digit suffix. Equal fractions still
reach the unchanged lexical wire tie-break. I found no counterexample.

The existing 79-row inventory at
`/workspace/attachments/envelopes-release-binding-inventory-v270.json` embeds
the predecessor Source binding and includes
`src/contracts/envelopes.ts#fn:compareClaimLeaseExpiry#0` at complexity 4.
The current release-ticket review row preserves 76 retained original roles,
six removals, three added roles, all original ceilings, and all existing added
ceilings. The comparator remains its separately planned 4/4 role; the release
identity predicate remains its separate 4/4 role. This change adds, removes, or
transfers no callable role or cap. The current Source hash is the proposed new
binding; this review does not modify the reviewed row or establish numeric
admission.

The row cites `/workspace/attachments/quality-envelope-validated-rows-actual-lineage-20261016.md`,
which is absent from this workspace. The 79-row inventory, release identity
review, and current row remain available and support the findings above; the
missing cited attachment remains a lineage-record gap.

This review does not waive the surviving mutant, classify mutation results,
or establish coverage, CRAP, mutation, or contour closure.

Route: the accepted collaboration dispatch requested native `gpt-6-luna` with
high reasoning effort. No quota or fallback error was returned. Runtime model
subtype metadata was not independently exposed to this reviewer, so this
artifact records the requested native route without making a separate runtime
identity claim.

## Follow-up: appended scope-row check

The canonical `scope_review_main_envelopes_fraction_reuse_20261018` row binds
the same Source path to SHA-256
`39683ab3d97ee23fbf16e04cc6f3a9512197b353e3dd24707cb836814eca0cec`, matching
the current Source digest. The row contains one current Source binding with one
unique digest. Its 79-role correspondence, 76 retained roles, six removals,
three added roles, and preservation of all original and existing added caps
match the inspected predecessor review; it separately retains comparator 4/4
and release-identity 4/4. The predecessor release-ticket row still carries its
old Source digest and prior 79-role disposition. The earlier named-ordering
row remains its 78-role historical stage. No conflicting rewrite appears in
these inspected predecessor rows; this bounded read does not establish a
repository-wide byte comparison of every older JSON row.

The copied project artifact at
`.agent/work/core-runtime-reactivation/ENVELOPES-FRACTION-LINEAGE-REVIEW-20261018.md`
is byte-identical to this artifact (`cmp` passed). The cited older
`/workspace/attachments/quality-envelope-validated-rows-actual-lineage-20261016.md`
remains absent and is still a lineage-record GAP. These checks do not establish
numeric admission or waive the surviving mutant.
