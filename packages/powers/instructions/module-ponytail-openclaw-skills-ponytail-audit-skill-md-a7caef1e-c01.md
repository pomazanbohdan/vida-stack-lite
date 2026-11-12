---
schema: VPInstructionModule/v1
instruction_id: "module-ponytail-openclaw-skills-ponytail-audit-skill-md-a7caef1e-c01"
title: "ponytail: .openclaw/skills/ponytail-audit/SKILL.md module"
summary: "Carrier for 8 atomic instructions from ponytail:.openclaw/skills/ponytail-audit/SKILL.md."
source: "{\"donor\":\"ponytail\",\"path\":\".openclaw/skills/ponytail-audit/SKILL.md\"}"
atom_ids:
  - check-requested-feature-usage
  - classify-and-state-review-verdict
  - establish-review-scope
  - format-quality-findings
  - inspect-data-integrity
  - inspect-edge-case-classes
  - inspect-scalability-hazards
  - require-concrete-failure-case
atom_count: 8
atoms: "[{\"atom_id\":\"check-requested-feature-usage\",\"file_sha256\":\"ef60c2a41925c1a2ab7bf9d9d1d1c2ad20b33cb8cbdee2a7c3c36e1cc528a7f1\",\"content_sha256\":\"1f39fdc99c857069e87245b78ed993a76315bdc96bf19f24712b0092e56da64d\",\"file_bytes\":2758,\"body_bytes\":974},{\"atom_id\":\"classify-and-state-review-verdict\",\"file_sha256\":\"ee2add7a78b9f12c26eee5b8b3eb2d5020b65f41ffaf44ee3b7eabc9e87d72b9\",\"content_sha256\":\"4c458ed19e4c6cbf707fc4b3cf91246af75b7917c6f5e08253389c879fa6ad07\",\"file_bytes\":2444,\"body_bytes\":833},{\"atom_id\":\"establish-review-scope\",\"file_sha256\":\"3f962ea14bac7ef870c84f72e0bec2f6b73c41579de10a0e92e7a1ea2a3bed2c\",\"content_sha256\":\"70de8730ef50c4f32f14f4944dcdf16b858e747ab712e6b8c99e53b761c5531d\",\"file_bytes\":3031,\"body_bytes\":1267},{\"atom_id\":\"format-quality-findings\",\"file_sha256\":\"e6eb484b13499b6ecccd0fcee3a1a59de2ffceca0ced10ff89d2c4e5db1af08f\",\"content_sha256\":\"d5af28a69429ba9fda48ce49199182a761315599622b7bddbfe0646baefa10ad\",\"file_bytes\":2762,\"body_bytes\":965},{\"atom_id\":\"inspect-data-integrity\",\"file_sha256\":\"a292f5c8d05111fd29d9a4736db0665460a432e86d6d0f4cf78dca31d12e4d34\",\"content_sha256\":\"b428ecd1b1698ec2515202f3ed9d056551de0fce7630a1c702438cefb00fe192\",\"file_bytes\":1862,\"body_bytes\":260},{\"atom_id\":\"inspect-edge-case-classes\",\"file_sha256\":\"d30fb71e735e1cd566b12c51dd9c8410bdc901732ffbf078f9d01f2d5b7378f1\",\"content_sha256\":\"2ea4bd161159004c0cc996bef2b249e7060996d8509443d0d298c06ecfc51586\",\"file_bytes\":2116,\"body_bytes\":477},{\"atom_id\":\"inspect-scalability-hazards\",\"file_sha256\":\"b246ff680d8953b3c26960477af20402120df1c90c87a349afad88449ef8196a\",\"content_sha256\":\"a4f5867628646420986f00b92cffc4196c3a905373bf8a5bfcc381b1ff0a3677\",\"file_bytes\":1985,\"body_bytes\":315},{\"atom_id\":\"require-concrete-failure-case\",\"file_sha256\":\"298a9b66a312725b1eb5f71d6870915167a83d085738e0ee67b57c2e9b47eb58\",\"content_sha256\":\"35a2d152017db2ed7823baa0e645ca6268b7d2bdf091ad4cc69eac2a530a03fa\",\"file_bytes\":3164,\"body_bytes\":1234}]"
carrier_sha256: 991aae7222263f6ce89f84fb1ed4f17f86a9c81a8c248ebf9967f15f01d0612c
carrier_bytes: 21005
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-requested-feature-usage -->
---
instruction_id: check-requested-feature-usage
title: Check that a proposed feature is actually needed
summary: "Verify before implementing: find the actual usage of the proposed feature, and remove it if nothing calls it."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A reviewer or a request proposes implementing a feature properly.
conditions_does_not_apply_when: The feature already has confirmed callers in the code.
artifact_contract_output_type: usage-check
artifact_contract_required_data:
  - feature
  - call sites
  - decision
artifact_contract_verified_by: code search finds the actual callers
compatibility_excludes: []
compatibility_requires:
  - minimize-code-surface
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/receiving-code-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Check that a proposed feature is actually needed
Verify before implementing.
Ask before assuming.
If a reviewer suggests implementing something properly, search the codebase for actual usage.
If it is unused, say the code is not called and ask whether to remove it.
If it is used, then implement it properly.
If we do not need this feature, do not add it.
If the suggestion seems wrong, push back with technical reasoning.
Does it need to exist?
Before calling code unused, search the whole tree for it, including tests, fixtures, config, and string or dynamic references.
Delete dead code, unused options, speculative features.
Reuse the helper the repo already has, and name the path.
Use the standard library or the platform feature instead of a new dependency.
Drop the abstraction with one implementation and the config nobody sets.
Propose the smallest fix that works.
Prefer fixes that delete code.
Never add layers, frameworks or config the problem does not need.
<!-- vpmodule:atom:end check-requested-feature-usage -->
<!-- vpmodule:atom:begin classify-and-state-review-verdict -->
---
instruction_id: classify-and-state-review-verdict
title: Classify the findings and state a clear verdict
summary: "Classify findings by actual severity, state one clear ready-to-merge verdict, and decide the next action."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review has collected findings and needs a verdict.
conditions_does_not_apply_when: The review is not finished.
artifact_contract_output_type: review-verdict
artifact_contract_required_data:
  - findings
  - severity
  - strengths
  - verdict
artifact_contract_verified_by: the verdict follows the finding severity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/requesting-code-review/code-reviewer.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 8
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Classify the findings and state a clear verdict
Categorize issues by actual severity. Not everything is critical.
Acknowledge what was done well before listing issues.
List every behavior you considered and set aside as outside the plan or spec, one line each, with the reason.
An empty list means you set nothing aside.
Explain why each issue matters.
Give a clear verdict.
Do not say `looks good` without checking.
Do not mark nitpicks as critical.
Do not give feedback on code you did not actually read.
**Ready to merge?** [Yes | No | With fixes]
Nothing found: say looks good and ship, with one line on what you checked.
A one- or two-sentence technical assessment supports the verdict.
When lean findings exist, name the lines and dependencies that could be removed.
Not checked: the parts you did not read or could not run.
<!-- vpmodule:atom:end classify-and-state-review-verdict -->
<!-- vpmodule:atom:begin establish-review-scope -->
---
instruction_id: establish-review-scope
title: "Understand first: fix the scope and trace the main flows"
summary: "Review what the user names, read the code the change touches, and trace the main flows from input to stored result."
capability_tags:
  - review-code
  - audit-codebase
pattern_tags:
  - code-review
  - code-audit
conditions_applies_when: A change or a whole repository is being reviewed and the material to read is not yet fixed.
conditions_does_not_apply_when: The review scope is already named and its material is fully read.
artifact_contract_output_type: review-scope-map
artifact_contract_required_data:
  - review target
  - sources read
  - main flows
  - parts not read
artifact_contract_verified_by: every named flow is traced from input to stored result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Understand first: fix the scope and trace the main flows
Review a change like the senior developer who will be paged when it breaks.
Audit the whole repo like the senior developer who just inherited it and will be paged when it breaks.
Review what the user names: uncommitted or staged changes, a branch, a PR link, or files.
Nothing named: the uncommitted changes, or the last commit if there are none.
Audit what the user names: a folder, a package, or the whole repo.
Nothing named: the whole repo.
Read the diff, then the code it touches: callers of every changed function, the functions it calls, the tests, the README.
Read the README, the deploy and build config, the dependency list, the entry points (main, routes, handlers, jobs, CLI commands) and the tests.
Trace the real flow: where data comes in, what is stored, what goes out.
Trace the main flows end to end: where data comes in, what is stored, what goes out.
Read those paths fully: input from users, money, auth, data writes, background jobs, anything shared between processes.
A change can break code it does not touch.
When a signature, return value or behavior changes, search every caller.
Big repo: go deep where a mistake costs the most, not file by file.
Say which parts you did not read.
<!-- vpmodule:atom:end establish-review-scope -->
<!-- vpmodule:atom:begin format-quality-findings -->
---
instruction_id: format-quality-findings
title: Present findings by impact in a fixed shape
summary: "Order findings correct, safe, holds under load, tested, fast, lean, group them by severity, and give each one a location and all four parts."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
  - finding-severity-policy
  - finding-presentation-policy
conditions_applies_when: You present findings from a review or an audit.
conditions_does_not_apply_when: There are no findings.
artifact_contract_output_type: ranked-findings
artifact_contract_required_data:
  - finding groups
  - numbers
  - title with location
  - four parts
  - count left out
artifact_contract_verified_by: "every finding has a location and all four parts, ordered by impact"
compatibility_excludes:
  - report-the-review-in-one-canonical-finding-shape
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 8
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Present findings by impact in a fixed shape
Order of importance: correct, safe, holds under load, tested, fast, lean.
Lean still matters: every extra line must be read, tested and fixed later.
Then the findings in three groups, most important first, skip empty groups.
Critical: bug, security, data loss, breaks at the expected load.
Important: risky code without a test, real slowness, duplication, a function that mixes jobs, code that should not exist.
Minor: small speed-ups, shorter forms.
Number findings across all groups, so the user can say "fix 2 and 5".
At most 20 findings; if you left smaller ones out, say how many.
Every finding has all four parts.
Each part is one or two short sentences.
Every finding has a bold title with its file and lines.
What this is: what the code is and what it does.
Problem: the input or situation that leads to a wrong result.
Fix: the smallest fix that works.
If we skip it: what goes wrong when the finding is left.
<!-- vpmodule:atom:end format-quality-findings -->
<!-- vpmodule:atom:begin inspect-data-integrity -->
---
instruction_id: inspect-data-integrity
title: Check data integrity under failure
summary: "Look for swallowed errors, writes in the wrong order and writes with no transaction."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The reviewed code writes, updates or deletes stored data."
conditions_does_not_apply_when: The code changes no stored state.
artifact_contract_output_type: data-integrity-review
artifact_contract_required_data:
  - write paths
  - failure sequence
  - lost data
  - fix
artifact_contract_verified_by: each data-loss finding names the failure sequence that loses data
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Check data integrity under failure
Look for data loss: errors swallowed, writes in the wrong order, no transaction.
Check what the change could break for users: data it would destroy or expose.
Code you move or merge keeps its error handling and validation.
<!-- vpmodule:atom:end inspect-data-integrity -->
<!-- vpmodule:atom:begin inspect-edge-case-classes -->
---
instruction_id: inspect-edge-case-classes
title: Check the known classes of edge cases
summary: "Look for a wrong result, a crash and a missed edge case in the known classes: empty, zero, last item, rounding, time zones."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The reviewed code takes input, computes, sorts or converts values."
conditions_does_not_apply_when: The code stores no values and makes no decision on them.
artifact_contract_output_type: edge-case-findings
artifact_contract_required_data:
  - case class
  - input
  - wrong result
artifact_contract_verified_by: each edge-case finding names a concrete input
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Check the known classes of edge cases
Look for a wrong result.
Look for a crash.
Look for a missed edge case: empty, zero, last item, rounding, time zones.
Look for a caller broken by the change.
Look for a fix applied in one caller while the shared function stays broken.
Look for callers that disagree with what a function returns.
Look for the same rule applied differently in two places.
Before you report it, re-read the lines and confirm the value can really be empty.
<!-- vpmodule:atom:end inspect-edge-case-classes -->
<!-- vpmodule:atom:begin inspect-scalability-hazards -->
---
instruction_id: inspect-scalability-hazards
title: Check the hazards that appear only under load
summary: "Look for check-then-write races, work repeated by every process, memory that only grows and a query per item."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The system serves many users, processes or a large volume of data."
conditions_does_not_apply_when: The work runs once for a single user.
artifact_contract_output_type: scalability-review
artifact_contract_required_data:
  - hazard
  - expected load
  - failure mechanism
  - fix
artifact_contract_verified_by: each scale finding names the assumed load and the failure mechanism
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Check the hazards that appear only under load
Scale: fine for one user, wrong for many.
Look for check-then-write races.
Look for the same work done by every process.
Look for memory or lists that only grow.
Look for a query per item.
Look for O(n^2) on big input.
Look for per-process state that must be shared.
<!-- vpmodule:atom:end inspect-scalability-hazards -->
<!-- vpmodule:atom:begin require-concrete-failure-case -->
---
instruction_id: require-concrete-failure-case
title: Require a concrete case for every finding
summary: "A finding without an input or situation that leads to a wrong result does not enter the report: the claim is verified at the cited location, and a similar rejected finding does not settle it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "You are about to report a finding, or about to grade one a reviewer raised."
conditions_does_not_apply_when: You are only describing the review method.
artifact_contract_output_type: verified-finding
artifact_contract_required_data:
  - case
  - location in code
  - confirmation
  - rejected findings
artifact_contract_verified_by: "no finding is reported without a concrete failure case, and the claim was verified at the cited location"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Require a concrete case for every finding
Every finding needs a concrete case: "this input or situation leads to this wrong result".
No case, no finding.
Re-read the lines and confirm: the caller exists, the value can really be empty, the code really is unused.
Verify the finding's claim. At the cited file and line, does the bad outcome the reviewer describes actually occur?
Read beyond the changed lines -- follow callers, guards upstream, etc -- until you can answer yes or no.
A different finding about nearby code does not settle this one.
Do not reject finding B because it looks similar to a finding A you already rejected: that shortcut only works when both cite the exact same behavior at the exact same file and line.
Do not let rarity, fix effort or whether the defect predates the change decide whether the claim is real; those are not part of verification.
Judge whether the problem is real, not whether the proposed fix is plausible.
Code that loudly fails on a situation you never showed the program can reach is correct behavior, not a defect.
Be specific: a file and line, not a vague area.
No style taste, no "consider", no vague worries.
Do not be vague.
Do not give feedback on code you did not actually read.
<!-- vpmodule:atom:end require-concrete-failure-case -->