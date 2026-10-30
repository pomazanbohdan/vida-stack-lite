---
instruction_id: gate-the-whole-plan-on-one-approval
title: Gate the whole plan on one approval
summary: "The whole plan is presented once, an unambiguous affirmative is required, and the autonomous run then removes the human stepping between tasks but not the verification."
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A whole plan is about to run in one pass without a checkpoint between tasks.
conditions_does_not_apply_when: The owner already approved this plan in this conversation.
artifact_contract_output_type: approval-gate
artifact_contract_required_data:
  - the plan presented
  - the owner reply verbatim
  - the approval verdict
  - the preparatory commit of the plan
artifact_contract_verified_by: the plan ran only after an unambiguous affirmative
compatibility_excludes: []
compatibility_requires:
  - write-implementation-plan
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/build.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Gate the whole plan on one approval
Use this once a spec exists and you want to collapse plan + build into one run.
Present the full plan and wait for an unambiguous affirmative (e.g. "approve", "go", "yes").
Treat hedged responses ("looks reasonable", "I guess") as **not** approved.
This is the only human gate — after approval, run autonomously.
Note: autonomous mode is not faster *per task* — it runs the same test-driven loop — it only removes the human stepping *between* tasks.
It removes the manual stepping between tasks — **not** the verification.
Every task still earns a passing test and its own commit.
If you generated `tasks/plan.md`, commit it as a single preparatory commit now so it doesn't bleed into the first task's commit.
