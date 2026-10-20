---
instruction_id: state-goal-check-and-proof
title: "Покажи мету, перевірку й доказ"
summary: "Звітуй кінцевим станом, перевіркою на його межі й покажчиком на доказ, а не переліком виконаних дій."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: Ти вже маєш результат перевірки й звітуєш про досягнутий кінцевий стан.
conditions_does_not_apply_when: "Перевірку ще не виконано або потрібно лише вирішити, чи можна заявляти завершення."
artifact_contract_output_type: goal-proof
artifact_contract_required_data:
  - мета
  - межа перевірки
  - фактичний вивід
  - залишковий ризик
artifact_contract_verified_by: the reported check output reproduced by the reader
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/show-me-your-work/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-outcome-oriented-execution/SKILL.md
status: active
revision: 2
---

# Покажи мету, перевірку й доказ
Сформулюй мету роботи одним реченням.
Назви, який спостережуваний результат доводить досягнення.
Покажи команду або дію, яка це перевіряє.
Додай фактичний вивід, а не переказ.
Вкажи, коли саме виконано перевірку.
Назви межу перевірки, на якій доводиш кінцевий стан.
Познач, що саме залишилося поза перевіркою.
Відділи виконані дії від досягнутого результату.
Не подавай план як доказ.
Не подавай відсутність помилки як доказ.
Додай посилання на файли й рядки, де видно зміну.
Запиши результат перевірки як стан: пройдено, відхилено, невизначено.
Скажи прямо, якщо мета досягнута частково.
Віддай мету, перевірку, вивід і залишковий ризик.
