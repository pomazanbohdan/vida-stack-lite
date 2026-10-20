---
instruction_id: author-an-agent-skill
title: Пиши скіл для агента
summary: "Описуй скіл через ситуацію, результат і кроки, додаючи межі застосування та приклади."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "Ти створюєш або переписуєш інструкцію, яку агент завантажує для повторюваної роботи."
conditions_does_not_apply_when: "Потрібна одноразова підказка в розмові, а не повторюваний скіл."
artifact_contract_output_type: agent-skill
artifact_contract_required_data:
  - ситуація
  - результат
  - кроки
  - межі
  - приклади
artifact_contract_verified_by: the skill run on one task it should help and one it should ignore
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/authoring-a-skill.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/sharpen/SKILL.md
status: active
revision: 1
---

# Пиши скіл для агента
Почни з ситуації, у якій скіл має спрацювати.
Опиши результат, який агент має отримати.
Дай послідовність кроків, а не перелік фактів.
Назви умову, за якої скіл не застосовується.
Додай приклад вхідних даних і очікуваного виходу.
Прибери знання, які агент уже має.
Тримай інструкції короткими й однозначними.
Познач місця, де потрібне рішення людини.
Додай приклад типової помилки й спосіб її уникнути.
Назви, які інструменти скіл припускає наявними.
Перевір скіл на задачі, де він має допомогти.
Перевір скіл на задачі, де він має мовчати.
Онови скіл після першого реального застосування.
Віддай скіл із прикладами й межами застосування.
