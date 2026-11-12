---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-failing-direction-md-2d4f031e-c01"
title: "gsd-core: gsd-core/references/planner-failing-direction.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/planner-failing-direction.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-failing-direction.md\"}"
atom_ids:
  - name-the-failure-signal-for-every-acceptance-command
  - name-the-failure-signal-for-every-automated-command
  - reject-a-vague-or-placeholder-failure-statement
atom_count: 3
atoms: "[{\"atom_id\":\"name-the-failure-signal-for-every-acceptance-command\",\"file_sha256\":\"508d8d470b5054af2ce7c875cf5aea06f97d04cd28e0239b07a5b05dedc08301\",\"content_sha256\":\"6b268f74d67e9f52bc95daa2f9dacf72bef6e0e7195459226236d4e5a9604808\",\"file_bytes\":2551,\"body_bytes\":1229},{\"atom_id\":\"name-the-failure-signal-for-every-automated-command\",\"file_sha256\":\"3ceeee6ccfe119f8021c13cb3d53d552a40c0ffd60e6bcdb1ef85e4a6a08a077\",\"content_sha256\":\"5941eace803c0d1430bf316c2c19411d2bf4631a294da039183ae56fd107ea11\",\"file_bytes\":2762,\"body_bytes\":1622},{\"atom_id\":\"reject-a-vague-or-placeholder-failure-statement\",\"file_sha256\":\"ed76cbed10235a13d2c6978631295b08511495142c9d939b5602ea7ced760e48\",\"content_sha256\":\"8b83a9656e4ed7430d5e0343b32ac6c2e9b669dc67574838a4ad93f2841476e5\",\"file_bytes\":1886,\"body_bytes\":765}]"
carrier_sha256: 40ed6978469742dd1294a3b9fff0fa302b50315385d853e36bc8dfc37ce4dd5b
carrier_bytes: 7672
revision: 1
status: active
---
<!-- vpmodule:atom:begin name-the-failure-signal-for-every-acceptance-command -->
---
instruction_id: name-the-failure-signal-for-every-acceptance-command
title: Name the failure signal for every acceptance command
summary: Every runnable verification command carries a sibling statement that names the output which constitutes failure; a command with no expressible failure mode is not an acceptance test.
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A plan writes a runnable verification command that decides whether a task is done.
conditions_does_not_apply_when: The command is a placeholder for a test another task has to create first.
artifact_contract_output_type: acceptance-command
artifact_contract_required_data:
  - the runnable command
  - the statement of what output constitutes failure
  - the placement of the statement
artifact_contract_verified_by: "every runnable command has a failure statement placed immediately after it, and no statement is bound to the wrong command"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the failure signal for every acceptance command
**Every runnable `<automated>` command needs a `<fails_when>` sibling naming what output constitutes failure.** A command with no expressible failure mode is not an acceptance test.
- **One statement per runnable command**, placed immediately after it. Within a task, each `<fails_when>` binds to the nearest preceding `<automated>`, and the first statement after a command is the binding one. Two commands need two statements.
- The `MISSING` sentinel is exempt. It is not a runnable command, so it has no failure mode to state. Do not attach a `<fails_when>` to one.
Prefer the signal the tool actually emits over one you imagine. When `prior_verify_commands` supplies a command a prior phase already proved, the failure signal that command produces is the one to state - you have seen its output. When you author a new command, name the signal from the tool's documented output shape, not from a guess about it.
The authoring test, applied to yourself: *if this command were silently doing nothing, what in its output would tell me?* If you cannot answer, you do not yet have an acceptance command - you have a command. Fix the command, do not invent a statement for it.
<!-- vpmodule:atom:end name-the-failure-signal-for-every-acceptance-command -->
<!-- vpmodule:atom:begin name-the-failure-signal-for-every-automated-command -->
---
instruction_id: name-the-failure-signal-for-every-automated-command
title: Name the failure signal for every automated command
summary: Every runnable verification command carries the sibling statement that names what output counts as failure.
capability_tags:
  - verify-work-results
pattern_tags:
  - testable-criteria
conditions_applies_when: A runnable verification command is written into a plan.
conditions_does_not_apply_when: The command is the placeholder that says the test must be created first.
artifact_contract_output_type: failure-direction
artifact_contract_required_data:
  - the command
  - the failure signal statement
  - the observable output it names
artifact_contract_verified_by: every runnable command has its own failure signal naming an observable output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the failure signal for every automated command
**Every runnable `<automated>` command needs a `<fails_when>` sibling naming what output constitutes failure.** A command with no expressible failure mode is not an acceptance test
**The authoring test, applied to yourself:** *if this command were silently doing nothing, what in its output would tell me?* If you cannot answer, you do not yet have an acceptance command — you have a command. Fix the command, do not invent a statement for it
**One statement per runnable command**, placed immediately after it. Within a task, each `<fails_when>` binds to the nearest preceding `<automated>`, and the first statement after a command is the binding one. Two commands need two statements
**Name an observable signal**, not the word "failure". `non-zero exit`, `"0 passed" in the summary`, `the coverage line is absent`, `stderr contains "ECONNREFUSED"` are signals. *"the command fails"*, *"it doesn't work"*, *"an error occurs"* are restatements and will be flagged
**Short is fine.** `non-zero exit` is complete. There is no minimum length and no required keyword
**`TBD`, `TODO`, `N/A`, `none`, `unknown`, `?`, `-` are rejected outright** as whole values. A statement you cannot write is a command you should not ship
Prefer the signal the tool actually emits over one you imagine. When `prior_verify_commands` supplies a command a prior phase already proved, the failure signal that command produces is the one to state — you have seen its output. When you author a new command, name the signal from the tool's documented output shape, not from a guess about it
<!-- vpmodule:atom:end name-the-failure-signal-for-every-automated-command -->
<!-- vpmodule:atom:begin reject-a-vague-or-placeholder-failure-statement -->
---
instruction_id: reject-a-vague-or-placeholder-failure-statement
title: Reject a vague or placeholder failure statement
summary: "The failure statement names an observable signal; a restatement of the word failure, a placeholder value or a minimum-length rule is rejected."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: The failure statement of an acceptance command is written.
conditions_does_not_apply_when: The statement already names a concrete signal the tool emits.
artifact_contract_output_type: failure-statement
artifact_contract_required_data:
  - the observable signal
  - the rejected forms
artifact_contract_verified_by: no statement restates the word failure and no placeholder value survived
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reject a vague or placeholder failure statement
- **Name an observable signal**, not the word "failure". `non-zero exit`, `"0 passed" in the summary`, `the coverage line is absent`, `stderr contains "ECONNREFUSED"` are signals. *"the command fails"*, *"it doesn't work"*, *"an error occurs"* are restatements and will be flagged.
- **Short is fine.** `non-zero exit` is complete. There is no minimum length and no required keyword.
- **`TBD`, `TODO`, `N/A`, `none`, `unknown`, `?`, `-` are rejected outright** as whole values. A statement you cannot write is a command you should not ship.
- **Any characters are safe.** `exit code > 0`, `stderr contains "FAIL" && exit != 0` are ordinary prose here - that is exactly why this is an element and not an attribute.
<!-- vpmodule:atom:end reject-a-vague-or-placeholder-failure-statement -->