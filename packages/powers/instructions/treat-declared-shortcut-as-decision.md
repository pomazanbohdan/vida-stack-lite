---
instruction_id: treat-declared-shortcut-as-decision
title: Сприймай позначене спрощення як рішення
summary: "Коментар, що називає межу й умову перегляду, є усвідомленим рішенням, а не знахідкою."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "Ти знайшов спрощення, позначене коментарем із названою межею."
conditions_does_not_apply_when: Спрощення не має позначки й названої межі.
artifact_contract_output_type: shortcut-decision
artifact_contract_required_data:
  - межа спрощення
  - умова перегляду
  - очікуване навантаження
  - рішення
artifact_contract_verified_by: each marked shortcut is accepted or refuted by the assumed load
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 2
---

# Сприймай позначене спрощення як рішення
Знайди позначку спрощення в коментарі.
Перевір, що позначка стосується відкладення, а не збігу слів.
Прочитай названу межу.
Перевір, чи названа умова перегляду.
Вважай таке спрощення рішенням, а не знахідкою.
Відкрий його як знахідку лише тоді, коли очікуване навантаження вже перевищує названу межу.
Познач спрощення без умови перегляду як борг, що тихо старіє.
Запропонуй оновити межу, якщо вона перестала відповідати навантаженню.
Не вимагай прибрати спрощення лише через його наявність.
Не вважай позначку дозволом на нові спрощення без межі.
Назви межу й умову перегляду в кожній знахідці про спрощення.
Не змішуй спрощення з недбалістю: позначка має називати реальну межу.
Познач спрощення, чию межу не вдалося перевірити.
Заверши, коли кожне позначене спрощення прийнято або відкрито з доказом.
