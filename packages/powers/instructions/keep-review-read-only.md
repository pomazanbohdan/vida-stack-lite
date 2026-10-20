---
instruction_id: keep-review-read-only
title: "Виконуй перегляд і звіт, не змінюючи середовище"
summary: "Під час перегляду або одноразового звіту не змінюй робоче дерево, індекс, гілку, режим роботи чи збережений стан."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Ти переглядаєш зміну або готуєш одноразовий звіт у чужому чи спільному середовищі.
conditions_does_not_apply_when: "Ти є автором зміни й працюєш над нею, а не переглядаєш."
artifact_contract_output_type: read-only-review
artifact_contract_required_data:
  - межі перегляду
  - стан до
  - стан після
artifact_contract_verified_by: working tree unchanged after review
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/requesting-code-review/code-reviewer.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/task-reviewer-prompt.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-gain/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-help/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-gain.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-help.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-gain/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-help/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
---

# Виконуй перегляд і звіт, не змінюючи середовище
Визнач межі перегляду або звіту.
Не змінюй робоче дерево.
Не змінюй індекс.
Не перемикай гілку.
Не змінюй базову ревізію.
Для іншої ревізії створи окрему копію.
Не доручай перегляд іншому виконавцю.
Не запускай дубль перегляду.
Не виправляй знахідки під час перегляду.
Не змінюй тести під час перегляду.
Звіт про спрощення, показники чи довідку нічого не змінює.
Не перемикай режим роботи під час звіту й не зберігай стан.
Зберігай перелік у файл лише на явний запит власника.
Збережи зміну в тому стані, у якому її отримав.
Перевір, що стан не змінився після перегляду.
Повідом про потребу в іншій копії.
Запиши межу перегляду.
Заверши перегляд без побічних змін.
