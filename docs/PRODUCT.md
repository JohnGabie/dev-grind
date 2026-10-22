# DevGrind — Product overview

**Status:** draft v1, 2026-10-22, after four rounds of questions. Written from João's own description of the final product he imagines. It is the
source the project mission is extracted from, and it will grow in rounds. Anything marked *(Claude's reading)* is an
interpretation João has not confirmed yet; everything else is his.

This is the long-term picture, not a plan. Features get their own MDs in `docs/superpowers/specs/`; transversal
decisions get ADRs. What exists today is in the code.

---

## 1. Why it exists

AI can write code faster than people can understand it. As with technical debt, that gap now has a name:
**comprehension debt**. João lived it: as a vibe coder he could not tell exactly what his own code (ZionHub) did, he
could only talk to the AI about it, and that brought fear and insecurity. Using AI on its own to learn, with prompts
in a local project, "worked more or less"; he felt it could do more. DevGrind grew from that, built step by step
from the research and from his own gaps.

**The end goal for a learner:** understand their code and the tools they use, without depending on AI to know what
is happening.

**Commitment:** DevGrind goes to production and is shared even if it never gets a single learner besides João. It
is the platform he wants to have. Success is not measured in user count.

## 2. Who it is for

- People who program with AI and carry comprehension debt — from beginners to developers who already work.
- Beginners, who need a path; and experienced developers (mid-level, senior), who need to find the one part they
  do not know or forgot, prove the rest, and move on.
- João first: the first learner and the test bench.

## 3. What makes it different

- **No fixed catalog, no teacher.** Platforms such as Mimo teach fundamentals and say "we have courses X, Y and Z,
  that is what you can do". In DevGrind the community makes the content: a learner builds a course with AI
  (researched, requested, edited), shares it, and good courses consolidate the way big open-source projects do —
  used, shared and improved by many.
- **Beyond fundamentals.** Frameworks and specializations — FastAPI, React, Tailwind and more — that fundamentals
  platforms do not cover well.
- **Real, not puzzles.** Codewars was useful to João, but its katas are puzzles that do not reflect real work.
  DevGrind is Duolingo-style courses plus katas, with katas about real development tasks, including framework katas
  such as "build page X".
- **The platform provides the format, not the content.** It gives a compatible structure — step types, tests,
  validation — so that agents can create courses the way the learner wants.
- **AI plus learning algorithms.** Evaluation and adaptation are not "all AI": proven learning algorithms written in
  code sit next to it, for a more measured and mature result.

## 4. The heart: a platform that adapts to the learner

This is the core of the product. The rest is built on it.

### 4.1 Highly sensitive
- The platform watches what the learner does — how they solved it, how they read, what they produced — and adjusts:
  "you did this that way; it was not good". The learner does not have to notice they are being assessed.
- It pushes the learner to reach a level, deliberately probing their weak spots. This part is built in code, with
  learning algorithms, not only with AI.
- **Process data, for precision.** Not just results: clicks, what was typed, what was deleted, what was changed in a
  piece of code, when they left to search. The point is precision in what to suggest, change and improve. Which data
  is worth collecting is still to be researched. **Collected only inside DevGrind** (its own editor and reader), never
  in the learner's IDE or terminal.
- **Ethical.** Collect what serves the learner, never to manipulate or abuse. *(Claude's reading: transparent to the
  learner about what is collected and why.)*
- **What leaves the platform:** when the learner's own AI reads their profile through MCP, only summaries leave
  (level, gaps, progress). Raw process data (keystrokes, deletions, tab switches) never leaves. The learner can
  export and delete their own data.

### 4.2 Leveling
- A **general test from time to time**, suggested by the platform or taken whenever the learner wants, comparing
  where they started with where they are now.
- A **test before a course or track**, to check it really fits their level.
- **Proficiency skips:** an experienced developer takes the test, it shows they only miss one part; they do that part
  and automatically earn the badge for the rest ("high proficiency in this course").
- **Next-step recommendations:** "you know Python, maybe it is time for a backend framework"; "you know HTML and JS,
  time for CSS"; or "go back and fix this first".
- **Book recommendations** along the path the learner is taking.

### 4.3 The skill map everything is measured against
Leveling, skips, badges and recommendations need one shared map of skills, and community courses declare which
skills they teach.
- **Start from outside knowledge, not our own.** Anchor the map on an external, open source of knowledge, so the
  platform does not invent ("delirar") its own idea of what a backend or React developer should know.
- **Later, external plus internal.** Compare learners' data with more advanced learners and with what the market
  asks for, and adjust the map from that. It will always need adjusting; an agent could keep it current with that data.
- Which external source to anchor on is still to be researched.

### 4.4 A real learner profile
Built from real data. The platform uses it to encourage; agents use it to build courses specialized for that learner.

### 4.5 The master measure: is the learner really understanding?
A repeatable check of the end goal, independent of any course: read unfamiliar code and say what it does, without AI.
It also checks that the learner really understands what they chose to study and read. It is the measure that says
whether comprehension debt is going down, and the one that keeps "precise" and "not addictive" honest.
*(Claude's reading: technical debt comes up here too — the check can include spotting what is wrong or fragile in a
piece of code, not only predicting its behavior.)*

### 4.6 Learner data also measures the content
The same data that profiles learners measures each community course and step: how hard it is and how much it
actually teaches. Course quality comes from evidence, not only from votes.

### 4.7 Not addictive
The algorithm must be genuinely smart about learning, not an engagement trap.

*(Claude's reading: this can build on known methods — per-concept mastery estimates from classic tutoring systems,
spaced repetition for when to review, AI for generating content and reading open answers. Evidence in
`docs/learning/EVIDENCE.md`.)*

## 5. Content

### 5.1 Courses
Built by learners with AI (researched, requested, edited), shared or kept private. The platform supplies step types
and validation. Courses can be based on a book, on a request in the chat, or on the learner's profile.
- **Publishing costs G-Coins**, so the store is not flooded with useless courses.
- **Contributions, not forks.** Anyone can propose an improvement to a published course, like a pull request; the
  author reviews and accepts it. *(Claude's reading: contributors get credit; learners midway through a course keep
  their progress when it gets a new version.)*

### 5.2 Katas
Real backend and framework tasks with tests, from small functions to "build page X". Harder ones are evaluated with
help from AI.

### 5.3 What the platform can run and test
- **Start with the basic, easy ones:** Python, SQL and web front-end (HTML/CSS/JS, then frameworks such as React and
  Tailwind).
- **Grow in updates** with the languages and frameworks wanted — even mobile development one day.
- Each addition takes time: building good tests and validating them. **Good tests are a first-class concern**: they
  are what makes community content trustworthy.

### 5.4 Books
- **Book slots:** the learner buys slots with G-Coins and puts their own books in the platform.
- **Format:** PDF today; EPUB is likely better, because it lets the platform give the reading its own look.
- **Audio later:** AI-generated audiobook. João reads, but staying in a text is hard for him without audio.
- **Books as raw material:** build a course from a book; from the page or chapter being read, ask the chat for an
  exercise right there, saved with it.
- **History outlives the book:** if the learner deletes a book (to free the slot), the content goes, but the record
  stays — that they read it, how much, and what they did with it.

### 5.5 Other content (ideas)
Community articles; interview preparation.

## 6. AI

- **Today: bring your own AI.** No budget to provide AI, so the learner connects their account through MCP and
  talks to the platform from the terminal or whatever tool they already use; agents answer and create content.
  There is also an in-app chat that takes the learner's own key.
- **Future: subscription.** The platform provides its own AI — "written by us" — and everything happens inside it.
  Most of the token cost is passed through to the subscriber, with extra features on top: boosters (XP, level,
  getting courses), maybe books, maybe prize draws.
- **Future: no AI needed at all.** Today the platform needs the learner's AI, because there are no courses yet. The
  aim is that a learner can pick free courses, learn alone, earn G-Coins and buy courses without any AI, without
  paying money and without spending coins they did not earn. Whether the platform itself should make some basic,
  higher-quality courses is open.

## 7. Community and economy

- **Community:** guilds and communities; learners share and collaborate.
- **Guilds** are for: study groups; mentoring (more advanced members help beginners); building and improving courses
  together; challenges between guilds — hackathons, guild-vs-guild battles — and other dynamics later. A guild can
  link its own Discord.
- **G-Coins:** the virtual currency.
  - **Earn** by selling a course in the store, or by grinding: pages read, courses, katas, exercises, and maybe
    community articles.
  - **Retained mastery pays more than activity:** a concept recalled days later (spaced review) is worth more than
    finishing things. This aligns the grind with the research instead of fighting it.
  - **Spend** on community courses, book slots and, later, personalization items.
  - **Cash-out:** maybe later. Not decided; design so the door is not closed (until then coins are platform credit).
  - **Buy with real money**, as a way to sponsor.
  - **A tight economy, on purpose.** Easy to earn a few coins, hard to save enough for a course. The balance is tuned
    over time from the community's behavior and feedback.
- **Personalization (later, not MVP):** Steam-like profile, guild page and homepage customization, sold in the store,
  including items made by other learners.

## 8. Platforms

- **Languages:** English first; Portuguese second (João's and his friends' native language); then others, brought in
  as marketing and the regions learners come from show demand. A bilingual platform from early on.
- **Web first.**
- **A real native mobile app — not a PWA or a browser port — after the MVP**, focused on what a phone does well:
  reading and listening to books, reviews, short lessons, quizzes, progress. Heavy katas stay on the web.

## 9. Principles and anti-goals

- Not "all AI": algorithms that are proven for learning sit next to AI.
- Not addictive, no manipulation; data collected only to serve the learner.
- Not a fixed catalog handed down by a teacher.
- Not puzzles: tasks reflect real work.
- Precision over volume: be very good at the heart (adaptation) before adding breadth.
- **Trust the learner; no anti-cheat.** Someone who pastes answers only lies to themselves, and DevGrind is the last
  place they would do it — they came to learn. With no cash-out there is nothing to exploit. Revisit this only if
  cash-out opens.

## 10. Open problems

- **MCP fit:** connecting the learner's own AI through MCP has not found its right shape yet.
- **Book copyright:** storing books learners upload; legal questions João cannot answer yet.
- **Evaluating framework katas** ("build page X") reliably.
- **Quality of community courses:** how consolidation, review and trust work.
- **Rewards vs motivation** *(Claude's reading, from the evidence base)*: coins paid per completed activity tend to
  lower intrinsic motivation; rewarding value to others (a course people use) fits the research better. The grind
  idea needs this care.
- **Boosters vs leveling** *(Claude's reading)*: XP or level boosters sold in the subscription could make level mean
  "paid" instead of "knows". A possible line: boosters speed up coins or access, never the measured proficiency.
- **Prize draws** may need legal checks (in Brazil, commercial prize promotions are regulated).
- **Open-source platform code:** João leans to open source but the product is commercial; undecided.
- **What is free forever** once a subscription exists: undecided.
- Other parts that João feels have not found their place yet.
- **The learner's own project as study material** (each learner's "ZionHub": tours, katas and questions taken from
  their own code). João: an excellent idea, the most direct attack on comprehension debt, but **later** — it is
  complex (for example, running someone's external code on our servers) and needs careful design first.

## 11. MVP

The real minimum of usability, enough to start collecting data and understanding who the learner is, what to make
easier and what they need:
- **Courses.**
- **Katas.**
- **The leveling test.**
- **The core of the adaptive engine:** the data collection and the learner profile it builds.

Store, G-Coins, guilds, book slots, personalization and the native app come after.

## 12. Not in this overview

- **Roadmaps** (groups of courses an agent can assemble): being built in the Courses feature; kept out of the mission.
- **Current state** of the code: see the feature MDs and `docs/learning/learning.db` (findings from the code read on
  2026-10-21).
