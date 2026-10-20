---
instruction_id: inspect-data-integrity
title: Перевіряй цілісність даних під час збою
summary: "Шукай проковтнуті помилки, записи в неправильному порядку й операції без транзакції, що втрачають дані."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "Код записує, оновлює або видаляє дані."
conditions_does_not_apply_when: Код не змінює збереженого стану.
artifact_contract_output_type: data-integrity-review
artifact_contract_required_data:
  - шляхи запису
  - послідовність збою
  - втрачені дані
  - виправлення
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
revision: 2
---

# Перевіряй цілісність даних під час збою
Переліч усі місця, де код записує, оновлює або видаляє дані.
Перевір, чи помилка не проковтується перед завершенням запису.
Перевір порядок записів.
Перевір, чи проміжний збій не лишає суперечливого стану.
Перевір, чи кілька пов'язаних змін виконуються в одній транзакції.
Перевір, чи скасування операції прибирає часткові зміни.
Перевір шляхи, де дані перезаписуються або видаляються.
Для кожної знахідки опиши послідовність збою.
Назви дані, які втрачаються або псуються.
Не вважай наявність обробника помилки доказом цілісності.
Не пропонуй транзакцію там, де система вже гарантує атомарність.
Не підвищуй теоретичну втрату без шляху до неї.
Познач шлях запису, який не вдалося перевірити.
Заверши, коли кожен шлях запису перевірено на збій.
