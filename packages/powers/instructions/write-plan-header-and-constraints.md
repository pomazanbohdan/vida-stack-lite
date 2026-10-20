---
instruction_id: write-plan-header-and-constraints
title: "Фіксуй у плані ціль, специфікацію й обмеження"
summary: "Починай план із цілі, архітектури, посилання на специфікацію, глобальних обмежень і фокусу перегляду."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: План реалізує специфікацію або має глобальні обмеження.
conditions_does_not_apply_when: План є коротким переліком кроків без специфікації.
artifact_contract_output_type: plan-header
artifact_contract_required_data:
  - ціль
  - архітектура
  - специфікація
  - обмеження
  - фокус перегляду
artifact_contract_verified_by: every constraint copied with its exact value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-plans/SKILL.md
status: active
revision: 1
---

# Фіксуй у плані ціль, специфікацію й обмеження
Запиши ціль плану одним реченням.
Опиши архітектурний підхід у двох-трьох реченнях.
Назви технології та ключові залежності.
Додай шлях до специфікації, з якої випливає план.
Перенеси глобальні обмеження дослівно.
Вкажи точні значення версій, форматів і назв.
Додай фокус перегляду: класи входів, які можуть зламатися.
Для кожного класу входів назви очікувану поведінку.
Перевір, що кожен пункт фокусу має тест у відповідній задачі.
Не переказуй специфікацію повністю.
Не залишай обмеження лише в задачі, де воно вперше згадане.
Не додавай у фокус перегляду те, що вже покрито тестами.
Познач порожній фокус як перевірений, а не пропущений.
Онови заголовок, якщо змінилася специфікація.
Збережи заголовок разом із планом.
