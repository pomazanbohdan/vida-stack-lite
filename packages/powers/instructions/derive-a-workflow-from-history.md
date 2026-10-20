---
instruction_id: derive-a-workflow-from-history
title: Виводь робочий процес з історії
summary: Перетворюй повторювану послідовність дій на явний процес із умовами входу й перевірками.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: Однотипні задачі виконуються знову й знову з тими самими кроками.
conditions_does_not_apply_when: Задача унікальна й не повторюватиметься.
artifact_contract_output_type: workflow-spec
artifact_contract_required_data:
  - кроки
  - умови входу
  - перевірки
  - залежності від проєкту
artifact_contract_verified_by: the workflow executed end to end on one real task
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/automate-me/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-help/references/recipes.md
status: active
revision: 1
---

# Виводь робочий процес з історії
Збери повторювані дії з минулих задач.
Познач кроки, які щоразу виконуються однаково.
Знайди кроки, які часто забувають.
Перетвори послідовність на явний список із умовами входу.
Додай перевірку для кожного кроку, який може тихо зламатися.
Назви кроки, які залежать від конкретного проєкту.
Відділи те, що можна автоматизувати, від того, що потребує судження.
Запиши, хто запускає процес і що він отримує на виході.
Додай приклад невдалого запуску й те, як його розпізнати.
Скороти процес до кроків, без яких результат не відтворюється.
Познач кроки, які можна виконувати паралельно.
Перевір процес на одній реальній задачі.
Запиши, де процес не спрацював.
Віддай відтворюваний процес із умовами застосування.
