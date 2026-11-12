---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-deprecation-and-migration-skill-md-5da169bc-c01"
title: "addy-skills: skills/deprecation-and-migration/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/deprecation-and-migration/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/deprecation-and-migration/SKILL.md\"}"
atom_ids:
  - adapt-the-old-interface-to-the-new-implementation
  - announce-the-deprecation-with-a-migration-guide
  - decide-whether-to-deprecate
  - default-to-advisory-deprecation
  - design-for-removability
  - give-zombie-code-an-owner-or-a-removal
  - migrate-a-schema-in-phases
  - migrate-consumers-one-at-a-time
atom_count: 8
atoms: "[{\"atom_id\":\"adapt-the-old-interface-to-the-new-implementation\",\"file_sha256\":\"f21937e822974cd3f2745a0b2b0ee01c6f920510e9663681ed84031b7d248815\",\"content_sha256\":\"aefddc24a068947be0b8c5d153d1c3dacbe11498bf049c2f0d452f0b4c23b06a\",\"file_bytes\":1445,\"body_bytes\":213},{\"atom_id\":\"announce-the-deprecation-with-a-migration-guide\",\"file_sha256\":\"41e5759a41819df0c263c989a070ab64497f8426778fcca1726ba4c9a5de9ce2\",\"content_sha256\":\"f724c05d2069c8175f2088d5ce3aa2c7e5093f52a8f6af3dc480f448135a4402\",\"file_bytes\":2136,\"body_bytes\":844},{\"atom_id\":\"decide-whether-to-deprecate\",\"file_sha256\":\"9f9787009d00441b4159a0edf94cacb00ef7680c74de2f1688e28f9bf727e613\",\"content_sha256\":\"b76bbd95d750f052555a1debade2cdd2d1ea0011be2345d48bb050f332691be6\",\"file_bytes\":2178,\"body_bytes\":1033},{\"atom_id\":\"default-to-advisory-deprecation\",\"file_sha256\":\"3de75c77ad0b2d3fa91dce37b18765dde302f3f58ef2e0ed65e61f22edb15322\",\"content_sha256\":\"1eb64990fdd181639294f508cabf493d72fc341ff29fc45a1b86cc0bd4126365\",\"file_bytes\":2238,\"body_bytes\":1084},{\"atom_id\":\"design-for-removability\",\"file_sha256\":\"b611f1b09130a8d1258470c58a534a3680230d088345994f8d7137c9a0d80cad\",\"content_sha256\":\"db52aadbfc43eedde6cb9b988521153becfe5f646511de70e6113550ca5f5058\",\"file_bytes\":1388,\"body_bytes\":310},{\"atom_id\":\"give-zombie-code-an-owner-or-a-removal\",\"file_sha256\":\"be715711b9b1dc5842a8fef6083378237f976baf1dd22236f80ea4415d56b119\",\"content_sha256\":\"50fcccb29065eac2cf45ead616edcbf6f98bf06d01083270c5a3c40a77d8ec1c\",\"file_bytes\":1779,\"body_bytes\":660},{\"atom_id\":\"migrate-a-schema-in-phases\",\"file_sha256\":\"70d3d4447dbb654cd1387a0ca9050e948049896c3436a70db5e6e100d7949bef\",\"content_sha256\":\"b9ec43643571b45877f9349b801d7a89ae27da5a2610f85e4592136351d95945\",\"file_bytes\":3473,\"body_bytes\":2305},{\"atom_id\":\"migrate-consumers-one-at-a-time\",\"file_sha256\":\"ed06cbaedba421f4bdc8ca19adfa54e8a0ff3442cbb639ff1b071923bd51e5be\",\"content_sha256\":\"80f7313c54252423bac0f4d2fac6509dedfd0b1312168d3acb6d4f1e3a0414d9\",\"file_bytes\":1971,\"body_bytes\":833}]"
carrier_sha256: ca1f9cdbd4db0846a7d94c676787ddcef633d7cd085636ae3bd170b89f902348
carrier_bytes: 17615
revision: 1
status: active
---
<!-- vpmodule:atom:begin adapt-the-old-interface-to-the-new-implementation -->
---
instruction_id: adapt-the-old-interface-to-the-new-implementation
title: Adapt the old interface to the new implementation
summary: "Translate calls from the old interface to the new implementation behind an adapter, so consumers change one at a time."
capability_tags:
  - migrate-consumers-off-the-old-system
pattern_tags:
  - incremental-cutover
  - migration-strategy
conditions_applies_when: "The old interface cannot change yet, but its implementation is being replaced."
conditions_does_not_apply_when: Every consumer can be migrated in the same wave.
artifact_contract_output_type: adapter
artifact_contract_required_data:
  - the old interface
  - the new implementation
  - the translation
  - "\"the condition that ends the adapter's life\""
artifact_contract_verified_by: the adapter is removed once the last consumer has migrated
compatibility_excludes:
  - migrate-callers-and-delete-legacy
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Adapt the old interface to the new implementation

Create an adapter that translates calls from the old interface to the new implementation. Consumers keep using the old interface while you migrate the backend.
<!-- vpmodule:atom:end adapt-the-old-interface-to-the-new-implementation -->
<!-- vpmodule:atom:begin announce-the-deprecation-with-a-migration-guide -->
---
instruction_id: announce-the-deprecation-with-a-migration-guide
title: Announce the deprecation with a migration guide
summary: "The notice states the status, the replacement, the removal date, the reason, and the concrete steps a consumer follows to move."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A deprecation is announced to the consumers of the old system.
conditions_does_not_apply_when: The deprecation is internal and has no consumers to migrate.
artifact_contract_output_type: deprecation-notice
artifact_contract_required_data:
  - status
  - replacement
  - removal date
  - reason
  - migration steps
artifact_contract_verified_by: the notice names the replacement and a consumer can follow the steps without asking
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/deprecation-and-migration/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/interface-versioning-policy.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Announce the deprecation with a migration guide

```markdown
## Deprecation Notice: OldService

**Status:** Deprecated as of 2025-03-01
**Replacement:** NewService (see migration guide below)
**Removal date:** Advisory — no hard deadline yet
**Reason:** OldService requires manual scaling and lacks observability.
            NewService handles both automatically.

### Migration Guide
1. Replace `import { client } from 'old-service'` with `import { client } from 'new-service'`
2. Update configuration (see examples below)
3. Run the migration verification script: `npx migrate-check`
```

**Red Flags**

- Deprecation announcements with no migration tooling or documentation
- The reference docs mark it deprecated with the successor + the removal version.
- The negotiation emits a `warnings` entry when a host uses a deprecated value.
<!-- vpmodule:atom:end announce-the-deprecation-with-a-migration-guide -->
<!-- vpmodule:atom:begin decide-whether-to-deprecate -->
---
instruction_id: decide-whether-to-deprecate
title: Decide whether to deprecate
summary: "Answer the five questions before removing anything: unique value, consumers, replacement, migration cost, and the cost of not deprecating."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: "A system, API, library or feature is a candidate for removal."
conditions_does_not_apply_when: The removal was already decided and the work is the migration.
artifact_contract_output_type: deprecation-decision
artifact_contract_required_data:
  - unique value
  - number of consumers
  - replacement
  - migration cost per consumer
  - maintenance cost of not deprecating
artifact_contract_verified_by: all five questions are answered in writing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Decide whether to deprecate

Before deprecating anything, answer these questions:

```
1. Does this system still provide unique value?
   → If yes, maintain it. If no, proceed.

2. How many users/consumers depend on it?
   → Quantify the migration scope.

3. Does a replacement exist?
   → If no, build the replacement first. Don't deprecate without an alternative.

4. What's the migration cost for each consumer?
   → If trivially automated, do it. If manual and high-effort, weigh against maintenance cost.

5. What's the ongoing maintenance cost of NOT deprecating?
   → Security risk, engineer time, opportunity cost of complexity.
```

### Code Is a Liability

Every line of code has ongoing cost: it needs tests, documentation, security patches, dependency updates, and mental overhead for anyone working nearby. The value of code is the functionality it provides, not the code itself. When the same functionality can be provided with less code, less complexity, or better abstractions — the old code should go.
<!-- vpmodule:atom:end decide-whether-to-deprecate -->
<!-- vpmodule:atom:begin default-to-advisory-deprecation -->
---
instruction_id: default-to-advisory-deprecation
title: Default to advisory deprecation
summary: "Warn and document by default; force a deadline only when the risk justifies it, and then ship the tooling to move."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: The kind of deprecation is being chosen.
conditions_does_not_apply_when: The deprecation is compulsory because of a legal or security deadline that is already fixed.
artifact_contract_output_type: deprecation-kind
artifact_contract_required_data:
  - advisory or compulsory
  - the reason for the choice
  - the migration tooling and support for a compulsory deprecation
artifact_contract_verified_by: "a compulsory deprecation ships migration tooling, documentation and support"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Default to advisory deprecation

| Type | When to Use | Mechanism |
|------|-------------|-----------|
| **Advisory** | Migration is optional, old system is stable | Warnings, documentation, nudges. Users migrate on their own timeline. |
| **Compulsory** | Old system has security issues, blocks progress, or maintenance cost is unsustainable | Hard deadline. Old system will be removed by date X. Provide migration tooling. |

**Default to advisory.** Use compulsory only when the maintenance cost or risk justifies forcing migration. Compulsory deprecation requires providing migration tooling, documentation, and support — you can't just announce a deadline.

### Hyrum's Law Makes Removal Hard

With enough users, every observable behavior becomes depended on — including bugs, timing quirks, and undocumented side effects. This is why deprecation requires active migration, not just announcement. Users can't "just switch" when they depend on behaviors the replacement doesn't replicate.

**Red Flags**

- "Soft" deprecation that's been advisory for years with no progress
<!-- vpmodule:atom:end default-to-advisory-deprecation -->
<!-- vpmodule:atom:begin design-for-removability -->
---
instruction_id: design-for-removability
title: Design for removability
summary: "When you build something new, ask how it will be removed in three years; clean interfaces and a small surface make deprecation possible."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "You are designing a new system, interface or module."
conditions_does_not_apply_when: The change is mechanical and the shape is already fixed.
artifact_contract_output_type: removal-plan
artifact_contract_required_data:
  - the answer to how the thing would be removed in three years
  - the interfaces and flags that make it possible
artifact_contract_verified_by: the design records how it would be removed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Design for removability

### Deprecation Planning Starts at Design Time

When building something new, ask: "How would we remove this in 3 years?" Systems designed with clean interfaces, feature flags, and minimal surface area are easier to deprecate than systems that leak implementation details everywhere.
<!-- vpmodule:atom:end design-for-removability -->
<!-- vpmodule:atom:begin give-zombie-code-an-owner-or-a-removal -->
---
instruction_id: give-zombie-code-an-owner-or-a-removal
title: Give zombie code an owner or a removal
summary: "Code nobody owns but everybody depends on either gets an owner and maintenance, or a deprecation with a concrete migration plan."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - technical-debt
conditions_applies_when: A piece of code has active consumers but no owner.
conditions_does_not_apply_when: The code has an owner and is maintained.
artifact_contract_output_type: zombie-code-decision
artifact_contract_required_data:
  - the signs that the code is unowned
  - the assigned owner or the migration plan
artifact_contract_verified_by: "the code has an owner or a dated migration plan, and is in neither limbo nor both"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Give zombie code an owner or a removal

Zombie code is code that nobody owns but everybody depends on. It's not actively maintained, has no clear owner, and accumulates security vulnerabilities and compatibility issues. Signs:

- No commits in 6+ months but active consumers exist
- No assigned maintainer or team
- Failing tests that nobody fixes
- Dependencies with known vulnerabilities that nobody updates
- Documentation that references systems that no longer exist

**Response:** Either assign an owner and maintain it properly, or deprecate it with a concrete migration plan. Zombie code cannot stay in limbo — it either gets investment or removal.
<!-- vpmodule:atom:end give-zombie-code-an-owner-or-a-removal -->
<!-- vpmodule:atom:begin migrate-a-schema-in-phases -->
---
instruction_id: migrate-a-schema-in-phases
title: Migrate a schema in reversible phases
summary: "Never change a column in place: add it, dual-write, backfill, switch reads, and drop the old shape in a later, separate deploy."
capability_tags:
  - migrate-a-data-schema
pattern_tags:
  - expand-contract
conditions_applies_when: A production data schema changes and old and new code will run at once.
conditions_does_not_apply_when: The change is additive only and nothing reads the old shape.
artifact_contract_output_type: schema-migration
artifact_contract_required_data:
  - the phases
  - the dual-write or backfill step
  - the tested down path
  - the deploy that carries the destructive step
artifact_contract_verified_by: old and new code are both valid against the schema at every deploy step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Migrate a schema in reversible phases

A schema change is the riskiest migration because the data is the one thing you cannot roll back by reverting a deploy. The failure mode is coupling the schema change to the code change: rename a column in the same release that starts using the new name, and during the rollout window — when old and new code run at once — one of them is querying a column that doesn't exist. The fix is to **never change a column in place**. Migrate in additive phases so old and new code are both valid at every step.

```
EXPAND ──────────────→ MIGRATE ──────────────→ CONTRACT
add the new column,    backfill existing rows,  once no code reads the
nullable, alongside    dual-write old+new from  old column, drop it in
the old one            the app                  a later, separate deploy
```

**Worked example — renaming `name` to `full_name`:**

1. **Expand.** Add `full_name` as nullable. Deploy. (Old code ignores it; nothing breaks.)
2. **Dual-write.** App writes both `name` and `full_name` on every insert/update. Deploy.
3. **Backfill.** Copy `name → full_name` for existing rows, in batches, so you don't lock the table.
4. **Switch reads.** Point the app at `full_name`, keep writing both. Deploy and bake.
5. **Contract.** Stop writing `name`, then — in a *separate, later* deploy — drop the column.

Each step is independently deployable and reversible: if step 4 misbehaves, roll the code back and `full_name` is still being populated. Treat each phase as a thin vertical slice.

**Rules:**
- **Additive first, destructive last and alone.** Adds (new nullable column, new table, new index) are safe in any deploy; drops and renames get their own deploy *after* no code references the old shape.
- **Every migration has a tested down path.** A migration you can't reverse is a deploy you can't roll back. Write and run the `down` before merging.
- **Backfill in batches, off the hot path.** A single `UPDATE` over millions of rows locks the table; chunk it and throttle.
- **Build large indexes without blocking writes** (e.g. Postgres `CREATE INDEX CONCURRENTLY`).
- **Decouple from code by feature flag** when the cutover is risky, exactly as in the Feature Flag Migration pattern above.
<!-- vpmodule:atom:end migrate-a-schema-in-phases -->
<!-- vpmodule:atom:begin migrate-consumers-one-at-a-time -->
---
instruction_id: migrate-consumers-one-at-a-time
title: Migrate consumers one at a time
summary: "Move consumers incrementally, and if you own the infrastructure you are deprecating, you migrate the users yourself."
capability_tags:
  - migrate-consumers-off-the-old-system
pattern_tags:
  - incremental-cutover
conditions_applies_when: Consumers still use a system that has a replacement.
conditions_does_not_apply_when: The system has no consumers.
artifact_contract_output_type: consumer-migration
artifact_contract_required_data:
  - the consumers and their touchpoints
  - the per-consumer migration steps
  - the behaviour verification
  - the cutover mechanism
artifact_contract_verified_by: each migrated consumer is verified and the old system reached zero traffic
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Migrate consumers one at a time

Migrate consumers one at a time, not all at once. For each consumer:

```
1. Identify all touchpoints with the deprecated system
2. Update to use the replacement
3. Verify behavior matches (tests, integration checks)
4. Remove references to the old system
5. Confirm no regressions
```

**The Churn Rule:** If you own the infrastructure being deprecated, you are responsible for migrating your users — or providing backward-compatible updates that require no migration. Don't announce deprecation and leave users to figure it out.

### Strangler Pattern

Run old and new systems in parallel. Route traffic incrementally from old to new. When the old system handles 0% of traffic, remove it.

### Feature Flag Migration

Use feature flags to switch consumers from old to new system one at a time:
<!-- vpmodule:atom:end migrate-consumers-one-at-a-time -->