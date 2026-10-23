# Learning evidence base

The Learning Advisor's working knowledge (`docs/roles/learning-advisor.md`). Each entry: the claim, how strong the
evidence is, the conditions where it holds, and what it means for DevGrind. Researched 2026-10-21 from abstracts,
meta-analyses and reviews, not full papers; deepen an entry before a big decision rests on it.

This file is the curated, approved view. The full record (every article, number, insight, finding and decision)
lives in `learning.db`, through `node scripts/learning/learning.mjs`.

Strength: **strong** = several meta-analyses or large replicated trials · **moderate** = consistent studies with
conditions · **weak** = practitioner reports, company data, blogs. A claim not listed here needs a source before it
is used, and then gets added here.

The current platform is NOT the reference. The reference is the vision: the learner, with the community, builds
courses and manuals with AI that make sense for them and their reality, using the platform's tools; the end goal
for João is to understand ZionHub without depending on AI.

---

## 1. Memory and practice

### 1.1 Retrieval before explanation — strong
Low-stakes recall beats re-reading; classroom meta-analysis g = 0.50 (Yang et al. 2021). Reliable for facts; less
clear for comprehension and application.
**DevGrind:** a lesson ends with the learner producing something from memory (predict, write, explain), not re-reading.
When the learner asks for help, ask for their attempt first.

### 1.2 Spacing — strong
The same study time spread out beats massed study, across subjects and ages.
Duolingo's half-life regression schedules a review just before the predicted forgetting point: 45%+ lower recall
prediction error, +12% activity in their A/B test (company data).
**DevGrind:** concepts come back after days, not only on failure. A per-concept "half-life" is a natural fit for the
adaptive agent.

### 1.3 Interleaving — moderate, with conditions
Mostly shown on simple material; with complex physics content it hurt long-term results unless combined with
collaboration.
**DevGrind:** mix concepts only after each one's basics hold.

### 1.4 Mastery before advancing — moderate
Classic tutoring systems (Bayesian knowledge tracing) advance at 95% estimated mastery; the best threshold is still
studied, and over-practice past mastery wastes time.
**DevGrind:** nothing defines "mastered" today. The 60% in the agent calibration picks what to practice; it is not a
mastery rule. The number is João's call.

## 2. Instruction design

### 2.1 Worked example → completion → independent — strong for novices
Novices learn more from studying solutions than from solving (worked-example effect). Works best when the example
explains why each step is there.
Parsons problems (put jumbled lines in order) act as partial worked examples and improve code writing.
**DevGrind:** new concept: solved example first, then fill-the-gap or Parsons, then a blank editor.

### 2.2 Expertise reversal — strong
As expertise grows, worked examples stop helping and then hurt; problems become better.
**DevGrind:** fade the help per concept as success grows. The same lesson should not look the same to a novice and to João after 20 passes.

### 2.3 Subgoal labels — moderate to strong (CS education)
Short labels naming what each step does help novices; given labels beat no labels and beat self-made labels.
**DevGrind:** worked examples and Parsons blocks carry step labels ("validate input", "build the query").

### 2.4 Cognitive load — strong
Learning suffers when extraneous load is high; manage intrinsic load, cut extraneous load.
**DevGrind:** one new idea per step; nothing on screen that is not needed for that step.

### 2.5 Productive failure — moderate, with conditions
Struggle-then-instruction can help learners with some prior knowledge; for real novices, example-then-problem
always wins.
**DevGrind:** use struggle-first only on concepts the learner already touched.

### 2.6 Predict before run (PRIMM) — moderate
Predict, Run, Investigate, Modify, Make: a Python-teaching sequence from "What Works in Teaching Python".
**DevGrind:** fits Pyodide directly: ask "what will this print / return?" before running.

### 2.7 Generative learning and self-explanation — strong
Fiorella & Mayer: summarising, mapping, drawing, imagining, self-testing, self-explaining, teaching, enacting.
Self-explanation meta-analysis (69 studies) g = 0.50.
**DevGrind:** "explain in your words why this works" prompts after an example or a passed test.

## 3. Feedback and hints

### 3.1 Feedback — strong, highly variable
Meta-analysis (435 studies) d = 0.48, with huge heterogeneity. Feedback rich in task, process and self-regulation
information is strong (d ≈ 0.99); praise, reward or punishment alone is weak (d ≈ 0.24).
**DevGrind:** test failure messages say what went wrong and what to look at next; "great job!" is not feedback.

### 3.2 Hints — moderate
Adaptive, next-step, on-demand hints help performance and learning; fixed hint text as a help option showed no
effect. Code hints improved later tests only when combined with self-explanation prompts.
**DevGrind:** a hint ladder (nudge → concept → partial code), each step asking the learner to explain before the next.

## 4. AI in learning (central to the vision)

### 4.1 Unguarded AI harms skill formation — strong
Bastani et al. (PNAS 2025, ~1,000 students): plain GPT-4 raised practice scores 48% but exam scores fell 17% once
access was removed. A tutor version that withheld answers and gave hints (+127% in practice) largely removed the harm.
Anthropic RCT (2026, 52 Python developers learning the Trio library): AI-assisted group scored 50% vs 67% by hand on
a comprehension quiz; the biggest gap was debugging; the speed gain was not significant.
**DevGrind:** this is the core risk of "courses made with AI". When AI does the generative work, the learner learns less.

### 4.2 Pedagogy built in makes AI tutors strong — strong (one large RCT + benchmarks)
Harvard (Kestin et al., Scientific Reports 2025, 194 students): a purpose-built AI tutor more than doubled gains over
an excellent active-learning class, in less time. The gain came from the pedagogy built into the tutor.
LearnLM rubric: manage cognitive load, inspire active learning, adapt to the learner, stimulate curiosity, deepen
metacognition.
**DevGrind:** the chat and any AI authoring flow carry explicit teaching rules (attempt first, hints, no full answers by default).

### 4.3 AI-generated content needs grounding and review — moderate
LLM-made educational content shows hallucinations; anchoring to verified course material improves it; LLM-as-judge
helps with moderate success and biases.
**DevGrind:** AI-made courses are grounded in a named source (the books, the learner's own code such as ZionHub) and
go through review (human or community) before others rely on them.

### 4.4 AI helping code comprehension — moderate, early
LLM access raised novices' confidence and code-comprehension scores; interactive LLM use improved later prompting.
Developers prefer AI code tours that scale detail with code length, do not restate code, and guide.
**DevGrind:** AI as a guide through real code (ZionHub tours), with the learner predicting and explaining at each stop.

### 4.5 What a good tutor response does — moderate (benchmark)
BEA 2025 shared task (50+ teams) scores AI tutor replies on four dimensions grounded in learning science: identifies
the mistake, points to where it is, gives pedagogical guidance, and that guidance is actionable. Best automatic
judges reached only F1 58-72, so automatic grading of tutor quality is still unreliable.
**DevGrind:** these four dimensions are the base rubric for the chat's replies to a failed attempt; a human or the
Advisor still samples them.

### 4.6 Help abuse and answer extraction — strong
Students who "game the system" (click through hints to reach the answer, guess systematically) learn about 2/3 as
much. It is harmful mainly on the problems the student knows least. Bottom-out hints (the full answer) are the usual
target; a help-seeking tutor cut bottom-out requests from 70% to 48%. Metacognitive feedback (telling learners how
much help they took and what it means, then asking them to reflect) reduced answer offloading to an LLM assistant and
improved test results (2026 preprint).
**DevGrind:** the full answer is the last rung, reached slowly; the AI tells the learner when they are leaning on it.

### 4.7 AI autocomplete for novices — moderate
Copilot made students about 35% faster with 50% more progress; learning was comparable to human pair programming,
not better. The least experienced accept the most suggestions, including wrong ones and ones they do not understand;
reading suggestions adds cognitive load.
**DevGrind:** no AI code completion in practice and lesson editors.

## 5. Learner as author, community

### 5.1 Learning by teaching — strong
Meta-analysis (28 studies): preparing to teach g = 0.35; preparing and teaching g = 0.56. Benefits are strongest when
learners generate their own explanations. Teachable agents raise effort (protégé effect).
**DevGrind:** the vision's "learner builds the course" is backed by evidence IF the learner does the explaining.
Writing a lesson, a manual or a kata for others is itself a learning activity.

### 5.2 Learnersourcing (student-made questions) — moderate
PeerWise: 3,000 students, 18 courses: engagement associated with better exam results after controlling for prior
ability; authoring helps, and commenting on others' questions helps more. Answering peer-made questions alone: weak
association (ρ = 0.22). Human + AI partnerships for content creation are an active research line.
**DevGrind:** authoring and reviewing count more than consuming. Community review doubles as quality control.

### 5.3 Communities of practice — moderate
Newcomers move from legitimate peripheral participation (watching, small contributions) to core participation;
Scratch shows many paths from periphery to core. Knowledge-building communities aim at shared knowledge, not task completion.
**DevGrind:** give newcomers small real contributions first (react, review, fix a typo, add an exercise) before authoring a course.

## 6. Motivation

### 6.1 Gamification — small effect
Meta-analysis (35 interventions, ~2,500 people): g = 0.26 for learning. Improves felt autonomy and relatedness, little
effect on felt competence.
**DevGrind:** points and streaks are seasoning, not the engine.

### 6.2 Tangible rewards can undermine intrinsic motivation — strong
Deci, Koestner & Ryan (1999, 128 experiments): engagement-, completion- and performance-contingent tangible rewards
lowered free-choice intrinsic motivation (d = −0.40, −0.36, −0.28), most when experienced as controlling; less
harmful for adults than children; informational verbal feedback does not undermine.
**DevGrind:** G coins paid per completed lesson risk this. Coins tied to real value for others (a course people use,
a useful review) fit the evidence better. João decides.

### 6.3 Self-determination theory — strong
Motivation rises when autonomy, competence and relatedness are met.
**DevGrind:** choice of path (autonomy), visible skill growth (competence), the community (relatedness).

### 6.4 Streaks and habit — weak (company data, blogs)
Streaks pull users back by loss aversion; streak freezes soften it; choosing a streak goal increased retention even
though the value was not used. Streaks do not fix exercises that always have the same shape.
**DevGrind:** vary exercise formats; never punish a missed day hard.

### 6.5 Leaderboards — moderate, mixed
Effects depend on design. Positive comparison helps high and average performers; negative comparison hurts low
performers. Absolute leaderboards sharpen competition more than relative ones; upward comparison can erode
motivation; one longitudinal class study saw motivation drop over time with a leaderboard.
**DevGrind:** no global absolute ranking by default; compare the learner to their own past.

## 7. ADHD — weak for learning design
Peer-reviewed reviews of university students with ADHD cover accommodations, coaching, CBT and mindfulness, not
lesson design. Short sessions, immediate feedback and novelty appear everywhere, but only in practitioner sources.
**DevGrind:** treat ADHD claims as hypotheses to test with João, not rules.

---

## Data sources (public, for reasoning without a learner base)
Access and licence must be checked before use; none is copied into the repo.
- **ProgSnap2 datasets on PSLC DataShop** — standard format for programming process logs; 10+ datasets, 750,000+
  program snapshots (includes CodeWorkout, Spring 2019). Closest to DevGrind's katas.
- **CSEDM Data Challenge** — classroom programming data with shared benchmarks.
- **Blackbox (BlueJ)** — large repository of novice Java programmer activity; access by application.
- **ASSISTments** — tutoring interaction logs, some with affect labels.
- **Duolingo SLAM 2018 and the half-life regression data** — spaced-repetition and learner error logs.
- **SPLICE dataset catalog** — index of CS education datasets.

## Optional reference skills
[education-agent-skills](https://github.com/GarethManning/education-agent-skills) (CC BY-SA 4.0, written for school
teachers, long files). Consult, do not copy: `cognitive-load-analyser`, `worked-example-fading-designer`,
`worked-example-to-problem-solving-transition-designer`, `progressive-hint-ladder`, `adaptive-hint-sequence-designer`,
`retrieve-first-gate`, `retrieval-practice-generator`, `spaced-practice-scheduler`,
`productive-failure-desirable-difficulty-designer`, `erroneous-example-designer`, `ai-socratic-dialogue-designer`,
`feedback-quality-analyser`.

## Sources
- Retrieval, spacing, interleaving: [Learning Scientists](https://www.apsu.edu/academic-affairs/faculty/cafe/cafe_initiatives/fcam/files/2025-presentations/learning-scientists.pdf), [Hendrick, May 2026](https://carlhendrick.substack.com/p/the-monthly-dispatch-whats-new-in-3c4)
- Worked examples, expertise reversal, productive failure: [Worked-example effect](https://en.wikipedia.org/wiki/Worked-example_effect), [Frontiers 2022](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.1032003/pdf), [Scott Young](https://www.scotthyoung.com/blog/2022/05/25/do-you-learn-more-by-struggling-on-hard-problems/)
- CS education: [What Works in Teaching Python](https://education.python.org/static/guides/what_works_toolkit.pdf), [Guided Parsons + subgoals](https://arxiv.org/pdf/2505.04712), [Worked examples + completion](https://par.nsf.gov/biblio/10598698-impact-connecting-worked-examples-completion-problems-introductory-programming-practice)
- Generative learning: [Fiorella & Mayer 2015](https://bootcampmilitaryfitnessinstitute.com/wp-content/uploads/2016/01/eight-ways-to-promote-generative-learning-fiorella-mayer-2015.pdf)
- Feedback and hints: [Wisniewski et al. 2020](https://opus.bibliothek.uni-augsburg.de/opus4/files/71009/fpsyg-10-03087.pdf), [Automated programming hints](https://www.researchgate.net/publication/334780669_An_Evaluation_of_the_Impact_of_Automated_Programming_Hints_on_Performance_and_Learning)
- Mastery: [BKT thresholds, EDM 2025](https://learninganalytics.upenn.edu/ryanbaker/edm25_short_bkt%20threshold_CR_final.pdf), [Over-practice](https://arxiv.org/pdf/2506.17577)
- Duolingo: [HLR paper](https://preview.aclanthology.org/fix_video/P16-1174.pdf), [IEEE Spectrum](https://spectrum.ieee.org/duolingo), [Habit mechanisms](https://www.wr-publishing.org/index.php/ijmat/article/view/908)
- AI and learning: [Bastani et al.](https://nmdprojects.net/teaching_resources/bastani_generative_ai_can_harm_learning.pdf), [Wharton summary](https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education/), [Anthropic coding-skills study](https://www.devclass.com/ai-ml/2026/02/02/anthropic-research-skilled-devs-make-better-use-of-ai-but-using-ai-is-bad-for-learning-skills/4079561), [Harvard AI tutor](https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/), [LearnLM](https://arxiv.org/pdf/2412.16429), [AI scaffold hallucinations](https://arxiv.org/pdf/2508.05929), [Code tours with LLMs](https://arxiv.org/html/2607.26987), [LLMs and novice comprehension](https://journals.flvc.org/FLAIRS/article/view/141647)
- Tutor quality, help abuse, autocomplete: [BEA 2025 findings](https://arxiv.org/html/2507.10579v1), [Gaming the system (Baker et al.)](http://pact.cs.cmu.edu/koedinger/pubs/Baker,%20Corbett,%20Koedinger%20ITS04.pdf), [Help seeking with ITS](https://link.springer.com/article/10.1007/s40593-015-0089-1), [Metacognitive feedback vs offloading](https://arxiv.org/html/2609.20143v1), [Copilot in brownfield tasks](https://dl.acm.org/doi/full/10.1145/3702652.3744219), [AI vs human pair programming](https://dl.acm.org/doi/10.1145/3765964.3811664), [Copilot usability for novices](https://arxiv.org/pdf/2304.02491)
- Leaderboards: [Leaderboard positions](https://www.sciencedirect.com/science/article/abs/pii/S0360131521001743), [Leaderboard design principles](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8097522/), [Longitudinal gamification study](https://www.academia.edu/12454798/Assessing_the_Effects_of_Gamification_in_the_Classroom_A_Longitudinal_Study_on_Intrinsic_Motivation_Social_Comparison_Satisfaction_Effort_and_Academic_Performance)
- Learner as author, community: [Preparing-to-teach meta-analysis](https://www.researchgate.net/publication/327072375_Learning_by_Preparing-to-Teach_and_Teaching_A_Meta-Analysis_Learning_by_Preparing-to-Teach_and_Teaching), [Teachable agents](https://link.springer.com/article/10.1007/s10956-009-9180-4), [Learnersourcing in the age of AI](https://arxiv.org/pdf/2306.06386), [PeerWise repository quality](https://arxiv.org/pdf/1308.2202), [LPP in Scratch](https://arxiv.org/pdf/2211.04046), [Knowledge building](https://www.isls.org/wp-content/uploads/pdfs/knowledge-building.pdf)
- Motivation: [Gamification meta-analysis](https://link.springer.com/article/10.1007/s10648-019-09498-w), [Gamification and SDT](https://link.springer.com/article/10.1007/s11423-023-10337-7), [Deci, Koestner & Ryan 1999](https://home.ubalt.edu/tmitch/642/articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf)
- Datasets: [Open datasets in learning analytics](https://arxiv.org/pdf/2602.17314), [ProgSnap2](https://dx.doi.org/10.1145/3341525.3387373), [SPLICE dataset catalog](https://splice.cs.vt.edu/datasetcatalog/)
- ADHD: [University students with ADHD, systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC10361779/)
