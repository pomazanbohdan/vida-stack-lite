---
instruction_id: test-guidance-against-baseline
title: Перевіряй настанову на базовій поведінці
summary: "Створи сценарій без настанови, зафіксуй збій і лише потім пиши текст."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "Треба створити або змінити настанову, яка має змінити поведінку виконавця."
conditions_does_not_apply_when: "Текст є довідкою без правил, які можна порушити."
artifact_contract_output_type: baseline-scenario
artifact_contract_required_data:
  - сценарій
  - базовий вибір
  - виправдання
  - повторна перевірка
artifact_contract_verified_by: behavior changes between baseline and guidance runs
compatibility_excludes: []
compatibility_requires:
  - close-guidance-loopholes
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/testing-skills-with-subagents.md
status: active
revision: 2
---

# Перевіряй настанову на базовій поведінці
Визнач поведінку, яку треба змінити.
Сформулюй реалістичний сценарій із кількома тисками.
Запусти сценарій без настанови.
Зафіксуй фактичний вибір виконавця.
Запиши його виправдання дослівно.
Визнач, які саме збої повторюються.
Не пиши настанову, якщо базового збою немає.
Не вигадуй збоїв, яких не спостерігав.
Зроби сценарій конкретним: реальні дані, обмеження, ціна помилки.
Дай виконавцю кілька чітких варіантів вибору.
Не вважай академічне запитання перевіркою поведінки.
Не використовуй один випадок як доказ.
Запусти сценарій повторно після написання.
Порівняй вибір і аргументацію до і після.
Закривай нові обходи за close-guidance-loopholes.
