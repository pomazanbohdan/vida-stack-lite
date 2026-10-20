---
instruction_id: state-assumed-load
title: "Назви очікуване навантаження, за яким оцінюєш"
summary: "Визнач, на скільки користувачів і процесів розрахована система, і оцінюй масштаб лише за цим припущенням."
capability_tags:
  - review-code
  - audit-codebase
pattern_tags:
  - code-review
  - code-audit
conditions_applies_when: "Оцінка стосується швидкодії, пам'яті, конкурентності або спільного стану."
conditions_does_not_apply_when: Зміна не залежить від кількості користувачів чи процесів.
artifact_contract_output_type: load-assumption
artifact_contract_required_data:
  - очікуване навантаження
  - джерело припущення
  - "знахідки, що від нього залежать"
artifact_contract_verified_by: the assumed load is stated before any scale finding
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

# Назви очікуване навантаження, за яким оцінюєш
Знайди очікуване навантаження в описі проєкту, конфігурації розгортання й обсязі даних.
Визнач, це одна людина, що запускає скрипт, чи багато користувачів і процесів одночасно.
Візьми навантаження з документів або конфігурації, а не з власної уяви.
Запиши, звідки взялося припущення.
Запиши припущення одним рядком до першої знахідки про масштаб.
Оцінюй масштаб лише проти цього припущення.
Вважай дефектом те, що ламається на очікуваному навантаженні.
Не підвищуй до дефекту те, що витримує очікуване навантаження.
Познач знахідку, яка стане проблемою лише за більшого навантаження, як залежну від припущення.
Познач, які знахідки зникнуть, якщо навантаження виявиться іншим.
Якщо навантаження не вдалося встановити, назви припущення й познач знахідки, що від нього залежать.
Не порівнюй систему з уявним піковим навантаженням без доказу.
Не вимагай рішення для навантаження, якого проєкт не обіцяє.
Не оцінюй швидкодію без названого припущення.
Заверши, коли припущення назване, а кожна знахідка про масштаб прив'язана до нього.
