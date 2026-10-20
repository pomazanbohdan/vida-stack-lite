---
instruction_id: investigate-read-only
title: "Досліджуй, не змінюючи код"
summary: "Відповідай на питання про систему читанням і безпечними командами, залишаючи код недоторканим."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: "Потрібно зрозуміти, як система працює або чому поведінка саме така."
conditions_does_not_apply_when: Рішення вже ухвалене й потрібна зміна коду.
artifact_contract_output_type: investigation-answer
artifact_contract_required_data:
  - питання
  - карта шляху
  - докази
  - невідоме
artifact_contract_verified_by: read-only commands and file references cited in the answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/03-understand.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/how/references/explorer-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/investigation.md
status: active
revision: 1
---

# Досліджуй, не змінюючи код
Почни з питання, на яке треба відповісти.
Склади карту входів, виходів і власників коду.
Читай код у напрямку виконання, а не за абеткою.
Познач місця, де припущення розходиться з реальністю.
Запускай лише ті команди, що нічого не змінюють.
Перевір, чи команда не створює файлів і не змінює базу.
Познач припущення, які треба підтвердити перед відповіддю.
Повернися до питання, якщо знайшов важливий суміжний факт.
Збирай докази: рядки, журнали, результати запитів.
Відділяй побачене від здогаду.
Зупинись, коли відповідь підтверджена двома джерелами.
Не виправляй знайдене під час дослідження.
Запиши, що залишилося невідомим.
Віддай відповідь із посиланнями на місця в коді.
