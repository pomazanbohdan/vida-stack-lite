---
instruction_id: pause-work-with-a-handoff
title: Зупиняй роботу з передачею стану
summary: "Залишай роботу в стані, з якого наступник почне без здогадів і без втрати перевіреного результату."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: Ти зупиняєш роботу до завершення й повернешся пізніше або передаєш її іншому.
conditions_does_not_apply_when: Робота завершена й результат уже прийнятий.
artifact_contract_output_type: handoff-note
artifact_contract_required_data:
  - зроблено
  - перевірено
  - стан
  - відкриті питання
  - наступний крок
artifact_contract_verified_by: a fresh session resumes from the note without asking questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/pause-safely.md
status: active
revision: 1
---

# Зупиняй роботу з передачею стану
Визнач точку, у якій роботу безпечно зупинити.
Зафіксуй, що вже зроблено й що перевірено.
Опиши поточний стан гілки або робочої теки.
Переліч відкриті питання й рішення, які чекають.
Дай наступний крок так, щоб його можна було почати без тебе.
Збережи команди, які треба повторити.
Познач незакомічені зміни й те, чи їх можна відкинути.
Опиши, як перевірити, що стан відновлено правильно.
Вкажи, які інструменти й версії потрібні для продовження.
Попередь про ризик, якщо роботу відновлять пізніше.
Прибери тимчасові файли, які не потрібні наступнику.
Не залишай процес, що споживає ресурси.
Перевір, що переданий стан відтворюється з нуля.
Віддай коротку записку про стан і наступний крок.
