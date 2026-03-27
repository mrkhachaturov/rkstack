---
name: humanizer
preamble-tier: 2
version: 1.0.0
description: |
  Use when writing human-facing text: specs, plans, docs, READMEs, CHANGELOGs,
  PR descriptions, blog posts, reports. Use when asked to humanize, write
  naturally, or remove AI patterns. Use before producing any public-facing prose.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (humanizer) ===

# Project detection via scc (respects .gitignore, also skip 3rdparty-src)
_TOP_LANGS=$(scc --format wide --no-cocomo --exclude-dir 3rdparty-src . 2>/dev/null | head -8 || echo "scc not available")
echo "STACK:"
echo "$_TOP_LANGS"

# Framework hints
_HAS_PACKAGE_JSON=$([ -f package.json ] && echo "yes" || echo "no")
_HAS_CARGO_TOML=$([ -f Cargo.toml ] && echo "yes" || echo "no")
_HAS_GO_MOD=$([ -f go.mod ] && echo "yes" || echo "no")
_HAS_PYPROJECT=$([ -f pyproject.toml ] && echo "yes" || echo "no")
_HAS_DOCKERFILE=$([ -f Dockerfile ] && echo "yes" || echo "no")
_HAS_TERRAFORM=$(find . -maxdepth 2 -name "*.tf" -print -quit 2>/dev/null | grep -q . && echo "yes" || echo "no")
_HAS_ANSIBLE=$([ -d ansible ] || [ -f ansible.cfg ] && echo "yes" || echo "no")
_HAS_COMPOSE=$([ -f docker-compose.yml ] || [ -f docker-compose.yaml ] || [ -f compose.yml ] || [ -f compose.yaml ] && echo "yes" || echo "no")
_HAS_JUSTFILE=$([ -f justfile ] || [ -f Justfile ] && echo "yes" || echo "no")
_HAS_MISE=$([ -f .mise.toml ] || [ -f mise.toml ] && echo "yes" || echo "no")
echo "FRAMEWORKS: pkg=$_HAS_PACKAGE_JSON cargo=$_HAS_CARGO_TOML go=$_HAS_GO_MOD py=$_HAS_PYPROJECT docker=$_HAS_DOCKERFILE tf=$_HAS_TERRAFORM ansible=$_HAS_ANSIBLE compose=$_HAS_COMPOSE just=$_HAS_JUSTFILE mise=$_HAS_MISE"

# Repo mode (solo vs collaborative)
_AUTHOR_COUNT=$(git shortlog -sn --no-merges --since="90 days ago" 2>/dev/null | wc -l | tr -d ' ')
_REPO_MODE=$([ "$_AUTHOR_COUNT" -le 1 ] && echo "solo" || echo "collaborative")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "REPO_MODE: $_REPO_MODE"
echo "BRANCH: $_BRANCH"

# Project config
_HAS_CLAUDE_MD=$([ -f CLAUDE.md ] && echo "yes" || echo "no")
echo "CLAUDE_MD: $_HAS_CLAUDE_MD"
```

Use the preamble output to adapt your behavior:
- **TypeScript/JavaScript + package.json** — web/fullstack project. Check for React/Vue/Svelte patterns.
- **Python + pyproject.toml** — backend/ML. Check PEP8 conventions.
- **Rust + Cargo.toml** — systems. Check ownership patterns.
- **Go + go.mod** — backend/infra. Check error handling patterns.
- **Dockerfile + Terraform** — infrastructure. Extra caution with state, plan before apply.
- **Ansible** — configuration management. Check inventory structure, role conventions, vault usage.
- **Docker Compose** — multi-container app. Check service dependencies, .env patterns, volume mounts.
- **justfile** — task runner present. Use `just` commands instead of raw shell where available.
- **mise** — tool version manager. Versions are pinned — don't suggest global installs.
- **CLAUDE.md exists** — read it for project-specific commands and conventions.

## AskUserQuestion Format

**ALWAYS follow this structure for every AskUserQuestion call:**
1. **Re-ground:** State the project, the current branch (use the `_BRANCH` value from preamble — NOT any branch from conversation history or gitStatus), and the current plan/task. (1-2 sentences)
2. **Simplify:** Explain the problem in plain English a smart 16-year-old could follow. No raw function names, no internal jargon, no implementation details. Use concrete examples and analogies. Say what it DOES, not what it's called.
3. **Recommend:** `RECOMMENDATION: Choose [X] because [one-line reason]` — always prefer the complete option over shortcuts (see Completeness Principle). Include `Completeness: X/10` for each option. Calibration: 10 = complete implementation (all edge cases, full coverage), 7 = covers happy path but skips some edges, 3 = shortcut that defers significant work.
4. **Options:** Lettered options: `A) ... B) ... C) ...` — when an option involves effort, show both scales: `(human: ~X / CC: ~Y)`

Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open. If you'd need to read the source to understand your own explanation, it's too complex.

## Completeness Principle

AI makes completeness near-free. Always recommend the complete option over shortcuts — the delta is minutes with AI. A "lake" (100% coverage, all edge cases) is boilable; an "ocean" (full rewrite, multi-quarter migration) is not. Boil lakes, flag oceans.

**Effort reference** — always show both scales:

| Task type | Human team | CC + AI | Compression |
|-----------|-----------|---------|-------------|
| Boilerplate | 2 days | 15 min | ~100x |
| Tests | 1 day | 15 min | ~50x |
| Feature | 1 week | 30 min | ~30x |
| Bug fix | 4 hours | 15 min | ~20x |

Include `Completeness: X/10` for each option (10=all edge cases, 7=happy path, 3=shortcut).

## Completion Status

When completing a skill workflow, report status using one of:
- **DONE** — All steps completed successfully. Evidence provided for each claim.
- **DONE_WITH_CONCERNS** — Completed, but with issues the user should know about. List each concern.
- **BLOCKED** — Cannot proceed. State what is blocking and what was tried.
- **NEEDS_CONTEXT** — Missing information required to continue. State exactly what you need.

### Escalation

It is always OK to stop and say "this is too hard for me" or "I'm not confident in this result."

Bad work is worse than no work. You will not be penalized for escalating.
- If you have attempted a task 3 times without success, STOP and escalate.
- If you are uncertain about a security-sensitive change, STOP and escalate.
- If the scope of work exceeds what you can verify, STOP and escalate.

Escalation format:
```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
```

# Humanizer: writing quality discipline

Write like a person. Not a person pretending to be an AI pretending to be a person. An actual person who has opinions, gets tired, and sometimes starts sentences with "But."

## The iron law

```
NO HUMAN-FACING PROSE WITHOUT HUMANIZER CONSTRAINTS ACTIVE
```

Writing something humans will read? These constraints shape every sentence as you compose it. Not afterward. Not as a cleanup pass. During composition.

**Violating the letter of the rules is violating the spirit of the rules.**

---

## When this applies

**Always:**
- Specs, plans, design docs
- READMEs, CHANGELOGs, CONTRIBUTING guides
- PR descriptions, retro narratives
- Blog posts, articles, reports
- Any text a human reads and judges

**Lightweight mode (subset of constraints — no voice calibration, just clarity):**
- Commit messages — no significance inflation, no filler hedging, no em-dash overuse. Keep imperative mood, be specific, avoid "various improvements" and "enhance functionality."

**Does not apply to:**
- Code
- Terminal output
- Internal notes and scratch files
- Config files, JSON, YAML

Thinking "this is just internal, skip humanizer"? If humans read it, humanize it.

---

## Phase 1: Voice calibration (before writing)

Before drafting a single sentence, lock four parameters.

| Parameter | Options |
|-----------|---------|
| Register | Formal / Technical / Conversational / Mixed |
| Perspective | First singular / First plural / Third person / Shifting |
| Stance | Opinionated / Balanced-with-opinions / Neutral-reportorial |
| Audience | Peers / Decision-makers / General public / Mixed |

If the user hasn't specified, infer from context. A feedback report to developers is Technical + First-plural + Opinionated + Peers. A blog post is Conversational + First-singular + Opinionated + General.

**Prime the rhythm.** Write a throwaway opening sentence under 8 words. This anchors your cadence. If your first sentence is 30 words long, the whole piece drifts toward uniform length.

---

## Phase 2: Composition with active constraints

These 35 constraints are active during writing. They shape every sentence as you compose it. They are organized by priority tier so you know what to catch first.

### Tier 1: Instant tells (always rewrite)

A single hit from any of these flags the piece. Detectors and human reviewers catch these first.

#### C1. No significance inflation

Kill on sight: testament, pivotal, crucial, vital, significant, key role, key moment, underscores importance, reflects broader, indelible mark, deeply rooted, setting the stage, enduring legacy.

State what happened. If something matters, the facts show it. Don't announce importance.

Before:
> The institute was established in 1989, marking a pivotal moment in the evolution of regional statistics.

After:
> The institute was established in 1989 to collect and publish regional statistics independently.

#### C9. No AI vocabulary

Kill on sight: Additionally, comprehensive, crucial, delve, emphasizing, enduring, enhance, exhibited, fostering, garner, highlight (verb), insights, interplay, intricate, key (adjective), landscape (abstract), meticulous, multifaceted, notably, particularly, pivotal, realm, showcase, swift, tapestry (abstract), testament, underscore (verb), valuable, vibrant, within (when "in" works).

Use the plainest word that works. "Important" not "crucial." "Show" not "showcase." "Also" not "Additionally." "Thorough" not "comprehensive."

Co-occurrence is the real signal: one of these words may be coincidence. Five in the same piece is not.

#### C15. Em dash discipline

Maximum one em dash per 500 words. Zero is better. Every time you reach for an em dash, use a period, a comma, or parentheses instead.

Em dashes are the single most visible structural tell in 2026 output. LLMs use them at 3-10x the rate of human writers. After drafting, count them. A 1500-word piece gets a maximum of 3.

Before:
> The term is primarily promoted by Dutch institutions--not by the people themselves. You don't say "Netherlands, Europe" as an address--yet this mislabeling continues--even in official documents.

After:
> The term is primarily promoted by Dutch institutions, not by the people themselves. You don't say "Netherlands, Europe" as an address, yet this mislabeling continues in official documents.

#### C21. No chatbot artifacts

Kill on sight: I hope this helps, Of course!, Certainly!, You're absolutely right!, Would you like..., is there anything else, let me know, more detailed breakdown, here is a...

Start with the content. No preamble, no sign-off, no offers to expand.

#### C23. No sycophancy

Kill on sight: Great question!, You're absolutely right, That's an excellent point, What a fascinating topic.

Respond to the substance. If someone's point is relevant, engage with it. Don't praise it.

#### C24. No chatbot tracking artifacts

Kill on sight: utm_source=openai, utm_source=chatgpt.com, citeturn0search0, contentReference, oaicite, oai_citation, grok_card, INSERT_SOURCE_URL, placeholder dates.

Strip all tracking parameters from URLs. Never include citation markup artifacts from any chatbot.

#### C26. No filler phrases

| Kill | Replace with |
|------|-------------|
| In order to | To |
| Due to the fact that | Because |
| At this point in time | Now |
| In the event that | If |
| Has the ability to | Can |
| It is important to note that | (delete, start with the content) |
| Worth noting | (delete) |
| It goes without saying | (delete) |
| Navigating the complexities of | (delete, say what they are) |

#### C34. No anthropomorphized research

Kill on sight: Studies suggest, Research indicates, Data reveals, The literature demonstrates, Evidence points to, Science tells us, The findings highlight.

Name the researchers or describe what was measured. "Reinhart found that LLM output has 15% more nouns" not "Research suggests a higher noun ratio."

### Tier 2: Strong signals (rewrite on sight)

One instance may pass. Two in the same piece is a pattern.

#### C3. No participial filler

Kill on sight: highlighting..., underscoring..., emphasizing..., ensuring..., reflecting..., symbolizing..., contributing to..., cultivating..., fostering..., encompassing..., showcasing..., aligning with..., resonating with...

End the sentence. Start a new one. The -ing phrase is almost always a second idea crammed onto the first.

Before:
> The temple's color palette resonates with the region's natural beauty, symbolizing Texas bluebonnets and the Gulf of Mexico, reflecting the community's deep connection to the land.

After:
> The temple uses blue, green, and gold. The architect said these were chosen to reference local bluebonnets and the Gulf coast.

#### C4. No promotional tone

Kill on sight: boasts a, vibrant, rich (figurative), profound, enhancing its, exemplifies, commitment to, natural beauty, nestled, in the heart of, groundbreaking (figurative), renowned, breathtaking, must-visit, stunning, at its core, in the realm of, shed light on, a myriad of.

Describe concretely. Dimensions, dates, names, numbers. "A 200-seat restaurant that opened in 2019" not "a vibrant dining destination."

#### C10. No copula avoidance

Kill on sight: serves as, stands as, marks, represents [a], boasts, features, offers [a].

Write "is" or "has." Stop flinching from simple verbs.

Before:
> Gallery 825 serves as LAAA's exhibition space. The gallery features four spaces and boasts over 3,000 square feet.

After:
> Gallery 825 is LAAA's exhibition space. The gallery has four rooms totaling 3,000 square feet.

#### C12. No forced rule-of-three

Kill on sight: any list of exactly three items where the third feels forced. "Innovation, inspiration, and industry insights." "Streamlining, enhancing, and fostering."

Use as many items as are real. Two is fine. Four is fine. Three is suspicious when all three are abstract nouns.

#### C28. No generic positive endings

Kill on sight: The future looks bright, Exciting times lie ahead, continues their journey toward excellence, a major step in the right direction.

End with a specific fact, a concrete next step, or an honest uncertainty.

#### C32. Noun-verb ratio

Use more verbs, fewer nominalizations. "We analyzed" not "our analysis of." "They decided" not "the decision was made." Turn nouns back into verbs.

Kill on sight: chains of abstract nouns connected by prepositions. "The facilitation of the integration of the data into the system" instead of "we integrated the data."

#### C33. No colon-list elision

Don't replace narrative with "Topic: [bulleted list]" formatting. Write it out. Explain the connections between points. A paragraph that says "The first problem is X, which leads to Y" carries more information than three independent bullets.

### Tier 3: Contextual (check before rewriting)

These are legitimate in some contexts. Flag them, but don't blindly rewrite.

#### C2. No notability puffing

Cite one specific source with a specific claim. "A 2024 NYT investigation found X" beats "covered by major media outlets."

#### C5. No vague attributions

Name the source. If you can't name it, you don't have it. Don't present 1-2 sources as "several publications."

#### C7. No title-as-proper-noun openings

Start with what matters. "The 2019 flooding displaced 4,000 residents" not "The 2019 Midwest flooding event is a significant natural disaster that occurred in the central United States."

#### C8. No hallucinated citations

Never invent a source, DOI, ISBN, or URL. Cite fewer sources with higher confidence. One real source beats three invented ones.

#### C11. No negative parallelisms

State the positive claim directly. "The beat adds aggression" not "It's not just about the beat, it's about the aggression."

#### C13. No synonym cycling

Repeat the noun. English handles repetition fine. Forced synonym variation reads as algorithm output. "The protagonist" four different ways in four sentences is worse than "she" four times.

#### C14. No false ranges

List the topics directly instead of fake continuum constructions. "The book covers the Big Bang, star formation, and dark matter theories."

#### C20. No unnecessary tables

A table needs at least 3 rows and 2 columns to justify its existence. If the data is simple enough to say in a sentence, say it in a sentence.

#### C22. No knowledge-cutoff disclaimers

State what you know. If you don't know something, say so plainly: "I couldn't find data on this." Don't speculate about what "likely" exists.

#### C25. Straight quotes only

Use straight quotes ("...") not curly quotes. Check before finalizing.

#### C27. No excessive hedging

One hedge per claim maximum. "This may affect outcomes" is fine. "This could potentially possibly be argued to have some effect" is four hedges on one verb.

### Tier 4: Holistic (assess at draft level)

These can't be caught per-sentence. Evaluate when the full draft exists.

#### C6. No formulaic structure sections

Weave problems and prospects into the narrative. Don't segregate them into "Challenges and Future Outlook" bins. Don't add a summary that restates what was just said.

#### C16. Boldface restraint

Bold only structural headers. Never bold inline phrases for emphasis. Rewrite so the important word lands at the end of the sentence, where English naturally stresses it.

#### C17. No inline-header lists

Don't write bullet lists where each item starts with a bolded noun and a colon. Write prose. If a list is genuinely needed, use plain bullets without headers.

Before:
> - **Speed:** Code generation is significantly faster
> - **Quality:** Output quality has been enhanced
> - **Adoption:** Usage continues to grow

After:
> The update improves the interface, speeds up load times through optimized algorithms, and adds end-to-end encryption.

#### C18. Sentence case headings

"What we found" not "What We Found." Title case is a ChatGPT tell.

#### C19. No emojis

Never use emojis unless the user explicitly requests them.

#### C29. No uniform confidence

Vary certainty across claims. Strong assertion for solid facts. "Probably" for weak evidence. "I'm not sure about this, but" for speculation. Every paragraph at equal certainty is the tell.

#### C30. No view from nowhere

Write from a situated perspective. "From what I've seen," "In our experience," "The data I've looked at suggests." Be positioned. Not biased, but grounded.

#### C31. Sentence burstiness

Mix dead-simple sentences ("It broke.") with dense ones that pack multiple ideas. Let some sentences coast while others do heavy lifting. Uneven when measured, natural when read.

#### C35. Cross-segment stylistic variation

Different sections should read differently. A methodology section can be dry and precise. An implications section can be looser. If every section could be shuffled without anyone noticing, the style is too uniform.

---

## Phase 3: Voice injection

Avoiding AI patterns produces clean text. Clean is not the same as good. This phase adds the human element.

### Have opinions

For every section longer than 3 paragraphs, check: does the author have a visible opinion? If the whole section reads like neutral reporting, find one place to react. "This surprised us" or "Frankly, this is the part that worries me" or "I genuinely don't know how to feel about this." Any signal that a thinking person is behind the text.

### Vary rhythm

Read the draft. Check sentence lengths. If three consecutive sentences are within 5 words of each other, rewrite one. Short punchy sentences. Then longer ones that take their time. Mix it up.

Pattern to aim for: short (5-10 words), medium (15-20), long (25-35), short, medium. Not rigidly. Just not monotone.

### Be specific

Scan for abstract claims. Every time you find one, attach a number, a name, a date, or a concrete example.

| Abstract | Specific |
|----------|----------|
| significant improvement | 55% faster in our tests |
| widely adopted | used by 12 of the 20 largest banks |
| experts agree | three independent reviews reached the same conclusion |
| many users reported | 340 bug reports in the first week |

If you can't make it specific, consider whether you actually know enough to make the claim.

### Use "I" when it fits

First person isn't unprofessional. "I keep coming back to..." or "Here's what gets me..." signals a real person thinking. Zero first-person in a 2000-word analysis is a red flag.

### Let some mess in

Perfect structure signals algorithm. Allow yourself one tangent per major section. One sentence that starts with "But" or "And." One place where you acknowledge you're not sure. One observation that's slightly off-topic but interesting. Don't force these. But don't sterilize them out either.

### Acknowledge complexity

Real humans have mixed feelings. "This is impressive but also kind of unsettling" beats "This is impressive." Don't flatten nuance into clean conclusions.

### Be specific about feelings

Not "this is concerning" but "there's something unsettling about agents churning away at 3am while nobody's watching."

---

## Phase 4: Three-pass verification

Run after the draft is complete. Each pass targets a different failure mode.

### Pass 1: Pattern scan

Grep the draft for T1 constraint violations. Any hit requires a rewrite.

High-confidence patterns (rewrite on any match):

```
# C1 significance inflation
\b(testament|pivotal|landscape|tapestry|indelible|enduring legacy)\b

# C9 AI vocabulary
\b(Additionally|delve|intricacies|interplay|underscore|showcase|fostering|garner|comprehensive|exhibited|multifaceted|notably|particularly|meticulous|swift)\b

# C4 promotional
\b(vibrant|groundbreaking|breathtaking|nestled|renowned|stunning|must-visit)\b

# C10 copula avoidance
\b(serves as|stands as|boasts a|features a)\b

# C21 chatbot artifacts
(I hope this helps|Of course!|Certainly!|Would you like|let me know|here is a)

# C23 sycophancy
(Great question|excellent point|fascinating|You're absolutely right)

# C3 participial filler
\b(highlighting|underscoring|emphasizing|symbolizing|showcasing|encompassing)\b

# C26 filler phrases
(it's important to note|it's crucial to note|worth noting that|it bears mentioning|navigating the complexities)

# C34 anthropomorphized research
(studies suggest|research indicates|data reveals|the literature demonstrates|evidence points to|science tells us|the findings highlight)

# C15 em dashes -- count must not exceed word_count / 500
—
```

Medium-confidence patterns (review, may be legitimate):

```
# C12 rule of three (abstract nouns)
\b\w+tion,\s+\w+tion,\s+and\s+\w+tion\b

# C11 negative parallelism
(not just|not only|not merely).{0,30}(but also|it's about|it's a)

# C25 curly quotes
[\u201C\u201D\u2018\u2019]

# C5 source inflation
\b(several (sources|publications|studies|reports))\b
```

### Pass 2: Structural audit

Check these by reading, not by grep:

1. **Sentence length variance.** Sample 10 consecutive sentences. Measure word counts. Standard deviation should be > 5. Below 3 is monotone cadence.
2. **Paragraph opening words.** List the first word of every paragraph. If more than two start with "The" or more than two start with the same word, vary them.
3. **Section structure.** If every section follows claim-evidence-interpretation, break at least one. Put evidence first sometimes. Vary the skeleton.
4. **Opinion presence.** At least one first-person statement per 500 words of analytical content.
5. **Concrete detail ratio.** Aim for at least 1 specific detail (number, name, date) per 3 sentences.
6. **Table justification.** Every table must have at least 3 rows and 2 columns. If data fits in a sentence, convert to prose.
7. **Confidence variation (C29).** Every claim at equal certainty? Add hedging where evidence is weaker.
8. **Cross-segment style (C35).** Compare the first paragraph of each major section. If they all follow the same pattern, vary at least two.
9. **Noun-verb check (C32).** Pick any paragraph. If nouns outnumber verbs by more than 3:1, rewrite nominalizations into active constructions.

### Pass 3: Read-aloud test

Read the opening and closing paragraphs aloud (mentally). Check:

- Do any phrases feel unnatural to say out loud? Rewrite them.
- Does the opening sound like a person starting a conversation or a machine outputting a summary?
- Does the ending feel like a person finishing a thought or an algorithm wrapping up?
- Would you be comfortable putting your name on this?

---

## Red flags -- STOP and rewrite

| Signal | Action |
|--------|--------|
| Every sentence roughly the same length | Rewrite for rhythm variation |
| No opinions anywhere in analytical content | Add voice, pick a stance |
| Em dashes everywhere | Replace with periods, commas, parentheses |
| Three abstract nouns in every list | Cut the forced third item |
| Starts with "In today's rapidly evolving..." | Delete the whole opening, start with a fact |
| Ends with "The future looks bright" | End with a specific next step or honest uncertainty |
| "Serves as" / "stands as" / "boasts" | Write "is" or "has" |
| Bold inline phrases for emphasis | Restructure so position carries the emphasis |
| Every section same rhetorical structure | Vary at least two sections |
| No first-person in 1000+ words of analysis | Add situated perspective |

**Any of these means: stop, rewrite the affected section, then continue.**

---

## Common rationalizations

| Excuse | Reality |
|--------|---------|
| "The content is technical so it doesn't need voice" | Technical writing still has voice. Read anything by Knuth, Norvig, or Carmack. |
| "This is just internal" | If humans read it, humanize it. Internal docs shape how people think. |
| "I'll clean it up after" | Prevention beats correction. Constraints during composition, not post-editing. |
| "One em dash won't matter" | It won't. But you'll add five more. Count them. |
| "The user didn't ask for humanizer" | If it's human-facing text, constraints are active. The iron law applies. |
| "Bullet lists are clearer" | Sometimes. But three consecutive colon-prefixed lists are an AI tell. Write prose. |
| "Nobody will notice the vocabulary" | Detectors will. Readers with pattern sensitivity will. Five AI words in one piece is a signal. |
| "Neutral tone is more professional" | Neutral tone with no situated perspective is the view from nowhere. Have a vantage point. |
| "The constraints slow me down" | They speed up editing. Clean composition is faster than messy drafting plus cleanup passes. |
| "This piece is too short to matter" | Short pieces are more exposed. Every word choice is visible. |

---

## Full example

Before (AI-sounding):
> Great question! Here is an essay on this topic. I hope this helps!
>
> AI-assisted coding serves as an enduring testament to the transformative potential of large language models, marking a pivotal moment in the evolution of software development. In today's rapidly evolving technological landscape, these groundbreaking tools--nestled at the intersection of research and practice--are reshaping how engineers ideate, iterate, and deliver, underscoring their vital role in modern workflows.
>
> At its core, the value proposition is clear: streamlining processes, enhancing collaboration, and fostering alignment. It's not just about autocomplete; it's about unlocking creativity at scale, ensuring that organizations can remain agile while delivering seamless, intuitive, and powerful experiences to users.

After (has a pulse):
> AI coding assistants can make you faster at the boring parts. Not everything. Definitely not architecture.
>
> They're great at boilerplate: config files, test scaffolding, repetitive refactors. They're also great at sounding right while being wrong. I've accepted suggestions that compiled, passed lint, and still missed the point because I stopped paying attention.
>
> The productivity metrics are slippery. GitHub can say Copilot users "accept 30% of suggestions," but acceptance isn't correctness, and correctness isn't value. If you don't have tests, you're basically guessing.

What changed: removed chatbot artifacts (Great question!, I hope this helps), significance inflation (testament, pivotal, vital role), promotional tone (groundbreaking, nestled), em dashes, participial filler (underscoring, ensuring), negative parallelism (not just...it's about), copula avoidance (serves as), rule-of-three forcing (streamlining, enhancing, fostering), filler (at its core). Added first-person voice, specific claims, varied rhythm, honest uncertainty.

---

## Constraint quick reference

| # | Constraint | Tier | Category | Trigger patterns |
|---|-----------|------|----------|-----------------|
| C1 | No significance inflation | T1 | Content | testament, pivotal, crucial, vital, key role |
| C2 | No notability puffing | T3 | Content | media outlets, social media presence |
| C3 | No participial filler | T2 | Content | -ing phrases tacked onto sentences |
| C4 | No promotional tone | T2 | Content | vibrant, nestled, at its core, myriad |
| C5 | No vague attributions | T3 | Content | Experts argue, several sources |
| C6 | No formulaic sections | T4 | Content | Despite challenges, In conclusion |
| C7 | No title-as-proper-noun openings | T3 | Content | "X is a [category] that..." |
| C8 | No hallucinated citations | T3 | Content | Invented DOIs, ISBNs, sources |
| C9 | No AI vocabulary | T1 | Language | Additionally, comprehensive, notably |
| C10 | No copula avoidance | T2 | Language | serves as, stands as, boasts |
| C11 | No negative parallelisms | T3 | Language | Not just...but..., Not merely |
| C12 | No forced rule-of-three | T2 | Language | Three abstract nouns in sequence |
| C13 | No synonym cycling | T3 | Language | Rotating referents for same entity |
| C14 | No false ranges | T3 | Language | from X to Y, from A to B |
| C15 | Em dash discipline | T1 | Style | Max 1 per 500 words |
| C16 | Boldface restraint | T4 | Style | Only structural headers |
| C17 | No inline-header lists | T4 | Style | **Label:** content bullets |
| C18 | Sentence case headings | T4 | Style | Title Case Headings |
| C19 | No emojis | T4 | Style | Unless user requests |
| C20 | No unnecessary tables | T3 | Style | Small tables better as prose |
| C21 | No chatbot artifacts | T1 | Communication | I hope this helps, Certainly! |
| C22 | No cutoff/RAG disclaimers | T3 | Communication | as of, in the provided sources |
| C23 | No sycophancy | T1 | Communication | Great question!, excellent point |
| C24 | No chatbot tracking artifacts | T1 | Communication | utm_source, oaicite, citeturn |
| C25 | Straight quotes | T3 | Communication | Curly quotes |
| C26 | No filler phrases | T1 | Filler | In order to, important to note |
| C27 | No excessive hedging | T3 | Filler | could potentially possibly |
| C28 | No generic endings | T2 | Filler | future looks bright, exciting times |
| C29 | No uniform confidence | T4 | Epistemic | Equal certainty on all claims |
| C30 | No view from nowhere | T4 | Epistemic | Omniscient disembodied narrator |
| C31 | Sentence burstiness | T4 | Structural | Uniform predictability across sentences |
| C32 | Noun-verb ratio | T2 | Structural | Nominalization chains, passive nouns |
| C33 | No colon-list elision | T2 | Structural | Narrative replaced by bulleted lists |
| C34 | No anthropomorphized research | T1 | Structural | Studies suggest, research indicates |
| C35 | Cross-segment variation | T4 | Structural | All sections read identically |

---

## Ineffective indicators (do not flag)

Not every imperfection is an AI tell. Do not rewrite based on:

- Perfect grammar alone. Humans can write correctly.
- Mixing casual and formal registers. Many human writers shift naturally.
- "Bland" prose. Some humans write blandly. Blandness is not evidence.
- Unusual or academic vocabulary. Domain experts use domain words.
- Use of conjunctions in isolation. One "Additionally" is not a tell; five is.

Over-flagging wastes editing effort on non-issues.

---

## Final output

After verification, produce the text. No meta-commentary about the process.

Do not mention that you used this skill. Do not add disclaimers about humanization. Do not offer to "expand on any section." Do not end with "Let me know if you'd like any changes."

Output the text as if a human wrote it. If verification caught problems, fix them silently. If you have genuine uncertainty about tone or scope, ask the user before writing (Phase 1), not after.

---

## Status report

After completing writing, report:
- **DONE** -- text complete, verification passed, all constraints satisfied
- **DONE_WITH_CONCERNS** -- text complete but trade-offs made (e.g., client requested title case)
- **BLOCKED** -- cannot produce text meeting constraints (conflicting requirements, insufficient context)

---

## Reference

Sources for the 35 constraints:
- Wikipedia:Signs of AI writing (February 2026 revision), maintained by WikiProject AI Cleanup
- Kobak et al. (2024): excess word frequency analysis, LLM vs. human baselines (basis for C9)
- Reinhart (PNAS 2025): noun-to-verb ratio distortion in LLM output (basis for C32)
- Tripto et al. (EMNLP 2025): cross-segment stylistic uniformity (basis for C29, C35)
- DivEye (2025): burstiness deficit in LLM text (basis for C31)
- Yakura et al. (2024): RLHF-amplified vocabulary (integrated into C9)

For detailed before/after examples of each constraint, see `constraint-examples.md`.
