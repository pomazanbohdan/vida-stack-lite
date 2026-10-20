---
instruction_id: watch-for-the-moves-that-lower-the-bar
title: Watch the change for the moves that lower the bar
summary: "Five moves lower a recorded bar: a threshold moved, a test made easier, a checker silenced, work left unfinished, an exception added."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A change is reviewed against a recorded quality bar.
conditions_does_not_apply_when: The change touches no recorded bar.
artifact_contract_output_type: bar-weakening-report
artifact_contract_required_data:
  - the five moves
  - the lines that show each move
  - the exceptions that were discussed
artifact_contract_verified_by: every finding names the move and the line that shows it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/constraint-driven-development/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/constraint-driven-development/references/floor-guard.md
status: active
revision: 1
---

# Watch the change for the moves that lower the bar

Someone will point out that if the agent writes the code and the checks, the checks prove nothing. Half right, and worth engineering around.

Agents don't craft clever loopholes. They hit a red check and take the cheapest road to green. Watch for these five moves in the diff, at review time:

1. **The threshold moved.** A budget lowered, a severity dropped, a check removed from the fast stage. Compare the constraints file against its state at the branch point.
2. **A test got easier.** `.skip` added, a test file deleted, assertions pulled out of tests that stayed.
3. **A checker got silenced.** New `@ts-ignore` or `eslint-disable`. Four suppressions deserve special attention because they switch off a check you're relying on: `istanbul ignore` drops code from coverage instead of testing it, `Stryker disable` hides a surviving mutant, `nosemgrep` and `gitleaks:allow` do it for security findings.
4. **Work is unfinished.** A stub that throws, an empty `catch` turning a failure into silence, a `TODO` standing where the implementation should be.
5. **An exception appeared.** A new row in the Exceptions table nobody discussed.

None of this needs tooling beyond `git diff`. Tightening the bar should be silent; loosening it should be loud.
