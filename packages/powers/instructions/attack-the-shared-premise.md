---
instruction_id: attack-the-shared-premise
title: Атакуй спільну передумову
summary: "Перевіряй припущення, на якому тримаються всі варіанти рішення, перш ніж обирати між ними."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "Кілька варіантів рішення виглядають різними, але спираються на одне припущення."
conditions_does_not_apply_when: Передумова вже перевірена й зафіксована як вимога.
artifact_contract_output_type: premise-check
artifact_contract_required_data:
  - передумова
  - контрприклад
  - наслідки
  - спосіб перевірки
artifact_contract_verified_by: the premise checked against observed data or code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-attack-the-premise/SKILL.md
status: active
revision: 1
---

# Атакуй спільну передумову
Знайди припущення, на якому тримається вся конструкція.
Перевір, чи воно справді істинне в поточних умовах.
Спитай, що станеться, якщо воно хибне.
Знайди спільну передумову в обох варіантах рішення.
Побудуй приклад, у якому вона не виконується.
Перевір передумову на даних, а не на думці більшості.
Познач, хто виграє від того, що передумова залишиться незмінною.
Сформулюй, за якої умови вона стане істинною знову.
Перевір, чи проблема зникне, якщо прибрати саму передумову.
Не приймай передумову лише тому, що її ніхто не оспорював.
Відділи технічну передумову від продуктової.
Запиши, які рішення доведеться переглянути.
Запропонуй найменшу перевірку, яка підтвердить або відкине передумову.
Віддай висновок про передумову й наслідки для плану.
