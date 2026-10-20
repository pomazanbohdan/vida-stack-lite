---
instruction_id: choose-user-experience-over-implementation
title: Обирай досвід користувача понад зручність реалізації
summary: "Будуй шлях користувача від його мети й прибирай кроки, що існують лише для зручності коду."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Рішення змінює те, як людина взаємодіє з продуктом."
conditions_does_not_apply_when: Зміна суто внутрішня й не спостерігається користувачем.
artifact_contract_output_type: user-path
artifact_contract_required_data:
  - мета користувача
  - кроки
  - прибрані кроки
  - компроміси
artifact_contract_verified_by: the path walked through in the running product
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-experience-first/SKILL.md
status: active
revision: 1
---

# Обирай досвід користувача понад зручність реалізації
Почни з того, що користувач намагається зробити.
Опиши найкоротший шлях до цього результату.
Порахуй кроки, які користувач робить вручну.
Перевір, чи можна об'єднати два кроки в один.
Познач місце, де користувач може втратити введене.
Спитай користувача, який крок для нього найважчий.
Прибери крок, який існує лише для зручності коду.
Перевір, що повідомлення про помилку допомагає виправити дію.
Зроби стан системи видимим без окремого запиту.
Передбач поведінку для повільного й повторного натискання.
Не змушуй користувача вчити внутрішню модель.
Перевір сценарій на реальному користувачі або на собі в його ролі.
Запиши компроміс, якщо реалізація не дозволяє ідеальний досвід.
Віддай рішення з описом користувацького шляху.
