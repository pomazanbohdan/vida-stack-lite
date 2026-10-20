---
instruction_id: write-tests-that-catch-breaks
title: "Пиши тести, які ловлять конкретну поломку"
summary: "Кожен тест має називати поломку, яку ловить, і перевіряти справжню поведінку, а не підміну чи текст джерела."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Ти пишеш, змінюєш або переглядаєш тест чи ризиковану логіку."
conditions_does_not_apply_when: "Тест уже названий, перевіряє справжню поведінку й пройшов перевірку мутацією."
artifact_contract_output_type: honest-test
artifact_contract_required_data:
  - названа поломка
  - незалежне очікування
  - перевірена реальна поведінка
  - перевірка мутацією
artifact_contract_verified_by: a realistic mutation of the production code fails at least one test
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/writing-good-tests.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
---

# Пиши тести, які ловлять конкретну поломку
Перед тілом тесту назви зміну в робочому коді, яка має його завалити.
Переконайся, що ця зміна є помилкою, а не навмисним рішенням.
Виводь очікуване значення незалежно від коду, який перевіряєш.
Використовуй літерали або вручну перевірені дані.
Не обчислюй очікування тим самим кодом або його помічниками.
Не пиши тест, який падає лише від зміни константи, тексту чи приватної структури.
Перевіряй поведінку, від якої залежить рішення, а не саме рішення.
Запускай артефакт і перевіряй його вивід, побічний ефект або код завершення.
Не перевіряй текст джерела замість роботи коду.
Перевіряй контракт на своїй межі, а не механіку чужої бібліотеки.
Твердження про підміну не доводить поведінку компонента.
Підмінюй лише повільну або зовнішню межу й зберігай те, від чого залежить тест.
Вивчай побічні ефекти справжнього методу перед заміною.
Відтворюй у підміні повну структуру даних, яку очікує код.
Тримай у робочому класі лише методи, потрібні самій програмі.
Винеси допоміжний код, потрібний лише тестам, у тестові утиліти.
Переходь до інтеграційного тесту, коли підготовка підміни перевищує логіку тесту.
Покрий типовий шлях і важливу межову умову.
Перевір подумки кілька реалістичних поломок: кожна має валити хоча б один тест.
У перегляді вважай знахідкою ризиковану логіку без тесту, який падає від її поломки.
Ризикованою вважай гілку, розбір, гроші, безпеку, запис даних і виправлення помилки.
Одного хорошого тесту достатньо; покриття саме по собі не є вимогою.
Визнай непокриту поведінку замість тесту, який нічого не ловить.
Заверши, коли кожен тест має названу поломку й перевіряє справжню поведінку.
