---
instruction_id: inspect-scalability-hazards
title: "Шукай небезпеки, що виявляються під навантаженням"
summary: "Перевіряй гонки між перевіркою й записом, повторну роботу кожного процесу, необмежене зростання пам'яті та запит на кожен елемент."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "Система обслуговує багато користувачів, процесів або великий обсяг даних."
conditions_does_not_apply_when: Робота виконується один раз для одного користувача.
artifact_contract_output_type: scalability-review
artifact_contract_required_data:
  - небезпека
  - очікуване навантаження
  - механізм відмови
  - виправлення
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
revision: 2
---

# Шукай небезпеки, що виявляються під навантаженням
Перевір послідовності «перевір, потім запиши» на гонку між процесами.
Знайди роботу, яку виконує кожен процес окремо замість одного разу.
Знайди пам'ять, черги або списки, що тільки зростають.
Знайди запит до сховища на кожен елемент замість одного пакетного запиту.
Знайди квадратичну роботу на великому вході.
Знайди стан у пам'яті процесу, який має бути спільним.
Оцінюй кожну знахідку проти названого очікуваного навантаження.
Назви механізм відмови для кожної знахідки.
Не вимагай розподіленого рішення для навантаження одного користувача.
Не вважай повільний, але сталий код небезпекою масштабу.
Познач знахідку, яка залежить від припущення про навантаження.
Не змішуй небезпеку масштабу зі звичайним сповільненням.
Познач шлях, який не вдалося перевірити під навантаженням.
Заверши, коли кожна знахідка має навантаження й механізм відмови.
