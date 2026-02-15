# Cursor: agents, chat names, and model selection (plain-language guide)

This is a short note for the project owner. It explains what the "agent" and chat name are for, whether to use one chat or several, and which model to use.

---

## What's going on

- **Chat name:** The name you see (e.g. "Antigravity game documentation") is just a **label for this conversation**. It's for you, so you can tell chats apart. It doesn't change how the AI works. Renaming it to something like **"Stickman Runner – project plan and docs"** is a good idea so it matches the current project.
- **Agents panel / "new Agents":** In Cursor you can have **multiple chats** (and sometimes different "agents" or modes). Each chat has its own **history**. The "new Agents" (or new chat) option is there so you can **start a fresh conversation** when you want a new topic or a clean slate, instead of everything living in one long thread.

---

## One agent vs multiple agents

- **One main chat (e.g. "Stickman Runner"):**  
  Good for **general work**: planning, docs, bugs, and features all in one place. The AI has a lot of context from this conversation. Best when you're the only person working on the project and you like having one continuous thread.

- **Multiple chats/agents for different topics:**  
  Useful when you want to **separate concerns**, for example:
  - **"Stickman Runner – stages and gameplay"** – stages 2–4, obstacles, damage/energy/health.
  - **"Stickman Runner – build and release"** – EAS Build, installable app, store.
  - **"Stickman Runner – UI and polish"** – bars, messages, instructions, stickman animations.

  Each chat stays focused, so answers are less mixed with unrelated code. The downside: **a new chat doesn't automatically know what was decided in another chat.** That's why we put the important decisions and plans in **docs** (e.g. `PROJECT_PLAN.md`, `CONTEXT_FOR_AGENTS.md`). Then any chat (or any new agent) can be pointed at those files and get up to speed.

---

## Practical recommendation

- **Rename this chat** to something like "Stickman Runner" or "Stickman Runner – docs and plan" so it's clear it's not the old Antigravity project.
- **Use one main chat** unless you find one thread getting too long or too mixed (e.g. "I only want to talk about release builds now"). Then start a **new chat** for that topic and, in the first message, say something like: "Read `docs/PROJECT_PLAN.md` and `docs/CONTEXT_FOR_AGENTS.md` for context."
- **Keep plans and decisions in the repo** (especially `PROJECT_PLAN.md` and `CONTEXT_FOR_AGENTS.md`) so it doesn't matter which chat or agent you use – they can always read the same source of truth.

---

## Which model to use (Stickman Runner)

Cursor gives you model choices (e.g. **Sonnet**, **Opus**, **GPT**, **Gemini**, **Composer**, **Auto**). Each has strengths. Here's when to use which for this project:

### Current setup: Sonnet 4.5 (default)

**Sonnet** is a good all-purpose model: strong coding, clear explanations, and solid architectural reasoning. Use it for **most work** (features, bugs, small refactors). It's a good "teacher" model when you're learning because it stays consistent in style.

### When to switch

| Situation | Model | Why |
|-----------|--------|-----|
| **Big decisions** (architecture, stage design, physics/loop changes, "we keep breaking things") | **Opus** | Best for "senior architect" reasoning and complex refactors. Slower and more expensive; use sparingly for deep dives. |
| **Large context** (many files, long diffs, "remember the whole project") | **Gemini** | Strong when other models lose earlier context; great for full-project reviews. |
| **Quick edits** ("do exactly this thing I already know I want") | **Composer** | Fast iteration. If it starts making questionable assumptions, switch back to Sonnet. |
| **Auto** | Fine for tiny edits | Less predictable for learning; Sonnet is a better default. |

**For Stickman Runner (Expo + React Native, custom physics, stage-based):**  
Stick with **Sonnet 4.5** for day-to-day work. Switch to **Opus** when you're making a big architectural call or a complex refactor that touches many files. Switch to **Gemini** if you need to paste a lot of files and want the model to "remember everything."

---

## Prompt to use at the start of a task

Copy/paste this when starting a new task to get clear explanations and sensible architectural decisions:

```
You are my coding agent for Stickman Runner (Expo + React Native mobile game).
I'm a beginner. Before writing code, propose 2–3 options and recommend one.
Explain trade-offs in plain English. Then implement in small steps.
After each step, tell me what changed and why.
Read docs/CONTEXT_FOR_AGENTS.md for project context.
```

This single prompt makes the agent (a) propose alternatives before diving in, (b) explain in plain language, and (c) work in small, understandable steps.
