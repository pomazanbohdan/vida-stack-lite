---
instruction_id: offer-context-recon
title: Запропонуй огляд наявних матеріалів
summary: "Коли огляд допоможе, запропонуй перевірити код, документи або дані й назви, що саме шукатимеш."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "Для рішення бракує фактів, які можна знайти в наявних матеріалах."
conditions_does_not_apply_when: Потрібні факти вже надані або огляд не змінить рішення.
artifact_contract_output_type: recon-proposal
artifact_contract_required_data:
  - брак фактів
  - що оглянути
  - що шукати
  - згода
artifact_contract_verified_by: owner approves the recon scope
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/brainstorming/SKILL.md
status: active
revision: 1
---

# Запропонуй огляд наявних матеріалів
Визнач, яких фактів бракує для рішення.
Запропонуй оглянути код, документи, дані або зовнішні джерела.
Назви, що саме шукатимеш.
Поясни, як результат змінить рішення.
Дочекайся згоди власника.
Оглянь лише погоджені матеріали.
Відділяй знайдене від припущень.
Не використовуй огляд для розширення обсягу.
Не змінюй знайдені матеріали.
Повідом, що знайдено і що не знайдено.
Повернися до запитань із новими фактами.
Не вважай відсутність матеріалу доказом відсутності потреби.
Онови розуміння після огляду.
Запиши джерела, на які спираєшся.
Зупини огляд, коли питання закрито.
