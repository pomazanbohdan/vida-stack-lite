---
instruction_id: format-quality-findings
title: Подавай знахідки за впливом у фіксованій формі
summary: "Став правильність, безпеку, навантаження, тести, швидкість і ощадність у цьому порядку й описуй кожну знахідку чотирма частинами."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: Ти подаєш знахідки перегляду або аудиту.
conditions_does_not_apply_when: Знахідок немає.
artifact_contract_output_type: ranked-findings
artifact_contract_required_data:
  - групи знахідок
  - номери
  - назва з місцем
  - чотири частини
  - кількість поза звітом
artifact_contract_verified_by: "every finding has a location and all four parts, ordered by impact"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
---

# Подавай знахідки за впливом у фіксованій формі
Оцінюй знахідки в сталому порядку: правильність, безпека, поведінка під навантаженням, тести, швидкість, ощадність.
До обов'язкових віднеси помилку, дірку в безпеці, втрату даних і збій на очікуваному навантаженні.
До бажаних віднеси ризикований код без тесту, справжнє сповільнення, дублювання, функцію з кількома роботами й код, якого не має бути.
До дрібних віднеси невеликі прискорення й коротші форми.
Подавай найважливіше першим.
Пропускай порожню групу.
Нумеруй знахідки наскрізно через усі групи.
Дай кожній знахідці коротку назву й місце у вигляді файлу та рядків.
Поясни, що це за код і що він робить.
Опиши проблему: які вхідні дані або ситуація дають неправильний результат.
Запропонуй найменше виправлення, яке закриває проблему.
Назви, що станеться, якщо знахідку пропустити.
Тримай кожну частину в одному-двох коротких реченнях.
Для аудиту всього сховища обмеж звіт двадцятьма знахідками й скажи, скільки лишилося поза ним.
Звіт, який власник попросив, подавай повністю: не скорочуй знахідки.
Не пиши знахідку без назви й місця.
Не змішуй у знахідці кілька проблем.
Заверши, коли кожна знахідка має всі частини й стоїть на своєму місці за впливом.
