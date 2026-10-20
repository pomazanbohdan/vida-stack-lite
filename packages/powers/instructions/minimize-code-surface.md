---
instruction_id: minimize-code-surface
title: Мінімізуй поверхню зміни
summary: "Розв'язуй задачу найменшою повною зміною, повторно використовуючи наявні власники й перевірки."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: Ти плануєш або виконуєш зміну коду в межах погодженого запиту.
conditions_does_not_apply_when: Рішення ще не погоджене або потрібна окрема архітектурна робота.
artifact_contract_output_type: minimal-change
artifact_contract_required_data:
  - межі зміни
  - повторно використані власники
  - перевірка
  - відомі обмеження
artifact_contract_verified_by: focused tests and diff-scope review
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.agents/rules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.clinerules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.github/copilot-instructions.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.kiro/steering/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.qoder/rules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.windsurf/rules/ponytail.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=AGENTS.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-laziness-protocol/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-subtract-before-you-add/SKILL.md
status: active
revision: 6
---

# Мінімізуй поверхню зміни
Прочитай запит і точні межі дозволеної роботи.
Перевір код та перевірки, яких торкнеться зміна.
Знайди всі місця, де нова поведінка має діяти.
Переліч виклики, тести, фікстури, конфігурацію й експорти, до яких доходить зміна.
Перевір, що зміна може зламати для користувача: дані, які вона знищить або розкриє, і виклики, які перестануть працювати.
Лиши зайві можливості поза роботою й назви їх одним рядком.
Розпливчастий запит виконуй найменшою версією, яка робить основну роботу.
Перевір чинних власників тієї самої відповідальності.
Спершу спитай, чи річ узагалі потрібна.
Повторно використай наявну функцію, компонент або залежність.
Віддавай перевагу стандартній можливості перед новою залежністю.
Обери найменший варіант, який повністю задовольняє вимогу.
Обирай рішення, яке читач розуміє за один погляд.
Між варіантами однакового розміру бери той, що правильний на межових випадках.
Тримай значення в тій формі, яку вже дає платформа, і збережи наявні рівні, інтерфейси та домовленості коду.
Не додавай обгортку, перетворення типів, опцію, конфігурацію, шаблонний код чи заготовку «на потім».
Не додавай перемикачі й загальні абстракції без потреби.
Видалення краще за додавання.
Найкоротший робочий диф виграє лише тоді, коли ти знаєш усе, чого він має торкнутися; однорядковий вираз, який доводиться розшифровувати, не є коротким.
Не переробляй несуміжний код «заодно» і не змінюй файли поза погодженим обсягом.
Збережи перевірки, захист даних та обробку помилок.
Не скорочуй перевірку на межах довіри, обробку помилок, безпеку, доступність і калібрування під реальне обладнання.
Не скорочуй вимоги заради меншого дифа.
Для виправлення помилки переглянь усіх викликів функції й виправ причину один раз у спільному коді.
Коментуй лише те «чому», якого код не показує, одним рядком.
Для відомого обхідного рішення зафіксуй у коментарі його межу й умову перегляду.
Додай цільову перевірку для нетривіальної нової поведінки.
У перегляді шукай код, якого не має бути: мертвий код, невикористані опції, прапорці й конфігурацію, заготовки на майбутнє.
Шукай двох помічників з однією роботою: залиш один і назви шлях.
Шукай залежність там, де вистачить стандартної можливості або кількох рядків.
Шукай інтерфейс з однією реалізацією, фабрику з одним продуктом і обгортку, що лише передає виклик.
Шукай майже-копії, які мусять змінюватися разом.
Діли функцію, що робить кілька різних робіт, за роботою, а не за кількістю рядків, і не створюй помічників лише для скорочення.
Пропонуй найменше виправлення, яке працює, і віддавай перевагу тому, що видаляє код.
Назви в одному рядку менший повний варіант і дай власнику вибрати; якщо частина запиту не потрібна для потреби, запереч до початку роботи.
Переглянь диф на зайві файли та код і прибери рядки, не потрібні для повного результату.
Заверши відповідь одним-двома рядками: що пропустив або не перевірив і який ризик мусить знати власник.
Прибери мертвий код і надлишкові перевірки до побудови нового, а кожне рішення тримай в одному джерелі істини.
Заверши лише після повної перевірки погодженого обсягу.
