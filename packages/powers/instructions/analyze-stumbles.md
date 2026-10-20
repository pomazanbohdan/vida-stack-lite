---
instruction_id: analyze-stumbles
title: Фіксуй кожну зупинку в русі
summary: "Знайди помилки, повтори, відкати й корекції та вкажи, чи вдалося відновитися."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: "Скарга стосується збоїв, зависань або частих виправлень."
conditions_does_not_apply_when: Артефакт не містить помилок або перервань.
artifact_contract_output_type: stumble-report
artifact_contract_required_data:
  - подія
  - місце
  - наступна дія
  - стан відновлення
artifact_contract_verified_by: each stumble has line and recovery status
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/stumbles.md
status: active
revision: 1
---

# Фіксуй кожну зупинку в русі
Знайди результати з помилкою або ненульовим кодом.
Знайди команди, які не виконалися.
Знайди повтори тієї самої дії після помилки.
Знайди відкоти й відновлення попереднього вмісту.
Знайди текстові повернення назад.
Знайди корекції з боку власника.
Знайди відмови в доступі, перезапуски й переривання.
Для кожної події вкажи місце, крок і що сталося далі.
Познач, чи відновлено в тому самому кроці.
Познач, чи відновлено пізніше.
Познач, чи не відновлено.
Групуй однакові повторні збої з кількістю.
Не вважай помилку інструмента помилкою виконавця.
Не приховуй дрібні зупинки.
Відділяй відновлення від виправлення.
Заверши, коли кожна зупинка має місце й стан відновлення.
