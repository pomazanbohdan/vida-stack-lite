---
instruction_id: maintain-verification-harness-against-drift
title: Тримай перевірку в актуальному стані
summary: "Оновлюй сценарії перевірки разом із поведінкою, щоб зелене світло не означало застарілий продукт."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: "Поведінка продукту змінилася, а перевірка й далі описує попередню версію."
conditions_does_not_apply_when: Перевірки ще немає й її треба створити з нуля.
artifact_contract_output_type: harness-update
artifact_contract_required_data:
  - оновлені сценарії
  - причина зміни
  - відомі прогалини
  - час виконання
artifact_contract_verified_by: the updated harness executes against the current build
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/maintain-verification-skill/SKILL.md
status: active
revision: 1
---

# Тримай перевірку в актуальному стані
Переглядай перевірку щоразу, коли змінюється поведінка продукту.
Знайди сценарій, який перестав відповідати реальності.
Онови очікуваний результат разом із кодом, а не після нього.
Прибери крок, що перевіряє видалену можливість.
Додай крок для нової межі, яку ніхто не покриває.
Перевір, що старі сценарії досі проходять із новими даними.
Познач сценарії, які стали нестабільними, і знайди причину.
Не вимикай незручну перевірку без записаної причини.
Веди короткий список відомих прогалин.
Перевір час виконання й прибери зайві очікування.
Запусти перевірку на тому самому середовищі, де працює продукт.
Покажи, що перевірка падає на відомому дефекті.
Оновлюй перевірку в тій самій зміні, що й поведінку.
Віддай оновлені сценарії та список прогалин.
