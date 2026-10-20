---
instruction_id: record-skipped-steps-with-reason
title: Записуй пропущені кроки з причиною
summary: "Не приховуй невиконані кроки: назви причину, вплив на впевненість і спосіб закрити прогалину."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: Частину запланованих перевірок або кроків не вдалося виконати.
conditions_does_not_apply_when: Усі заплановані кроки виконано й підтверджено.
artifact_contract_output_type: skip-ledger
artifact_contract_required_data:
  - крок
  - причина
  - вплив
  - спосіб закриття
artifact_contract_verified_by: the report lists every skipped step and its effect
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/10-recipes-and-pitfalls.md
status: active
revision: 1
---

# Записуй пропущені кроки з причиною
Помічай крок, який не вдалося виконати.
Запиши, чому його пропущено.
Вкажи, хто або що завадило виконати крок.
Відділи пропуск через брак даних від пропуску через брак часу.
Познач, чи можна повторити крок без втрати контексту.
Додай крок до списку наступної роботи.
Перевір, що звіт не створює хибного враження завершеності.
Оціни, чи пропуск змінює впевненість у результаті.
Познач, що саме залишилося неперевіреним.
Запропонуй спосіб закрити прогалину пізніше.
Не подавай частковий результат як повний.
Не приховуй пропуск у загальному звіті.
Відділи пропуск через брак доступу від пропуску через рішення.
Віддай список пропусків разом із їхнім впливом.
