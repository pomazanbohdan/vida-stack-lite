---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-retrospective-references-acceptance-verdict-md-e07794b5-c01"
title: "bmad-method: skills/bmad-retrospective/references/acceptance-verdict.md module"
summary: "Carrier for 7 atomic instructions from bmad-method:skills/bmad-retrospective/references/acceptance-verdict.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-retrospective/references/acceptance-verdict.md\"}"
atom_ids:
  - follow-through-on-the-previous-retros-action-items
  - let-unfinished-work-force-the-rejected-verdict
  - propose-the-action-items-without-applying-them
  - re-check-a-subagent-finding-against-the-primary-source
  - render-the-acceptance-verdict-in-three-spellings
  - route-each-finding-to-an-action-and-to-a-prevention
  - source-the-reason-in-a-decision-record
atom_count: 7
atoms: "[{\"atom_id\":\"follow-through-on-the-previous-retros-action-items\",\"file_sha256\":\"2ef8f2c01d7a64fd7764519e4d69d1138c233f9ae801a315b3308f714d5f2a05\",\"content_sha256\":\"06304c176c7c4e52871e1f47c88f6715416ece934f4f9ebfcf7858f79db92df3\",\"file_bytes\":2237,\"body_bytes\":951},{\"atom_id\":\"let-unfinished-work-force-the-rejected-verdict\",\"file_sha256\":\"a7832412c76d55c8ba5a63d9999e86ac7e5c93aa55dd067a881179ff84018018\",\"content_sha256\":\"55766c0f383ba23072f5a5da801e6665a0a27c35bfe4c2ff99c4121cd54b383b\",\"file_bytes\":2551,\"body_bytes\":1164},{\"atom_id\":\"propose-the-action-items-without-applying-them\",\"file_sha256\":\"23e3b8e6a65d707f258c71d2c5ab66ffe2d83bc9e7d383683fbb286b88f59c6e\",\"content_sha256\":\"f245a172e8b3c4a0bec15fee24b73963277cbee6f8ad55d6617a50e1b6240c48\",\"file_bytes\":2782,\"body_bytes\":1205},{\"atom_id\":\"re-check-a-subagent-finding-against-the-primary-source\",\"file_sha256\":\"cfc0d9b279f42f5ae163f16b8e0c3964a61a6ec38f5547d183242965dea51b4c\",\"content_sha256\":\"b8ad5ab7b783c7997131ca61eb1457182b5aa2997efd6550d059900c94078ffa\",\"file_bytes\":1610,\"body_bytes\":335},{\"atom_id\":\"render-the-acceptance-verdict-in-three-spellings\",\"file_sha256\":\"70a537e6c08d6bef527d0898e764139da658539280e4e86ea60b123af83e9937\",\"content_sha256\":\"74cdb92e4ffa10ef483a9334e45aeba4f174eec8bdc205f7f7b98681c941bc17\",\"file_bytes\":2251,\"body_bytes\":774},{\"atom_id\":\"route-each-finding-to-an-action-and-to-a-prevention\",\"file_sha256\":\"ffc290275c54aa44e9b65ec8744b7d96de6f86e73c21748dfa4697e28e469eda\",\"content_sha256\":\"d04cc9811bd0a90958a84fe418d296c0d142b65eee946e95804daa233eda77aa\",\"file_bytes\":1965,\"body_bytes\":654},{\"atom_id\":\"source-the-reason-in-a-decision-record\",\"file_sha256\":\"563267578a85ea7b699fb111c4a7bc9613910d9f58be4d0a6b03c77251731d12\",\"content_sha256\":\"cde68b999be90dcfb4c47877d1ea2020528e7655eef6a89d0c17e607209273eb\",\"file_bytes\":2190,\"body_bytes\":796}]"
carrier_sha256: 9b812968db43a58e8dff5c346ff79baee23dd1a8002360e1dcb05850f8a351de
carrier_bytes: 16657
revision: 1
status: active
---
<!-- vpmodule:atom:begin follow-through-on-the-previous-retros-action-items -->
---
instruction_id: follow-through-on-the-previous-retros-action-items
title: "Follow through on the previous retro's action items"
summary: "The action items the previous retrospective committed to are checked one by one, and an item that cannot be pointed at is recorded as \"no evidence found\" rather than as not done."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - code-audit
conditions_applies_when: A retrospective runs and a previous retrospective exists.
conditions_does_not_apply_when: "There is no previous retrospective, or its file has no Action items section."
artifact_contract_output_type: follow-through
artifact_contract_required_data:
  - the item
  - its owner
  - whether it landed and the source that shows it
artifact_contract_verified_by: "every item of the previous retrospective is recorded with its source, and a missing file is never read as no outstanding items"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/acceptance-verdict.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Follow through on the previous retro's action items
When the previous epic's retrospective file exists, check whether the action items it committed to were completed.
Read its Action items section, and its Previous-retro follow-through section for the items recorded there as not landed, and for every item, record one line
- **The item** — its action text as the previous file spells it, and its owner.
- **Whether it landed** — with the source that shows it: the commit, the file and line, the test. An item you cannot point at is "no evidence found", not "not done" — the reader must be able to tell a checked item from an unchecked one.
No status is written anywhere; the record is the follow-through.
A run with no previous retrospective file, or one whose file has no Action items section, records that there was nothing to follow through on — and which of those it was, so a missing file is never mistaken for "no outstanding items."
<!-- vpmodule:atom:end follow-through-on-the-previous-retros-action-items -->
<!-- vpmodule:atom:begin let-unfinished-work-force-the-rejected-verdict -->
---
instruction_id: let-unfinished-work-force-the-rejected-verdict
title: Let unfinished work force the rejected verdict
summary: "Unfinished work makes the machine verdict rejected and is named as the evidence; a person may override it, but the absence of a decision is never recorded as acceptance."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The acceptance verdict is rendered and the completeness of the work is known.
conditions_does_not_apply_when: Every item of the body of work is finished.
artifact_contract_output_type: verdict-rules
artifact_contract_required_data:
  - the unfinished items
  - the machine verdict
  - the override and who made it
artifact_contract_verified_by: "unfinished items make the machine verdict rejected, and a failing epic without a human decision is recorded as not accepted"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/acceptance-verdict.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/verification-debt-tracking.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Let unfinished work force the rejected verdict
The **machine** verdict is **rejected**. Name every unfinished ticket in the Acceptance verdict section as the evidence. Do not soften this to accepted-with-open-items: unfinished delivery is not an open finding about a finished epic — the epic itself is incomplete.
Do not render a rejected or accepted verdict from the absence of data — say the check was unavailable and weigh only the criteria and findings you have.
Three hard rules:
1. A human decision always overrides the machine verdict.
2. An epic that fails its criteria with **no** human decision is recorded as **not accepted** — never as silently accepted.
3. A non-empty `pending_tickets` list makes the machine verdict **rejected**, including in headless mode.
Prevents `status: complete` when tests are still pending, blocked, or skipped without reason.
New test result type for tests blocked by external dependencies (server, physical device, release build, third-party services). Categorized separately from skipped tests.
scans ALL phases in the current milestone for outstanding items (pending, skipped, blocked, human_needed, gaps_found)
<!-- vpmodule:atom:end let-unfinished-work-force-the-rejected-verdict -->
<!-- vpmodule:atom:begin propose-the-action-items-without-applying-them -->
---
instruction_id: propose-the-action-items-without-applying-them
title: Propose the action items without applying them
summary: "The action items are written up with an owner and proposed, not applied: the fixes go back into the normal work loop and the person applies the spec reconciliation."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - code-audit
conditions_applies_when: The fix-now findings and the process lessons are turned into action items.
conditions_does_not_apply_when: The action items were already written and approved.
artifact_contract_output_type: action-items
artifact_contract_required_data:
  - what to change
  - the owner
  - the kind of action item
artifact_contract_verified_by: "every action item names a change and an owner, and nothing was applied by the run"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/acceptance-verdict.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/mvp-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/complexity-triggered-refactor.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Propose the action items without applying them
Compile fix-now findings and process lessons into specific, owned action items. Each names what to change and who owns it.
Two kinds are *proposed, not applied* in this version:
- **Remediation** — code fixes are written up as action items (or story-shaped work) for the normal dev loop to execute later. The retrospective does not run the dev loop itself.
- **Ticket reconciliation** — where the as-built diverges from the ticket, propose the reconciliation as an action item with the evidence attached. The human applies it to the ticket through `bmad-agent-po`; an uncertain interpretation is never written into a ticket automatically.

When a split leaves further units, list them as the exact commands the user can run afterwards; do not create them - the user keeps control of the numbering.
Advisory by default: the proposal is informational only, never edits code, and never blocks.
The anchor is set the first time a function is observed and moves only when the proposal is dispositioned via `refactor accept` or `refactor decline` — never when the score alone improves
naming the exact remediation, so this enforcement gap is never silent.
<!-- vpmodule:atom:end propose-the-action-items-without-applying-them -->
<!-- vpmodule:atom:begin re-check-a-subagent-finding-against-the-primary-source -->
---
instruction_id: re-check-a-subagent-finding-against-the-primary-source
title: Re-check a subagent finding against the primary source
summary: A finding that came from a subagent or from the team discussion is an unverified report; the primary source is reopened before anything is routed on it.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
  - evidence-analysis
conditions_applies_when: A finding came from a subagent or from the team discussion and an action item would rely on it.
conditions_does_not_apply_when: The finding was established from the primary source in this run.
artifact_contract_output_type: rechecked-finding
artifact_contract_required_data:
  - the primary source that was reopened
  - the outcome of the re-check
artifact_contract_verified_by: "every routed finding rests on a primary source that was reopened, and the ones that did not hold up were dropped"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/acceptance-verdict.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Re-check a subagent finding against the primary source
Findings from sub-agents or the team discussion are unverified reports, not established facts.
Before an action item relies on one, re-check it against the primary source — reopen the file, the commit, the spec.
A finding whose source does not hold up is dropped, not routed.
<!-- vpmodule:atom:end re-check-a-subagent-finding-against-the-primary-source -->
<!-- vpmodule:atom:begin render-the-acceptance-verdict-in-three-spellings -->
---
instruction_id: render-the-acceptance-verdict-in-three-spellings
title: Render the acceptance verdict in three spellings
summary: "The final state is judged against the declared criteria and rendered as accepted, accepted-with-open-items or rejected, and a verdict profiled from the diff is marked as profiled."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - code-audit
conditions_applies_when: The retrospective reaches the point where the work is judged against its criteria.
conditions_does_not_apply_when: The completeness check did not run and no verdict can be rendered from the criteria and findings alone.
artifact_contract_output_type: acceptance-verdict
artifact_contract_required_data:
  - the verdict
  - whether the criteria were declared or profiled
  - the evidence behind the call
artifact_contract_verified_by: the verdict is one of the three spellings and it says whether the criteria were declared or profiled
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/acceptance-verdict.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/workflow.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Render the acceptance verdict in three spellings
Judge the final state against the epic file's Requirements and Done when. If the epic file has neither, profile the criteria from the diff and plans and mark the verdict as **profiled** rather than declared.
Weigh verification results (the Phase 2 behavior check) and unresolved findings. Render one of:
- **Accepted** — criteria demonstrably met in the evidence, no blocking findings open, and **no unfinished tickets** for this epic.
- **Accepted-with-open-items** — criteria met, but named findings remain deferred and tracked — still only when every ticket of this epic is finished.
- **Rejected** — criteria not met, a blocking finding stands unresolved, **or any of this epic's tickets is still unfinished**.
<!-- vpmodule:atom:end render-the-acceptance-verdict-in-three-spellings -->
<!-- vpmodule:atom:begin route-each-finding-to-an-action-and-to-a-prevention -->
---
instruction_id: route-each-finding-to-an-action-and-to-a-prevention
title: Route each finding to an action and to a prevention
summary: "Every finding gets two dispositions: what happens to this instance, and what would stop the next one."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
  - code-audit
conditions_applies_when: Consolidated findings are turned into routed work.
conditions_does_not_apply_when: The findings were already routed.
artifact_contract_output_type: routed-findings
artifact_contract_required_data:
  - the disposition of this instance
  - the upstream lesson that would prevent the next one
  - the context a deferred finding carries
artifact_contract_verified_by: every finding carries both dispositions and a deferred finding carries the context it needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/acceptance-verdict.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress/steps/forensic-audit.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Route each finding to an action and to a prevention
Give every finding two independent dispositions:
- **What to do about this instance** — *fix now*, *defer*, or *accept as-is*. Fix-now findings become action items. Deferred findings carry enough context to be acted on later without re-investigation. Accepted deviations are recorded so later retros stop re-flagging them.
- **What would prevent the next one** — the upstream lesson: spec wording, story sizing, a missing convention or gate, or nothing. This is where a recurring finding becomes a process change rather than a one-off fix.
Then for each failed check, add a concrete next action:
<!-- vpmodule:atom:end route-each-finding-to-an-action-and-to-a-prevention -->
<!-- vpmodule:atom:begin source-the-reason-in-a-decision-record -->
---
instruction_id: source-the-reason-in-a-decision-record
title: Source the reason in a decision record
summary: "A decision record is proposed only for a decision that is hard to reverse, surprising without context and the result of a real trade-off, and its reason comes from the plan, the commit or the session log — or the record says that none of them gives it."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - code-audit
conditions_applies_when: A decision taken during the work is considered for a decision record.
conditions_does_not_apply_when: "The decision is easy to reverse, unsurprising, or had no real alternative."
artifact_contract_output_type: decision-record
artifact_contract_required_data:
  - the context
  - the decision
  - the why and where the why comes from
  - whether the person approved it and which file was written
artifact_contract_verified_by: "the record names the plan and the commit it came from, and it says so when no source gives the why"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/acceptance-verdict.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Source the reason in a decision record
Propose a decision
as a decision record (ADR) when it is hard to reverse, surprising without context, and the result of a real trade-off
A record is one file:
its name and title stating the decision
its body one paragraph (context, decision, why) naming the plan and the commit
the why comes from the plan, the commit or a session log, and when none gives it the record says so, since a reason the retrospective supplies is later read as the team's.
It goes beside the code it governs, or in the repository's decisions folder (else `docs/decisions/`) when it is system-wide.
Ask the user about each in interactive runs and write only the approved ones; a headless run only proposes; committing them is the user's concern.
Planning documents are not ADRs.
<!-- vpmodule:atom:end source-the-reason-in-a-decision-record -->