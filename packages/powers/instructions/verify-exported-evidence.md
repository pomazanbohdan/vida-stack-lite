---
instruction_id: verify-exported-evidence
title: "Перевіряй, що експортований доказ підтримує знахідку"
summary: Після очищення звір кожну знахідку з включеним доказом і окремо познач приватність та повноту підтримки.
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Артефакт готують до передачі або архівування.
conditions_does_not_apply_when: Артефакт не залишає місце створення.
artifact_contract_output_type: export-evidence-check
artifact_contract_required_data:
  - знахідки
  - включені докази
  - обмеження
  - висновки
artifact_contract_verified_by: each exported finding checked against included evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/templates/bundle-README.md
status: active
revision: 2
---

# Перевіряй, що експортований доказ підтримує знахідку
Визнач матеріали, які входять до передачі.
Для кожної знахідки знайди включене місце доказу.
Прочитай цитовану команду, результат або цитату.
Перевір, чи доказ справді підтримує твердження.
Не вважай наявність шляху й рядка доказом.
Познач знахідки з обмеженою підтримкою.
Запиши причину обмеження.
Оціни приватність окремо від підтримки.
Познач приватність як чисту або незавершену.
Познач підтримку як повну або обмежену.
Не змішуй ці два висновки.
Онови перелік після зміни файлів.
Повтори перевірку для змінених матеріалів.
Покажи обидва висновки власнику.
Заверши, коли кожна знахідка має підтверджений або обмежений доказ.
