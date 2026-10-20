---
instruction_id: self-review-plan-against-spec
title: Перевіряй план проти специфікації
summary: "Після написання плану звір кожну вимогу, крок, тип і фокус перегляду зі специфікацією."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: План написано і його готують до передавання.
conditions_does_not_apply_when: План ще не завершений або специфікації немає.
artifact_contract_output_type: plan-self-review
artifact_contract_required_data:
  - покриття вимог
  - перевірка кроків
  - узгодженість типів
  - прогалини
artifact_contract_verified_by: checklist run against every spec requirement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-plans/SKILL.md
status: active
revision: 1
---

# Перевіряй план проти специфікації
Перечитай специфікацію перед самоперевіркою.
Для кожної вимоги знайди задачу, яка її реалізує.
Випиши вимоги без задачі.
Перевір, що кожен крок дає одне однозначне рішення.
Прибери кроки, які нічого не вирішують.
Прибери з плану код, який уже визначають підпис і тест.
Перевір узгодженість типів, підписів і назв між задачами.
Перевір, що фокус перегляду має тести.
Порівняй обсяг плану зі специфікацією.
Виправ знайдені прогалини одразу.
Не додавай задачу без вимоги.
Не залишай обробити крайові випадки без конкретики.
Не передавай план із невизначеними кроками.
Не вважай самоперевірку незалежним переглядом.
Заверши після повного проходу чекліста.
