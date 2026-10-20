---
instruction_id: reproduce-defect-before-fixing
title: Відтвори дефект до виправлення
summary: "Отримай стабільне відтворення й автоматичний тест, що падає, перш ніж змінювати код."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: Є повідомлення про дефект або спостережувана неправильна поведінка.
conditions_does_not_apply_when: "Потрібна нова можливість, а не виправлення наявної поведінки."
artifact_contract_output_type: reproduction
artifact_contract_required_data:
  - мінімальний вхід
  - очікуваний результат
  - фактичний результат
  - тест
artifact_contract_verified_by: the reproduction test failing before the fix and passing after it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/bug-fix.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/reproduce-and-fix-issues/SKILL.md
status: active
revision: 1
---

# Відтвори дефект до виправлення
Отримай найменший вхід, на якому дефект видно.
Запусти його й переконайся, що результат неправильний.
Запиши очікуваний і фактичний результат.
Звузь сценарій, доки не залишиться одна причина.
Перевір, чи причина не залежить від конкретного середовища.
Збережи вхідні дані, на яких дефект відтворюється.
Познач, які спостереження підтверджують саме цю причину.
Перевір, чи дефект повторюється стабільно.
Додай автоматичний тест, який падає саме з цієї причини.
Виправ причину, а не симптом.
Запусти тест і переконайся, що він проходить.
Перевір, що тест падає без виправлення.
Проганяй суміжні сценарії після виправлення.
Не виправляй дефект, який не вдалося відтворити; спершу збери дані.
Віддай відтворення, причину й доказ виправлення.
