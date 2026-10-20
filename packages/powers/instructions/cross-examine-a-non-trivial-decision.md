---
instruction_id: cross-examine-a-non-trivial-decision
title: Cross-examine a non-trivial decision
summary: "Before a non-trivial decision stands, put it through a fresh-context reviewer that is biased to disprove it."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A decision is non-trivial and it is about to stand as the direction of the work.
conditions_does_not_apply_when: "The change is mechanical, or the user asked for speed over verification."
artifact_contract_output_type: doubt-cycle
artifact_contract_required_data:
  - the claim
  - why it matters
  - the reviewer invocation
  - the classified findings
  - the stop condition that was met
artifact_contract_verified_by: the cycle ran and a stop condition was met
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/doubt-driven-development/SKILL.md
status: active
revision: 1
---

# Cross-examine a non-trivial decision

A confident answer is not a correct one. Long sessions accumulate context that quietly turns assumptions into "facts" without anyone noticing. Doubt-driven development is the discipline of materializing a fresh-context reviewer — biased to **disprove**, not approve — before any non-trivial output stands.

This is not a final review. A final review is a verdict on a finished artifact. This is an in-flight posture: non-trivial decisions get cross-examined while course-correction is still cheap.

A decision is **non-trivial** when at least one of these is true:

- It introduces or modifies branching logic
- It crosses a module or service boundary
- It asserts a property the type system or compiler cannot verify (thread safety, idempotence, ordering, invariants)
- Its correctness depends on context the future reader cannot see
- Its blast radius is irreversible (production deploy, data migration, public API change)

**When NOT to use:**

- Mechanical operations (renaming, formatting, file moves)
- Following a clear, unambiguous user instruction
- Reading or summarizing existing code
- One-line changes with obvious correctness
- Pure tooling operations (running tests, listing files)
- The user has explicitly asked for speed over verification

If you doubt every keystroke, you ship nothing. The skill applies only to non-trivial decisions as defined above.

Copy this checklist when applying the skill:

```
Doubt cycle:
- [ ] Step 1: CLAIM — wrote the claim + why-it-matters
- [ ] Step 2: EXTRACT — isolated artifact + contract, stripped reasoning
- [ ] Step 3: DOUBT — invoked fresh-context reviewer with adversarial prompt
- [ ] Step 4: RECONCILE — classified every finding against the artifact text
- [ ] Step 5: STOP — met stop condition (trivial findings, 3 cycles, or user override)
```

### Step 1: CLAIM — Surface what stands

Name the decision in two or three lines:

```
CLAIM: "The new caching layer is thread-safe under the
        read-heavy workload described in the spec."
WHY THIS MATTERS: a race here corrupts user data and is
                  hard to detect in QA.
```

If you can't write the claim that compactly, you have a vibe, not a decision. Surface it before scrutinizing it.

Confidence correlates poorly with correctness on novel problems. Moments of certainty are exactly when blind spots hide.

Debugging a wrong commit in production is more expensive. The check is bounded; the bug isn't.

TDD's RED step is doubt made concrete — a failing test is a disproof attempt. When TDD applies, that failing test *is* the doubt step for behavioral claims.
