# DevGrind — Product overview

**Status:** draft v1, 2026-10-22, after four rounds of questions plus a legal, conceptual-bug and consolidation pass. Written from João's own description of the final product he imagines. It is the
source the project mission is extracted from, and it will grow in rounds. Anything marked *(Claude's reading)* is an
interpretation João has not confirmed yet; everything else is his.

This is the long-term picture, not a plan. Features get their own MDs in `docs/superpowers/specs/`; transversal
decisions get ADRs. What exists today is in the code.

---

## 0. The vision in one paragraph

DevGrind closes **comprehension debt** — the gap between the code AI writes and the code people understand. It
measures precisely what a learner knows, from beginner to senior, and adapts to them with proven learning algorithms
working next to AI. Its content is not a fixed catalog: courses and real-world katas are built by the community with
AI, on a shared format the platform validates, and the good ones consolidate like open-source projects. A tight
economy rewards learning that lasts and contributions that help others. It ships even if João is its only learner.

**Pillars:** (1) measure precisely and adapt — the heart; (2) learn by doing real work; (3) community-built content
on a shared, tested format; (4) an economy that rewards retained learning and value to others; (5) ethics: no
manipulation, the learner's data serves the learner. A platform people come back to because they are learning is
the goal; an adaptive algorithm stuck in loops is the failure.

Sections 13-15 hold the reality check: legal questions, conceptual bugs in this vision, and the beliefs it rests on
that have not been tested yet.

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
- **Maybe in the future, companies:** teams using DevGrind to reduce comprehension debt, or to onboard developers
  into a codebase. Recorded as a possibility, not designed.

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

### 4.2 The first session
A mix of conversation with the AI and cards, not a bare chat:
1. The learner marks what they are proficient in and what they can do, on cards.
2. The AI follows up like a test: "show me roughly what this code is doing" — checking what they really know from
   the first minutes.
3. A short test, then a first picture of where they are. A deeper test can come later, so the first visit is not a
   burden.
4. Setting up the account and this data may take a while, so it can be skipped; the dashboard then reminds them to
   finish it.

### 4.3 Leveling
- A **general test from time to time**, suggested by the platform or taken whenever the learner wants, comparing
  where they started with where they are now.
- A **test before a course or track**, to check it really fits their level.
- **Proficiency skips:** an experienced developer takes the test, it shows they only miss one part; they do that part
  and automatically earn the badge for the rest ("high proficiency in this course").
- **Next-step recommendations:** "you know Python, maybe it is time for a backend framework"; "you know HTML and JS,
  time for CSS"; or "go back and fix this first".
- **Book recommendations** along the path the learner is taking.

### 4.4 The skill map everything is measured against
Leveling, skips, badges and recommendations need one shared map of skills, and community courses declare which
skills they teach.
- **Start from outside knowledge, not our own.** Anchor the map on an external, open source of knowledge, so the
  platform does not invent ("delirar") its own idea of what a backend or React developer should know.
- **Later, external plus internal.** Compare learners' data with more advanced learners and with what the market
  asks for, and adjust the map from that. It will always need adjusting; an agent could keep it current with that data.
- Which external source to anchor on is still to be researched.

### 4.5 A real learner profile
Built from real data. The platform uses it to encourage; agents use it to build courses specialized for that learner.
**Optionally public, as a portfolio:** the learner can make their profile public — levels, badges, katas, courses
they built — to show recruiters.

### 4.6 The master measure: is the learner really understanding?
A repeatable check of the end goal, independent of any course: read unfamiliar code and say what it does, without AI.
It also checks that the learner really understands what they chose to study and read. It is the measure that says
whether comprehension debt is going down, and the one that keeps "precise" honest and tells coming back to learn
apart from coming back for nothing.
*(Claude's reading: technical debt comes up here too — the check can include spotting what is wrong or fragile in a
piece of code, not only predicting its behavior.)*

### 4.7 Learner data also measures the content
The same data that profiles learners measures each community course and step: how hard it is and how much it
actually teaches. Course quality comes from evidence, not only from votes.

### 4.8 An algorithm that does not get stuck
The adaptive algorithm must not get "addicted" to its own patterns: no loops that keep serving the same kind of
exercise, the same concept or the same difficulty, no self-reinforcing bias from its own past choices. It explores,
re-checks its picture of the learner, and changes course when the data says so.
**The platform itself being habit-forming is good** — learners coming back because they are learning. *(Claude's
reading: the master measure (4.6) is what keeps that true; returning that does not move it is a warning sign.)*

*(Claude's reading: this can build on known methods — per-concept mastery estimates from classic tutoring systems,
spaced repetition for when to review, AI for generating content and reading open answers. Evidence in
`docs/learning/EVIDENCE.md`.)*

## 5. Content

### 5.1 Courses
Built by learners with AI (researched, requested, edited), shared or kept private. The platform supplies step types
and validation. Courses can be based on a book, on a request in the chat, or on the learner's profile.
- **Seed phase.** At launch there is no community, so the platform publishes seed courses (made with AI, validated),
  free, as the base. The community takes over from there.
- **Publishing gate.** Before a course goes public: the author pays the publishing fee in G-Coins (section 7.2);
  the author passes their own course's katas and comprehension check (if you do not understand what you publish,
  you do not publish); an automatic validator checks the format, that tests run and pass, cited sources and no
  copied book passages; the course enters as "in testing" and becomes public after real use and community review.
- **Based on or inspired by a book: yes, in its own words.** Ideas, methods and systems are not protected by
  copyright (Brazil, Lei 9.610 art. 8); the text is. A course can follow a book's ideas and structure, quote short
  passages with author and source for teaching (art. 46), never copy its text. Selling such a course is a question
  for the lawyer review (section 13).
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
- **A quality layer around any AI, ours or the learner's.** Besides MCP, the platform ships **skills** for the
  learner's agent (or the MCP itself serves them), and the MCP enforces clear, strict rules. With the tests, this
  gives a decent quality bar — not perfect, good enough. Example: a learner asks for a TypeScript course, but a
  consolidated TypeScript course already exists — the platform steers them to it and to reaching a level X, instead
  of generating yet another one.
- **Future: subscription.** The platform provides its own AI — "written by us" — and everything happens inside it.
  Most of the token cost is passed through to the subscriber, with extra features on top: boosters (XP, level,
  getting courses), maybe books, maybe prize draws.
- **Future: no AI needed at all.** Today the platform needs the learner's AI, because there are no courses yet. The
  aim is that a learner can pick free courses, learn alone, earn G-Coins and buy courses without any AI, without
  paying money and without spending coins they did not earn. The seed courses (5.1) are the platform's own.

## 7. Community and the internal economy

### 7.1 Community
- Guilds and communities; learners share and collaborate.
- **Reddit-like discussions everywhere.** As on Codewars, finishing a kata opens a discussion of the solutions with
  others; the same exists for courses, books and other content.
- **Subcommunities that emerge.** Subcommunities (like subreddits) per book, course or topic. Anyone can create a
  specific one, and they also form on their own where people are already talking about something.
- **Findable on the web.** Discussions can be public and indexed by search engines: someone searching for opinions on
  a book lands in the DevGrind community. This also helps the platform's ranking.
- How to do all this well still needs design.
- **Moderation in layers:** reports from anyone, AI triage, João, the community and community moderators. (The
  notice-and-takedown regime in section 13 makes reports and takedown mandatory anyway.)
- **Guilds** are for: study groups; mentoring (more advanced members help beginners); building and improving courses
  together; challenges between guilds — hackathons, guild-vs-guild battles — and other dynamics later. A guild can
  link its own Discord.

### 7.2 The internal economy (everything about G-Coins in one place)
- **Earn:** selling a course in the store, or grinding — pages read, courses, katas, exercises, maybe community
  articles. **Retained mastery pays more than activity:** a concept recalled days later (spaced review) is worth more
  than finishing things.
- **Spend:** community courses, the publishing fee, book slots, later personalization items.
- **Buy with real money**, as a way to sponsor; in the native app this goes through the store's in-app purchase.
- **Cash-out:** maybe later; design so the door is not closed. Until then coins are platform credit.
- **A tight economy, on purpose:** easy to earn a few coins, hard to save enough for a course; tuned over time from
  the community's behavior and feedback.
- **Generosity toward dedicated learners:** the platform can gift courses or give generous rewards to learners who
  show dedication, so a tight economy never locks out someone who is really learning.
- **Free:** seed courses and the learning core (leveling, master measure, profile, katas) — *Claude's reading of
  "learn without paying"; the exact free line is still open.*
- **Subscription extras:** boosters (XP, level, getting courses), maybe books, maybe prize draws (draws need
  authorization; boosters must not buy measured proficiency — section 10).
- **Personalization (later, not MVP):** Steam-like profile, guild page and homepage customization, sold in the store,
  including items made by other learners.
- **Inflation, an open disagreement.** João: there is no inflation, because coins always come back to users and, at
  worst, the platform ends up with more courses. *Claude's counterpoint:* coins minted from activity (fake reading
  included) are new money, not transfers; when they grow faster than what is spent, the tight economy loosens and the
  platform's own prices (publishing fee, slots) lose their effect. Harmless while there is no cash-out; it becomes
  real money the day cash-out opens. Proposed: watch the coin supply from day one and decide caps before any cash-out.

## 8. Platforms

- **Languages:** English first; Portuguese second (João's and his friends' native language); then others, brought in
  as marketing and the regions learners come from show demand. A bilingual platform from early on.
- **Web first.**
- **A real native mobile app — not a PWA or a browser port — after the MVP**, focused on what a phone does well:
  reading and listening to books, reviews, short lessons, quizzes, progress. Heavy katas stay on the web.

## 9. Principles and anti-goals

- Not "all AI": algorithms that are proven for learning sit next to AI.
- No manipulation; data collected only to serve the learner. Habit-forming is welcome when it is learning that brings
  people back; an adaptive algorithm stuck in loops is not.
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

---

## 13. Legal questions (research of 2026-10-22 — not legal advice)

Read from public sources, not from a lawyer. Before the store, payments, book audio or prize draws ship, a lawyer
checks these. English-first means Brazilian and foreign rules both apply.

| Topic | What we found | What it means for DevGrind |
|---|---|---|
| Books uploaded by learners | Brazil: copyright was always outside the Marco Civil art. 19 shield; since the 2025 Supreme Court ruling, notice-and-takedown (art. 21) is the general regime for user content. Storing one's own books in a cloud locker is unsettled law. | Terms of use where the learner states they hold the rights; a takedown process that acts on notice; books stay private to their owner, never shared. |
| AI audiobook of a book | Disputed: one court treated text-to-speech as reproduction needing the rightsholder's consent; the Authors Guild fought Kindle's TTS and Amazon let rightsholders switch it off. | High risk for copyrighted books. Safer: read-aloud on the learner's device, or audio only for public-domain, licensed or the learner's own texts. |
| Course built from a book, then sold | Turning a work into a course is a derivative work and distributing it is the owner's right; fair use (US) is narrow and Brazilian limitations narrower. | A course may teach a book's ideas in its own words, never copy its text. Selling raises the risk; the publish flow should check for copied passages. |
| Book pages sent to the learner's AI (MCP) | Same reproduction question: the text leaves the platform to a third-party service. | Decide what book text MCP tools may return (short excerpts vs pages). |
| Who owns an AI-made course | US Copyright Office (Jan 2025): purely AI-generated material is not copyrightable; only human contributions are. Prompts alone are not enough. | A course mostly written by AI may not be protected: anyone could copy a paid course. Terms of use must define the license between creator, buyer and platform, and human authorship matters. |
| G-Coins (closed loop) | Brazil's payment rules (Lei 12.865, Banco Central) exclude limited-purpose arrangements used in one ecosystem; cash-out would bring payment-institution rules (KYC, anti-money-laundering). | Coins as platform credit with no cash-out keep us out of payment regulation. Opening cash-out is a regulatory decision, not a feature. |
| Coins and courses in the native app | Apple and Google require their in-app purchase for digital goods (with their fee); IAP currency must be consumed in the app and cannot buy real-world goods. | Buying coins in the native app goes through IAP. Physical prizes or books bought with coins conflict with store rules. |
| Prize draws | Brazil: free prize distribution by draw needs prior authorization (Lei 5.768/71, now under the Secretaria de Prêmios e Apostas; Portaria SEAE 7.638/2022). | No draws without authorization; prefer non-random rewards. |
| Refunds | CDC art. 49 gives 7 days to withdraw from online purchases; sources disagree on whether it covers digital goods. | A clear refund policy for coins and courses; confirm with a lawyer. |
| Learner data | LGPD (and GDPR for EU learners): a legal basis, transparency and data rights; minors' data has extra rules. Process data (keystrokes, deletions) is personal data. | Explain what is collected and why; export and delete (already planned); decide a minimum age. |

Sources: [EFF on the 2025 ruling](https://www.eff.org/deeplinks/2025/06/major-setback-intermediary-liability-brazil-how-did-we-get-here),
[GNI on platform liability](https://globalnetworkinitiative.org/from-shield-to-scrutiny-brazils-supreme-court-redefines-platform-liability/),
[Kindle TTS dispute](https://www.slashgear.com/kindle-2-text-to-speech-angers-authors-guild-1133859),
[TTS as reproduction](https://en.bizhankook.com/articles/30011.html),
[Courses and fair use](https://www.authorsalliance.org/2017/02/23/can-fair-uses-be-made-of-copyrighted-works-for-online-courses/),
[US Copyright Office report](https://www.skadden.com/insights/publications/2025/02/copyright-office-publishes-report),
[BCB payment arrangements](https://www.bcb.gov.br/pre/surel/reladmbc/2013/relatorio-de-atividades/sistemas-de-pagamentos/novos-arranjos-de-pagamentos.html),
[App Store IAP for digital goods](https://conductatlas.com/platform/apple/apple-app-store-review-guidelines/mandatory-in-app-purchase-for-digital-goods),
[Lei 5.768/71](https://www.planalto.gov.br/ccivil_03/leis/l5768compilado.htm),
[CDC withdrawal and digital goods](https://meusitejuridico.editorajuspodivm.com.br/2026/07/21/o-direito-de-arrependimento-previsto-no-cdc-tambem-se-aplica-aos-bens-digitais/),
[LGPD in education](https://www.privacytools.com.br/en/como-a-lgpd-se-aplica-as-instituicoes-de-ensino/).

## 14. Conceptual bugs in this vision (things that may not hold)

Found by reading the vision against itself and the research. Each needs a decision or a design answer.

1. **Comprehension debt comes back through course authoring.** A beginner asks the AI for a React course and cannot
   tell whether it is right, then publishes it and others pay for it. The product would sell the very debt it fights.
   **Decided:** the publishing gate (5.1) — fee in coins, author passes their own course, automatic validator,
   "in testing" until community review — plus data-based quality (4.7).
2. **"No catalog" meets the cold start.** At launch there is no community, so the only courses are made by João with
   AI — in practice a catalog. **Decided:** a seed phase (5.1).
3. **Trusting the learner vs a currency.** No anti-cheat is fine for learning, but fake activity mints coins.
   **Open disagreement**, recorded in 7.2: João sees no inflation; Claude proposes watching coin supply from day one
   and deciding caps before any cash-out.
4. **A tight economy vs "learn without paying".** Publishing fees, paid courses and slow coin earning can lock a
   newcomer out. **João's answer:** gifts and generous rewards for dedicated learners; all economy questions are
   grouped in 7.2. The exact free line is still open.
5. **The learner's own AI can undo the pedagogy.** `docs/learning/AI-BEHAVIOR.md` rules only apply to our chat.
   Through MCP the learner's AI can simply hand over answers — the harm the research measured. **João's answer:** a
   quality layer around any AI — skills shipped with the MCP, strict MCP rules, tests, steering to consolidated
   courses (section 6). *Claude's addition:* MCP tools return hints and checks, never solutions (today the solution
   already never leaves the server).
6. **Precision needs many learners.** Algorithms tuned on behavioral data need a population; with a handful of
   learners they are guesswork. **Decided:** start from research priors and external public datasets — also as input
   for the Learning Advisor — and collect process data from the MVP on.
7. **Boosters, battles, streaks and draws.** ~~vs "not addictive"~~ — **resolved by João:** "not addictive" was about
   the internal algorithm not getting stuck in loops (4.8), not the platform; a platform people return to in order to
   learn is good. Remaining watch point *(Claude)*: a mechanic that brings people back without moving the master
   measure is engagement, not learning.
8. **"Our own AI".** Training a model is out of reach; realistically it is an agent with our tools, skills and
   teaching rules on top of a provider's model, with tokens passed through. João framed it as the quality layer
   (skills + strict MCP rules + tests) rather than a model of our own.
9. **A paid course may not be ownable** (section 13): if AI wrote most of it, the seller may hold no copyright.
   **Decided:** a license in the terms of use — a buyer gets a personal license; copying and republishing on the
   platform is forbidden; what is sold is the curation, tests and human contribution; the platform detects copied
   courses. A lawyer confirms before the store opens.
10. **Scope vs one part-time developer.** Web, native app, two languages, several runtimes, a marketplace and an
    adaptive engine. **João's call: flexible** — the MVP (section 11) guides, and he can pull something from outside
    it when he wants.
11. **A public portfolio vs "trust the learner".** Without anti-cheat, a badge means "self-paced", which is fine for
    the learner but weak for a recruiter. *Possible answer (Claude):* the public profile marks which results came
    from checks the platform ran itself (master measure, platform-run katas) and which are self-paced. To decide.
12. **Public, indexed discussions vs privacy and books.** Indexing brings people in, but posts become public by
    default. *Possible answer (Claude):* learners choose what is public; a book's discussion never quotes more than
    short passages.

## 15. Beliefs this vision rests on (to test, not assume)

The product is built on expectations nobody has tested yet. Each one gets the cheapest test that could prove it wrong.

| # | Belief | Why it might be wrong | Earliest signal |
|---|---|---|---|
| B1 | Fine process data makes recommendations better than results alone | It may add noise; the research is promising but early | Compare recommendations with and without process data on the master measure (4.6) |
| B2 | Building a course with AI makes the author learn | The AI may do the thinking (section 14, bug 1) | Master measure before and after authoring |
| B3 | The community will consolidate good courses | Too few people; incentives favor quantity | Reuse and contribution counts per course; share of learners on consolidated courses |
| B4 | A leveling test lets experienced devs skip safely | The test may not measure what the course teaches | Learners who skipped vs who completed, on later katas |
| B5 | A tight coin economy motivates without hurting learning | Rewards can lower intrinsic motivation | Master measure and voluntary practice of coin-earners vs other learners |
| B6 | Bring-your-own-AI is acceptable to early learners | Friction; many have no AI account | How many first-time visitors connect an AI and come back |
| B7 | A master comprehension measure can be built across stacks | Good "read and predict" items are hard to make | A first item set for Python, checked against the code-comprehension research |
| B8 | João as first learner is a valid first test | One learner biases everything (Learning Advisor rule) | Treat his data as one labeled case; seek the first 5 other learners early |
