---
instruction_id: locate-verified-artifact
title: Знаходь і підтверджуй потрібний артефакт
summary: "Визнач точний шлях до артефакту й підтвердь його тотожність, а не лише свіжість."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Для аналізу треба знайти конкретний артефакт або випадок.
conditions_does_not_apply_when: Точний шлях уже підтверджений і належить цьому аналізу.
artifact_contract_output_type: located-artifact
artifact_contract_required_data:
  - абсолютний шлях
  - доказ тотожності
  - відкинуті кандидати
artifact_contract_verified_by: "identity confirmed by id, time and content"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/references/session-discovery.md
status: active
revision: 1
---

# Знаходь і підтверджуй потрібний артефакт
Визнач, який артефакт назвав власник.
Отримай повний абсолютний шлях.
Підтвердь тотожність за ідентифікатором, робочою текою, часом і вмістом.
Відрізняй основний артефакт від дочірніх.
Переліч кандидатів, яких відкинув, із причиною.
Перевір, чи артефакт ще не завершений.
Запиши джерела й значення полів у робочий файл.
Не вважай найновіший артефакт потрібним без підтвердження.
Не вигадуй формат із іншого джерела.
Не перетворюй відсутнє поле на нуль.
Не модифікуй знайдений артефакт.
Запитай відсутню ознаку, якщо кандидатів кілька.
Повідом про недоступність артефакту.
Збережи шлях для наступних читачів.
