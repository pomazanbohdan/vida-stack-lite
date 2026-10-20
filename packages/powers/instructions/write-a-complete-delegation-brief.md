---
instruction_id: write-a-complete-delegation-brief
title: Пиши повний бриф для делегованої роботи
summary: "Дай виконавцю результат, контекст, межі, критерій приймання й формат звіту без потреби щось перепитувати."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "Ти передаєш роботу іншому агенту, людині або окремому запуску."
conditions_does_not_apply_when: Робота виконується в цій самій розмові без передачі контексту.
artifact_contract_output_type: delegation-brief
artifact_contract_required_data:
  - результат
  - контекст
  - межі
  - критерій приймання
  - формат звіту
artifact_contract_verified_by: the delegate completes the task without a clarifying question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=agents/poteto-agent.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/templates/reproduce-automation-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/templates/triage-automation-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/architect/references/runner-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/references/reviewer-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-help/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-help/references/prompting.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/investigator-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/synthesizer-prompt.md
status: active
revision: 1
---

# Пиши повний бриф для делегованої роботи
Сформулюй результат, який має отримати виконавець.
Додай контекст, якого немає в репозиторії або в поточній розмові.
Переліч файли й межі, у яких дозволено працювати.
Опиши, як перевірити результат і що вважається завершенням.
Дай приклад бажаного формату звіту.
Назви відомі обмеження й те, що вже пробували.
Вкажи, які рішення виконавець може ухвалити сам.
Додай приклад невдалого результату, якого треба уникати.
Познач, кому повідомити про завершення.
Вкажи, коли зупинитися й запитати.
Прибери з брифу все, що виконавець може знайти сам.
Перевір бриф на двозначності: кожне слово має одне тлумачення.
Додай посилання на джерела замість переказу.
Зроби бриф самодостатнім для нового учасника.
Віддай бриф разом із критерієм приймання.
