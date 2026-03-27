# gstack — Архитектурный анализ

## Зачем gstack существует

Garry Tan (президент YC) строит веб-продукт. Ему нужен не "помощник с кодом",
а **полный цикл**: от идеи до продакшена с мониторингом. gstack — это его
собственный AI-engineering workflow, построенный под его стек и его процесс.

## Философия (ETHOS.md)

### 1. Boil the Lake

AI делает маржинальную стоимость ~0. Когда выбор между A (полная реализация, 150 строк)
и B (90%, 80 строк) — **всегда выбирай A**. Дельта в 70 строк стоит секунды с AI.

- **Lake** (кипятимое): 100% покрытие тестами, все edge cases, полная обработка ошибок
- **Ocean** (не кипятимое): переписать всю систему с нуля, multi-quarter миграция
- Shortcut — это **неправильный** выбор, потому что полная реализация стоит минуты

### 2. Search Before Building

Три слоя знания:
1. **Tried & True** — стандартные паттерны, built-in фреймворка
2. **New & Popular** — блоги, тренды (проверяй скептически — люди подвержены мании)
3. **First Principles** — собственные наблюдения из рассуждений о конкретной проблеме

Ценить Layer 3 превыше всего. Eureka moment: когда first-principles показывает,
что конвенциональный подход неправильный.

### 3. Build for Yourself

gstack существует потому что его создатель нуждался в нём. Каждая фича решает
реальную проблему, а не гипотетическую.

## Почему шаблоны (.tmpl)

### Проблема
28 скиллов. Browse CLI часто меняется (новые команды, флаги). Если SKILL.md
написаны руками — они устаревают. AI вызывает несуществующую команду → ошибка.

### Решение: один источник правды

```
SKILL.md.tmpl (человек пишет логику + {{PLACEHOLDERS}})
        ↓
gen-skill-docs.ts (читает metadata из source code)
        ↓
SKILL.md (сгенерирован, закоммичен, версионирован)
```

Плейсхолдеры:
- `{{COMMAND_REFERENCE}}` ← из `commands.ts` (если команды нет в коде — её нет в доках)
- `{{SNAPSHOT_FLAGS}}` ← из `snapshot.ts` (флаги снапшотов)
- `{{PREAMBLE}}` ← универсальный стартовый блок для всех скиллов
- `{{QA_METHODOLOGY}}` ← шарится между `/qa` и `/qa-only`
- `{{DESIGN_METHODOLOGY}}` ← шарится между `/plan-design-review` и `/design-review`
- `{{BASE_BRANCH_DETECT}}` ← определяет main/master динамически

### Почему коммитится, а не генерируется в runtime?
1. Claude читает SKILL.md при загрузке скилла — build step невозможен
2. CI валидирует свежесть: `gen:skill-docs --dry-run && git diff --exit-code`
3. Git blame показывает когда команда была добавлена

## Почему CLI и бинарники

### Проблема
Некоторые вещи AI не может сделать быстро сам:
- Запустить и держать Chromium daemon
- Расшифровать cookies из macOS Keychain
- Парсить accessibility tree за 100ms
- Атомарно читать/писать state файлы

### Решение: скомпилированные бинарники

| Бинарник | Что делает |
|----------|-----------|
| `browse` | Headless browser CLI. `$B snapshot`, `$B click @e3` |
| `find-browse` | Находит установленные браузеры, расшифровывает cookies |
| `gstack-config` | Читает/пишет `~/.gstack/config.yaml` |
| `gstack-repo-mode` | Solo vs collaborative detection (90 дней git history) |
| `gstack-update-check` | Проверка новых версий |
| `gstack-slug` | Repository slug из git remote URL |
| `gstack-telemetry-log` | Аналитика в `~/.gstack/analytics/` |

### Почему Bun (не Node.js)?
1. **Compiled binaries** — `bun build --compile` → один файл ~58MB, без node_modules
2. **Native SQLite** — cookie decryption без native addons
3. **Native TypeScript** — source files запускаются напрямую, без компиляции

### Browser daemon модель

```
CLI (thin client)
  → читает .gstack/browse.json (pid, port, bearer token)
  → POST /command на localhost:PORT
  → возвращает plain text

Server (Bun HTTP)
  → маршрутизирует команды в Playwright
  → auto-start при первом вызове
  → auto-shutdown через 30 мин idle

Chromium (headless)
  → persistent tabs, cookies, localStorage
```

Первый вызов: ~3 сек. Каждый следующий: ~100-200ms. Состояние сохраняется.

### Ref system (адресация элементов)

```
$B snapshot -i  →  accessibility tree  →  @e1, @e2, @e3...
$B click @e3    →  lookup Locator      →  locator.click()
```

Почему не CSS-селекторы? Потому что:
- CSP блокирует DOM-мутации
- React/Vue/Svelte hydration стирает injected атрибуты
- Shadow DOM не модифицируется снаружи
- Playwright Locators — внешние к DOM, работают через accessibility tree

## Preamble — зачем bash в начале каждого скилла

Каждый SKILL.md начинается с bash-блока (генерируется из `{{PREAMBLE}}`):

```bash
_BRANCH=$(git branch --show-current)     # текущая ветка
REPO_MODE=solo|collaborative             # из gstack-repo-mode
_SESSIONS=2                              # активные gstack сессии
_PROACTIVE=true                          # предлагать скиллы?
_LAKE_SEEN=yes                           # "Boil the Lake" intro показан?
TELEMETRY=off                            # аналитика
```

Скилл использует эти данные для решений:
- Solo repo → быстрый QA (critical/high only)
- Collaborative → полный QA + документация
- 3+ сессий → ELI16 mode (больше контекста в каждом ответе)
- Первый запуск → показать Boil the Lake intro, спросить про telemetry

**Preamble-Tier system:**
- Tier 1 (lightweight): `/browse`, `/benchmark` — ~1s
- Tier 2 (moderate): `/investigate`, `/retro` — ~2-3s
- Tier 3 (heavy): `/codex`, `/design-consultation` — ~5-10s
- Tier 4 (critical): `/ship`, `/review`, `/qa` — gate merge decisions

## 28 скиллов и их flow

### Полный цикл: идея → продакшен

```
/office-hours        → YC diagnostic, founder-level feedback
    ↓
/plan-ceo-review     → CEO rethink: vision sound?
    ↓
/plan-design-review  → Design architect: architecture sound?
    ↓
/plan-eng-review     → Engineering: implementation plan sound?
    ↓
[пишешь код]
    ↓
/review              → Staff engineer pre-landing review
    ↓
/qa                  → QA + auto-fix loop (headless browser)
    ↓
/ship                → tests → VERSION bump → CHANGELOG → PR
    ↓
/land-and-deploy     → merge → deploy → verify
    ↓
/canary              → post-deploy monitoring
    ↓
/document-release    → обновить документацию
    ↓
/retro               → недельная ретроспектива
```

`/autoplan` объединяет CEO → design → eng review в один запуск.

### Safety guardrails

| Скилл | Что делает |
|-------|-----------|
| `/careful` | Предупреждает перед `rm -rf`, `DROP TABLE`, `force-push` |
| `/freeze` | Ограничивает редактирование одной директорией |
| `/guard` | Комбинирует `/careful` + `/freeze` |

Реализованы через **Claude Code hooks** (PreToolUse), не просто инструкции.

### Специализированные

| Скилл | Что делает |
|-------|-----------|
| `/investigate` | Systematic root-cause debugging (4 фазы) |
| `/cso` | OWASP Top 10 + STRIDE security audit |
| `/benchmark` | Performance regression detection |
| `/codex` | Multi-AI second opinion через OpenAI Codex CLI |
| `/design-consultation` | Design system с нуля |
| `/design-review` | Visual audit + auto-fix |
| `/browse` | Headless browser для QA и dogfooding |

## Паттерны, которые делают скиллы эффективными

### 1. State extraction через preamble (не инференс)

AI **никогда не угадывает** контекст. Preamble bash-блок собирает всё:
ветку, repo mode, количество сессий, конфиг. Claude получает факты, не догадки.

### 2. Natural language для логики, bash для execution

Каждый bash-блок выполняется в отдельном shell — переменные **не сохраняются**.
Состояние передаётся через prose:

```
Step 1: запусти `git branch --show-current`
Step 2: если ветка из Step 1 — main, сделай X. Иначе — Y.
```

### 3. Numbered decision steps вместо nested if/else

**Плохо:**
```bash
if [ condition1 ]; then
  if [ condition2 ]; then
    action
  fi
fi
```

**Хорошо:**
```
1. Если [condition1], перейди к шагу 2.
2. Если [condition2], сделай X.
3. Иначе сделай Y.
```

LLM парсит prose лучше, чем вложенный bash.

### 4. One decision per AskUserQuestion

Никогда не батчить вопросы. Каждый вопрос:
1. **Re-ground** — проект, ветка, текущий план (1-2 предложения)
2. **Simplify** — в чём проблема, без жаргона
3. **Recommend** — с reasoning и `Completeness: X/10`
4. **Options** — A, B, C (с effort: `human ~X days / CC ~Y min`)

### 5. Completeness framing (не time framing)

```
A) Happy path only (Completeness: 5/10, error handling deferred)
B) Full implementation + tests + edge cases (Completeness: 10/10)
   Effort: human ~2 days / CC ~45 min
```

AI оптимизирует на completeness, не на время. С AI completeness почти бесплатна.

### 6. Escalation protocol (не бесконечные retry)

После 3 неудачных попыток:
```
STATUS: BLOCKED
REASON: [1-2 предложения]
ATTEMPTED: [что пробовали]
RECOMMENDATION: [следующий шаг для пользователя]
```

### 7. Evidence-based recommendations

Не "дизайн плохой". А:
"3 anti-patterns: (1) Generic hero copy — 'Unlock the power of...'.
(2) 3-column feature grid — THE most recognizable AI layout.
(3) Centered everything. Fixes: [конкретные действия]. Effort: CC ~30 min."

### 8. AI Slop Blacklist (для design скиллов)

10 запрещённых паттернов:
- Purple gradients
- 3-column feature grid с иконками в цветных кругах
- Centered everything
- Bubbly border-radius
- Decorative blobs, wavy SVGs
- Emoji как design elements
- Generic hero copy ("Welcome to X", "Unlock the power")

### 9. Platform-agnostic: никогда не хардкодить

gstack **не знает** твой стек:
1. Читает CLAUDE.md проекта (test command, deploy command)
2. Если нет — спрашивает пользователя
3. Записывает ответ в CLAUDE.md навсегда

Работает с любым стеком: Next.js, Python, Go, Rust.

## Что ценно для rkstack

### Скиллы для заимствования
- **review** — PR review (нет в superpowers)
- **ship** — ship workflow (нет в superpowers)
- **investigate** — debugging (сравнить с superpowers systematic-debugging)
- **cso** — security audit (нет в superpowers)
- **retro** — retrospective (нет в superpowers)
- **guard/careful/freeze** — safety (нет в superpowers)

### Паттерны для заимствования
- Preamble system (state extraction перед каждым скиллом)
- AskUserQuestion format (re-ground → simplify → recommend → options)
- Completeness framing
- Escalation protocol
- Platform-agnostic config через CLAUDE.md

### Что НЕ переносится
- Browse CLI (бинарник, нужен Playwright + Bun)
- Template system (у нас свой build через rkbuild)
- Telemetry (наша система проще)
- gstack-specific скрипты в `bin/`
