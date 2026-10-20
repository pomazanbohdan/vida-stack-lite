---
instruction_id: run-until-a-done-predicate
title: Працюй до виконання умови завершення
summary: "Сформулюй перевірювану умову завершення й повторюй цикл зміна-перевірка, доки вона не виконана або шлях не заблоковано."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: Робота виконується самостійно протягом кількох циклів без постійного нагляду.
conditions_does_not_apply_when: Кожен крок потребує окремого рішення людини.
artifact_contract_output_type: completion-loop
artifact_contract_required_data:
  - умова завершення
  - перевірка
  - історія циклів
  - причина зупинки
artifact_contract_verified_by: the done condition executed with a passing result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/02-poteto-mode.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/07-overnight.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/babysit.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/autonomous-run.md
status: active
revision: 1
---

# Працюй до виконання умови завершення
Сформулюй умову, за якої робота справді завершена.
Перевір умову командою або спостережуваним результатом.
Повторюй цикл: зміна, перевірка, рішення.
Обмеж кількість циклів, щоб не палити ресурси без результату.
Зберігай результат кожного циклу, щоб не повторювати роботу.
Змінюй підхід, якщо два цикли поспіль не дали прогресу.
Повідом про прогрес, коли цикл довгий.
Зупиняйся лише тоді, коли умова виконана або шлях заблокований.
Не вважай виконаним те, що виглядає завершеним.
Не розширюй умову посеред роботи без причини.
Запиши, чому цикл зупинився.
Повідом про блокування з конкретним питанням.
Не залишай роботу в стані, зрозумілому лише тобі.
Віддай результат і доказ виконання умови.
