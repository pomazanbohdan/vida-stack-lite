---
instruction_id: name-the-check-behind-every-threshold
title: Name the check behind every threshold
summary: "A threshold states the number, the reason and the command that produces its verdict; a number with no command is an aspiration."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: "A number is written into the project's quality bar, or a check is proposed for one."
conditions_does_not_apply_when: The rule is a judgement call that no command can decide.
artifact_contract_output_type: threshold-row
artifact_contract_required_data:
  - the number
  - the reason for the number
  - the command that produces the verdict
  - the default used when nobody has an opinion
artifact_contract_verified_by: every number in the document names a command that runs today and a reason for its value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 1
---

# Name the check behind every threshold

Every row names the command that produces the verdict. A dimension with a number and no command in this column is an aspiration, not a constraint.

State the number and the reason together. A threshold without a rationale gets deleted by the next person who hits it.

Picking a dimension means installing something. Don't leave the user with a number and no mechanism, and don't invent your own checker when a de facto one exists — these tools are listed because their rule formats and thresholds are what everything else in the ecosystem targets, so the team's existing config keeps working.

Add each one to the project's own script so it's reproducible without an agent:

```json
{
  "scripts": {
    "check:fast": "tsc --noEmit && eslint . && gitleaks detect --redact --no-banner",
    "check:task": "npm run check:fast && vitest run --coverage",
    "check:full": "npm run check:task && semgrep scan --config p/default && osv-scanner scan source -r ."
  }
}
```

**Sane Defaults.** When the user has no opinion, use these. They're chosen to be met by most codebases on day one.

| Constraint | Default | Why this number |
|------------|---------|-----------------|
| Coverage of changed lines | ≥ 80% | High enough to force a test, low enough to allow a config line |
| Project coverage | today's value, must not fall | No argument needed to adopt |
| Mutation score (if used) | ≥ 60% to start | Typical for a suite never mutated before; 80% is mature |
| Dependency vulnerabilities | nothing at high or above | Below that is mostly noise |
| Exception lifetime | 90 days | Long enough to plan the fix, short enough to remember |
| Ratchet tolerance | 0.5% | Absorbs drift when an unrelated file moves the number |

Constraints work at three levels of teeth. Start at the first:

1. **Written only.** The constraints file exists and agents read it. Costs nothing, catches the honest mistakes, relies on the agent complying.
2. **Scripted.** An `npm run check` (or `make check`) that runs the fast checks, wired into your agent's post-edit hook and your CI. Deterministic, no new dependency.
3. **Tool-backed.** A dedicated runner that handles diff scoping, budgets, ratchets, and the guard checks. Use when the config outgrows a shell script. The floor-guard reference is the starting point for the guard-checks half of this.

Most projects should stop at 2. Move to 3 when you're maintaining more than about thirty lines of check-running shell.
