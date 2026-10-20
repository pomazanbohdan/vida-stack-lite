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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 1
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
