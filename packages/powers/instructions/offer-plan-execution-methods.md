---
instruction_id: offer-plan-execution-methods
title: Дай власнику вибрати спосіб виконання плану
summary: "Після плану покажи власнику способи виконання, порадь один і дочекайся рішення."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: План готовий і його треба передати у виконання.
conditions_does_not_apply_when: Власник уже обрав спосіб виконання для цього плану.
artifact_contract_output_type: execution-method-choice
artifact_contract_required_data:
  - план
  - способи
  - рекомендація
  - вибір власника
artifact_contract_verified_by: owner confirms plan and execution method
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-plans/SKILL.md
status: active
revision: 2
---

# Дай власнику вибрати спосіб виконання плану
Збережи план і дай власнику шлях до нього.
Попроси власника перевірити план.
Опиши два способи: з окремим виконавцем на кожну задачу або виконання в поточному контексті.
Назви ціну й користь кожного способу.
Порекомендуй один спосіб із причиною.
Врахуй залежність задач, їхню кількість і ціну помилки.
Дочекайся вибору способу виконання.
Не починай реалізацію до підтвердження плану.
Не вибирай спосіб мовчки.
Не змішуй два способи в одному виконанні.
Передай виконавцю обраний план і спосіб.
Не вважай згоду з планом згодою зі способом.
Онови рекомендацію, якщо план змінився.
Збережи рішення власника.
Повідом про відхилення плану, якщо власник його не підтвердив.
