---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-code-simplification-skill-md-dfea038e-c01"
title: "addy-skills: skills/code-simplification/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/code-simplification/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/code-simplification/SKILL.md\"}"
atom_ids:
  - automate-a-large-mechanical-refactor
  - avoid-over-simplification
  - match-the-codebase-conventions-not-your-preferences
  - prefer-explicit-code-over-clever-code
  - preserve-behaviour-exactly-when-you-simplify
  - remove-duplication-and-dead-weight
  - rename-for-content-and-keep-the-why-comments
  - scope-a-simplification-pass-to-what-changed
atom_count: 8
atoms: "[{\"atom_id\":\"automate-a-large-mechanical-refactor\",\"file_sha256\":\"6df96a96b8f554d7b5393374f596c5935e761bf7ae670264c505b6cac8fa3500\",\"content_sha256\":\"56a1bba4283bac30d6f0467a2e639c224a1f07af42ac27f6265756098ec08619\",\"file_bytes\":1386,\"body_bytes\":281},{\"atom_id\":\"avoid-over-simplification\",\"file_sha256\":\"18980434cb1a0fdb22c34d1c77a7533bafffee03ac9eba4a09c020f0485da2d1\",\"content_sha256\":\"2fa5af64d551187cabc20b49ba35c76243b1a97246a54d6116c2b2f49051030b\",\"file_bytes\":1653,\"body_bytes\":541},{\"atom_id\":\"match-the-codebase-conventions-not-your-preferences\",\"file_sha256\":\"4b61bd3ab5fae3a59d3a8b2ac45faab56f9326ab5f7b5289564f2766ca835bdc\",\"content_sha256\":\"9e5345783196111b0eeb325876fed183cff61008610443a26a23efc44d053217\",\"file_bytes\":2450,\"body_bytes\":1156},{\"atom_id\":\"prefer-explicit-code-over-clever-code\",\"file_sha256\":\"5d15e5b587474c4c969ca3306a3b6970a93c2df3b9bc0cacdc6d7ef3cc8f0a93\",\"content_sha256\":\"846f1edcfacad24f57eaf64ea6fcd26e7988ce7540cb5d46f159decd3cd71fa3\",\"file_bytes\":1704,\"body_bytes\":646},{\"atom_id\":\"preserve-behaviour-exactly-when-you-simplify\",\"file_sha256\":\"44c1bba9f0567bfa1c9e8eb91f481b47752231b88161c1fe21a494d928ce0fd3\",\"content_sha256\":\"b2b7a02deb98c80a79d74f63611c5efc6792c035cdd82a49a51c1bebe84c15d0\",\"file_bytes\":1831,\"body_bytes\":670},{\"atom_id\":\"remove-duplication-and-dead-weight\",\"file_sha256\":\"9da5671761e1fdaf60cf7086f44a425c94c7aec922e5a106875615bc21c9dd03\",\"content_sha256\":\"284bd0d4b94b917d9a1a320a26d4d9fcafad350b6991a9b535ddb99a6cf315da\",\"file_bytes\":1961,\"body_bytes\":849},{\"atom_id\":\"rename-for-content-and-keep-the-why-comments\",\"file_sha256\":\"0ddcc26101c3ebcc8a1e0bd05a772dcd9470685c93f3a505fac3f106f5162918\",\"content_sha256\":\"84781fccf7c7919d6e7cee187a2622016cf38698e9d7db3848a16c3a28864ec9\",\"file_bytes\":1951,\"body_bytes\":784},{\"atom_id\":\"scope-a-simplification-pass-to-what-changed\",\"file_sha256\":\"8b3390caa3e5b391db2ce32d5e719da8ae18e2fa6f4ff4a840b3a8c6ae398499\",\"content_sha256\":\"cd03b56d7991a516579780fbed615f016fe40c2ec9549052e71cc4d6cdf88bbf\",\"file_bytes\":1707,\"body_bytes\":509}]"
carrier_sha256: f27cbf8095e4a34c7083f213b27146ba594a64f16a94c35aa1ebe32ef2acc308
carrier_bytes: 15734
revision: 1
status: active
---
<!-- vpmodule:atom:begin automate-a-large-mechanical-refactor -->
---
instruction_id: automate-a-large-mechanical-refactor
title: Automate a large mechanical refactor
summary: "Above five hundred touched lines, drive the change with codemods or transforms instead of by hand."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A refactoring would touch more than five hundred lines.
conditions_does_not_apply_when: The refactoring is small enough to edit and review by hand.
artifact_contract_output_type: refactor-automation-decision
artifact_contract_required_data:
  - the lines the refactoring touches
  - the automation chosen
  - the manual-edits risk avoided
artifact_contract_verified_by: a refactor over the threshold was driven by a script rather than by hand
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Automate a large mechanical refactor

**The Rule of 500:** If a refactoring would touch more than 500 lines, invest in automation (codemods, sed scripts, AST transforms) rather than making the changes by hand. Manual edits at that scale are error-prone and exhausting to review.
<!-- vpmodule:atom:end automate-a-large-mechanical-refactor -->
<!-- vpmodule:atom:begin avoid-over-simplification -->
---
instruction_id: avoid-over-simplification
title: Watch for over-simplification
summary: "Simplification has a failure mode: inlining too far, merging unrelated logic, dropping useful abstractions, chasing line count."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A simplification is about to remove something that gives a concept its name.
conditions_does_not_apply_when: The removal was already decided and verified by the behaviour check.
artifact_contract_output_type: over-simplification-check
artifact_contract_required_data:
  - the trap checked
  - the abstraction or naming kept
  - the comprehension result
artifact_contract_verified_by: the result is easier to understand than the code before it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Watch for over-simplification

Simplification has a failure mode: over-simplification. Watch for these traps:

- **Inlining too aggressively** — removing a helper that gave a concept a name makes the call site harder to read
- **Combining unrelated logic** — two simple functions merged into one complex function is not simpler
- **Removing "unnecessary" abstraction** — some abstractions exist for extensibility or testability, not complexity
- **Optimizing for line count** — fewer lines is not the goal; easier comprehension is
<!-- vpmodule:atom:end avoid-over-simplification -->
<!-- vpmodule:atom:begin match-the-codebase-conventions-not-your-preferences -->
---
instruction_id: match-the-codebase-conventions-not-your-preferences
title: "Match the codebase conventions, not your preferences"
summary: "Simplification means making the code more consistent with the codebase, never with an external house style."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A simplification is about to be written and the project has its own conventions.
conditions_does_not_apply_when: The project has no conventions to match.
artifact_contract_output_type: convention-match
artifact_contract_required_data:
  - the conventions read
  - the neighbouring example studied
  - the style points matched
artifact_contract_verified_by: "the result reads like the neighbouring code rather than like the reviewer's own style"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/start-in-an-existing-codebase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Match the codebase conventions, not your preferences

Simplification means making code more consistent with the codebase, not imposing external preferences. Before simplifying:

```
1. Read the project conventions
2. Study how neighboring code handles similar patterns
3. Match the project's style for:
   - Import ordering and module system
   - Function declaration style
   - Naming conventions
   - Error handling patterns
   - Type annotation depth
```

Simplification that breaks project consistency is not simplification — it's churn.

Renaming things to match your preferences rather than project conventions
You do not inventory conventions beforehand.
The implementer investigates the repository, writes down what to reuse and what not to change, and follows that.
If you want this change to break a pattern, say so in the request, and write why in the spec so later sessions follow the new rule.
If you dislike a pattern but have no plan to change it, say nothing — it will match the code.
Hoping it modernizes on its own continues the pattern.
Changing one file and leaving the rest leaves two standards with no record of which one wins.
<!-- vpmodule:atom:end match-the-codebase-conventions-not-your-preferences -->
<!-- vpmodule:atom:begin prefer-explicit-code-over-clever-code -->
---
instruction_id: prefer-explicit-code-over-clever-code
title: Prefer explicit code over clever code
summary: Explicit code beats compact code whenever the compact version needs a mental pause to parse.
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: "A compact expression could replace a longer, explicit form."
conditions_does_not_apply_when: The compact form stays obvious to every reader of that codebase.
artifact_contract_output_type: clarity-decision
artifact_contract_required_data:
  - the compact form considered
  - the explicit form chosen
  - the parsing cost avoided
artifact_contract_verified_by: the chosen form reads without a mental pause
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Prefer explicit code over clever code

Explicit code is better than compact code when the compact version requires a mental pause to parse.

```typescript
// UNCLEAR: Dense ternary chain
const label = isNew ? 'New' : isUpdated ? 'Updated' : isArchived ? 'Archived' : 'Active';

// CLEAR: Readable mapping
function getStatusLabel(item: Item): string {
  if (item.isNew) return 'New';
  if (item.isUpdated) return 'Updated';
  if (item.isArchived) return 'Archived';
  return 'Active';
}
```

"Fewer lines is always simpler" | A 1-line nested ternary is not simpler than a 5-line if/else. Simplicity is about comprehension speed, not line count.
<!-- vpmodule:atom:end prefer-explicit-code-over-clever-code -->
<!-- vpmodule:atom:begin preserve-behaviour-exactly-when-you-simplify -->
---
instruction_id: preserve-behaviour-exactly-when-you-simplify
title: Preserve behaviour exactly when you simplify
summary: "Change only how the code expresses itself: the same inputs, outputs, side effects, errors and edge cases must survive."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Any change is made in the name of simplifying existing code.
conditions_does_not_apply_when: The change deliberately alters behaviour and is approved as such.
artifact_contract_output_type: behaviour-check
artifact_contract_required_data:
  - the outputs preserved
  - the error behaviour preserved
  - the side effects preserved
  - the test result
artifact_contract_verified_by: the existing tests pass without modification and the behaviour checklist was answered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Preserve behaviour exactly when you simplify

Don't change what the code does — only how it expresses it. All inputs, outputs, side effects, error behavior, and edge cases must remain identical. If you're not sure a simplification preserves behavior, don't make it.

```
ASK BEFORE EVERY CHANGE:
→ Does this produce the same output for every input?
→ Does this maintain the same error behavior?
→ Does this preserve the same side effects and ordering?
→ Do all existing tests still pass without modification?
```

Simplification that requires modifying tests to pass (you likely changed behavior)

Removing error handling because "it makes the code cleaner"
<!-- vpmodule:atom:end preserve-behaviour-exactly-when-you-simplify -->
<!-- vpmodule:atom:begin remove-duplication-and-dead-weight -->
---
instruction_id: remove-duplication-and-dead-weight
title: Remove duplication and dead weight
summary: "Extract duplicated logic, delete what is truly dead, inline the wrapper that adds nothing and drop redundant assertions."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: "The code under simplification contains redundancy, dead weight or a redundant abstraction."
conditions_does_not_apply_when: The abstraction exists for extensibility or testability and is still needed.
artifact_contract_output_type: redundancy-removal
artifact_contract_required_data:
  - the pattern
  - the signal
  - the removal applied
artifact_contract_verified_by: each recognised redundancy pattern has its named removal applied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Remove duplication and dead weight

**Redundancy:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Duplicated logic | Same 5+ lines in multiple places | Extract to a shared function |
| Dead code | Unreachable branches, unused variables, commented-out blocks | Remove (after confirming it's truly dead) |
| Unnecessary abstractions | Wrapper that adds no value | Inline the wrapper, call the underlying function directly |
| Over-engineered patterns | Factory-for-a-factory, strategy-with-one-strategy | Replace with the simple direct approach |
| Redundant type assertions | Casting to a type that's already inferred | Remove the assertion |

"This abstraction might be useful later" | Don't preserve speculative abstractions. If it's not used now, it's complexity without value. Remove it and re-add when needed.
<!-- vpmodule:atom:end remove-duplication-and-dead-weight -->
<!-- vpmodule:atom:begin rename-for-content-and-keep-the-why-comments -->
---
instruction_id: rename-for-content-and-keep-the-why-comments
title: Rename for content and keep the comments that carry intent
summary: "Names describe their content, abbreviations are spelled out, and comments survive only when they carry the why."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Names or comments in the code under simplification do not carry their meaning.
conditions_does_not_apply_when: The names and comments already describe the content and the intent.
artifact_contract_output_type: naming-and-comment-pass
artifact_contract_required_data:
  - the generic names renamed
  - the misleading names renamed
  - the comments deleted
  - the comments kept
artifact_contract_verified_by: every kept comment carries intent the code cannot express
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Rename for content and keep the comments that carry intent

**Naming and readability:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Generic names | `data`, `result`, `temp`, `val`, `item` | Rename to describe the content: `userProfile`, `validationErrors` |
| Abbreviated names | `usr`, `cfg`, `btn`, `evt` | Use full words unless the abbreviation is universal (`id`, `url`, `api`) |
| Misleading names | Function named `get` that also mutates state | Rename to reflect actual behavior |
| Comments explaining "what" | `// increment counter` above `count++` | Delete the comment — the code is clear enough |
| Comments explaining "why" | `// Retry because the API is flaky under load` | Keep these — they carry intent the code can't express |
<!-- vpmodule:atom:end rename-for-content-and-keep-the-why-comments -->
<!-- vpmodule:atom:begin scope-a-simplification-pass-to-what-changed -->
---
instruction_id: scope-a-simplification-pass-to-what-changed
title: Scope a simplification pass to what changed
summary: Simplify the recently modified code by default and leave unrelated code alone unless the scope is widened on purpose.
capability_tags:
  - simplify-code
pattern_tags:
  - code-minimization
conditions_applies_when: A simplification pass is started on a codebase or a module.
conditions_does_not_apply_when: "The code is already clean, the code is not yet understood, the simpler version would be measurably slower, or the module is about to be rewritten entirely."
artifact_contract_output_type: simplification-scope
artifact_contract_required_data:
  - the code in scope
  - the code deliberately left alone
  - the widened scope when it was widened
artifact_contract_verified_by: the diff contains no change outside the agreed scope
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Scope a simplification pass to what changed

Default to simplifying recently modified code. Avoid drive-by refactors of unrelated code unless explicitly asked to broaden scope. Unscoped simplification creates noise in diffs and risks unintended regressions.

"I'll just quickly simplify this unrelated code too" | Unscoped simplification creates noisy diffs and risks regressions in code you didn't intend to change. Stay focused.

Refactoring code outside the scope of the current task without being asked
<!-- vpmodule:atom:end scope-a-simplification-pass-to-what-changed -->