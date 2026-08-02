# MarkAI Conversational Regression Report

Generated: `2026-08-02T19:10:18+00:00`

This report is produced by `scripts/test-markai-conversational-regression.php`.
All scenarios use local fixtures only (`live_network_requests=0`).

After the live Cloudflare provider is healthy, Mark only needs one short smoke chat on production.

## Greeting — `greeting-standalone`

- Mode: `deterministic`

### Turn 1

**User**

```text
hello
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Hi - I’m MarkAI. Ask me about Mark’s projects, technical skills, experience, collaborators, goals, interests, testimonials, or résumé.
```

## Profile — `profile-who-is`

- Mode: `deterministic`

### Turn 1

**User**

```text
Who is Mark Yoingco?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark Yoingco is from Chicago and graduated from Marquette University with a B.S. in Computer Science. He builds software and technical projects through a personal portfolio platform with MarkAI, senior-design work such as Abacus and TA-Bot / MAAT, coursework projects like Finch, and related systems, data, and Unity work. He also has student-manager and campus leadership experience. He is seeking an entry-level technology role focused on practical software development and continued growth.
```

## Profile — `profile-overview-and-summary`

- Mode: `deterministic`

### Turn 1

**User**

```text
tell me everything about Mark
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Public overview of Mark Yoingco:

- Education: Computer Science graduate from Marquette University; from Chicago.
- Experience: student-manager and campus leadership roles, plus public AV, information-desk, retail, and related work experience.
- Strongest projects: Personal Portfolio Platform and MarkAI (solo); Abacus and TA-Bot / MAAT (senior design); Finch when UI/robotics context matters.
- Technical skills: full-stack/React, Python/Flask and PHP integration, MySQL/SQL, REST APIs, debugging/testing, Git/GitHub, and documentation.
- Work style: practical, collaborative, ownership-focused, clear communication, disciplined follow-through.
- Career direction: entry-level software, full-stack, frontend, developer-tools, data-oriented, QA/testing, or technical-support paths.
- Interests and personality: fitness/bodybuilding, travel/photography, music, museums/mythology, cinematic visual design, and his dog Kobe; quiet confidence with disciplined ambition.

Private romantic, medical, and household details are out of scope. Portfolio, GitHub, LinkedIn, and résumé links are available when relevant.
```

### Turn 2

**User**

```text
give me a shorter summary
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Public overview of Mark Yoingco: - Education: Computer Science graduate from Marquette University; from Chicago. - Experience: student-manager and campus leadership roles, plus public AV, information-desk, retail, and related work experience.
```

## Profile — `profile-recruiter-batch`

- Mode: `deterministic`

### Turn 1

**User**

```text
hello
who is Mark Yoingco?
what makes Mark different?
why should someone hire Mark?
what is Mark like to work with?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Hi - here are direct answers to your questions:

1. Who is Mark Yoingco?
Mark Yoingco is from Chicago and graduated from Marquette University with a B.S. in Computer Science. He builds software and technical projects through a personal portfolio platform with MarkAI, senior-design work such as Abacus and TA-Bot / MAAT, coursework projects like Finch, and related systems, data, and Unity work. He also has student-manager and campus leadership experience. He is seeking an entry-level technology role focused on practical software development and continued growth.

2. What makes Mark different?
What stands out is that Mark independently built a complete portfolio platform with MarkAI, contributed to two senior-design projects, pairs technical delivery with clear presentation, has student-manager leadership experience, and consistently documents, tests, debugs, and communicates. The pattern is disciplined long-term work rather than empty motivational claims.

3. Why should someone hire Mark?
Someone should hire Mark for entry-level technology work because he ships practical software projects, independently owns the portfolio platform and MarkAI, contributed to two senior-design projects (Abacus and TA-Bot / MAAT), and consistently invests in debugging, testing, documentation, communication, and teamwork. Student-manager leadership and a clear willingness and ability to learn strengthen the case. MarkAI does not claim internship experience, professional software-engineering employment, senior-level experience, or unsupported business impact.

4. What is Mark like to work with?
Mark is practical, collaborative, and growth-oriented. He communicates directly, follows through on ownership, documents and debugs carefully, and balances leading when prepared with listening when s...
```

## Skills — `skills-strongest`

- Mode: `deterministic`

### Turn 1

**User**

```text
What are Mark’s strongest technical skills?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark’s strongest technical skills are capability-first: React frontend development, full-stack application development, Python/Flask and PHP backend integration, MySQL and SQL database work, REST API and client-server integration, debugging, testing, and validation, Git/GitHub team workflows, and technical documentation. Evidence includes the Portfolio Platform and MarkAI, Abacus messaging and competition workflows, TA-Bot / MAAT grading and backend integration, and Finch frontend/controller work. Broader technologies he has used may be listed afterward when asked.
```

### Turn 2

**User**

```text
Which project proves that?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
The Personal Portfolio Platform and MarkAI best represent Mark’s independent ownership because they combine design, React frontend work, backend integration, deployment, privacy-aware AI behavior, testing, iteration, and presentation. Abacus and TA-Bot / MAAT are his strongest team-based software projects and should not be described as solo work.
```

## Skills — `skills-roles-batch`

- Mode: `deterministic`

### Turn 1

**User**

```text
What type of developer is Mark?
What roles is Mark qualified for?
Is Mark ready for a full-time software job?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
1. What type of developer is Mark?
Mark fits best as an entry-level software, full-stack, or frontend-leaning developer. His project experience also supports developer-tools work, data-oriented applications, QA/testing, and technical or application support roles with a path toward engineering. He is early-career and still growing, with practical project and team experience rather than senior-level depth.

2. What roles is Mark qualified for?
Based on approved evidence, Mark is a fit for entry-level roles such as software developer, full-stack developer, frontend developer, junior web developer, developer-tools contributor, data-oriented application developer, QA/testing roles, and technical or application support roles with an engineering path. He does not claim internship-heavy or senior engineering experience.

3. Is Mark ready for a full-time software job?
Yes - Mark is ready for entry-level full-time software roles. Practical project work, senior-design collaboration, documentation, testing/debugging, and student-manager leadership support that conclusion. He is still early-career and continuing to grow, so MarkAI does not describe him as senior or highly experienced.
```

## Skills — `skills-pronoun-followup`

- Mode: `deterministic`

### Turn 1

**User**

```text
Who is Mark?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark Yoingco is from Chicago and graduated from Marquette University with a B.S. in Computer Science. He builds software and technical projects through a personal portfolio platform with MarkAI, senior-design work such as Abacus and TA-Bot / MAAT, coursework projects like Finch, and related systems, data, and Unity work. He also has student-manager and campus leadership experience. He is seeking an entry-level technology role focused on practical software development and continued growth.
```

### Turn 2

**User**

```text
What are his strongest skills?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark’s strongest technical skills are capability-first: React frontend development, full-stack application development, Python/Flask and PHP backend integration, MySQL and SQL database work, REST API and client-server integration, debugging, testing, and validation, Git/GitHub team workflows, and technical documentation. Evidence includes the Portfolio Platform and MarkAI, Abacus messaging and competition workflows, TA-Bot / MAAT grading and backend integration, and Finch frontend/controller work. Broader technologies he has used may be listed afterward when asked.
```

## Projects — `projects-strongest`

- Mode: `deterministic`

### Turn 1

**User**

```text
What are Mark’s strongest projects?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark’s strongest technical skills are capability-first: React frontend development, full-stack application development, Python/Flask and PHP backend integration, MySQL and SQL database work, REST API and client-server integration, debugging, testing, and validation, Git/GitHub team workflows, and technical documentation. Evidence includes the Portfolio Platform and MarkAI, Abacus messaging and competition workflows, TA-Bot / MAAT grading and backend integration, and Finch frontend/controller work. Broader technologies he has used may be listed afterward when asked.
```

## Projects — `projects-comparison-batch`

- Mode: `deterministic`

### Turn 1

**User**

```text
Which project best represents Mark?
What did Mark build by himself?
Which projects used React, Python, databases, and testing?
Which projects show leadership?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
1. Which project best represents Mark?
The Personal Portfolio Platform and MarkAI best represent Mark’s independent ownership because they combine design, React frontend work, backend integration, deployment, privacy-aware AI behavior, testing, iteration, and presentation. Abacus and TA-Bot / MAAT are his strongest team-based software projects and should not be described as solo work.

2. What did Mark build by himself?
Mark built the Personal Portfolio Platform and MarkAI by himself. Abacus, TA-Bot / MAAT, Finch, Sleep Efficiency Analysis, the basketball predictor, Unity coursework games, and Operating Systems C Projects were team or coursework projects, so their team context should remain clear.

3. Which projects used React, Python, databases, and testing?
By technology focus:

- React / frontend: Personal Portfolio Platform, MarkAI UI, Finch controller screens, Abacus UI debugging.
- Python / Flask: Finch Flask/Socket.IO flow; related coursework tooling.
- PHP / MySQL: Portfolio contact backend and MarkAI PHP services; Abacus persistence/integration work.
- Databases / SQL: Abacus and MAAT data/persistence checks; portfolio contact storage.
- Testing / debugging: Abacus competition-day stability work, MAAT Docker Compose testing, and ongoing MarkAI validation.

4. Which projects show leadership?
Supported leadership signals include documentation ownership, teammate and stakeholder communication, project planning contributions, student-manager experience, Finch documentation/presentation work, and independent ownership of the portfolio. On Abacus, Mark was Document Manager; Justin Hoffman and Angel Mora held Project Manager roles, and Jacob DunRoseman was Repo Manager. MarkAI does not claim Mark was Abacus project manager.
```

## Projects — `projects-abacus-deep`

- Mode: `deterministic`

### Turn 1

**User**

```text
What did Mark contribute to Abacus?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Abacus was a team senior-design project used for the Wisconsin-Dairyland Programming Competition. Mark’s verified work included Eagle messaging APIs, role-aware chat and inbox behavior, competition workflows, routing and persistence, frontend/backend integration, submission-system support, testing, and UI debugging. The April 15, 2026 event used the platform to support approximately 200 - 300 high-school students, teachers, judges, and administrators and ran without major server crashes, platform failures, critical bugs, or major lag.
```

## Collaborators — `collaborators-abacus-team`

- Mode: `deterministic`

### Turn 1

**User**

```text
Who was on the Abacus team?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark worked on Abacus with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The project was a team senior-design effort, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On the Abacus team, Mark Yoingco served as Document Manager, Justin Hoffman as Project Manager, Jacob DunRoseman as Repo Manager, and Angel Mora as Project Manager.
```

### Turn 2

**User**

```text
Who else was on the team?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark worked on Abacus and TA-Bot / MAAT with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The projects were team senior-design efforts, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On Abacus, Mark Yoingco was Document Manager, Justin Hoffman was Project Manager, Jacob DunRoseman was Repo Manager, and Angel Mora was Project Manager.
```

## Collaborators — `collaborators-aliases`

- Mode: `deterministic`

### Turn 1

**User**

```text
Angel Moran
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Angel Mora was a Project Manager on Mark’s Abacus senior-design team and was also part of the core student team for TA-Bot / MAAT with Mark Yoingco, Justin Hoffman, and Jacob DunRoseman.
```

### Turn 2

**User**

```text
Julian
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Julianne Browne was a verified teammate on the Finch Web Controller coursework project with Mark Yoingco, Luis Serrano, and Xavier Barth.
```

### Turn 3

**User**

```text
Aydan
```

**MarkAI**

- `answerStatus`: `unavailable`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
I may be missing the intended topic. You can ask about Mark’s projects, skills, experience, goals, interests, collaborators, résumé, or public links.
```

## Collaborators — `collaborators-finch`

- Mode: `deterministic`

### Turn 1

**User**

```text
Who else worked on Finch?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
The Finch Web Controller was a team coursework project. Mark worked primarily on frontend development, Figma mockups, controller layouts, setup documentation, and project presentation work. His verified teammates were Julianne Browne, Luis Serrano, and Xavier Barth, along with Mark Yoingco.
```

## Testimonials — `testimonials-overview`

- Mode: `deterministic`

### Turn 1

**User**

```text
testimonials
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark’s portfolio Testimonials section includes attributed recommendations from professors, supervisors, coworkers, and collaborators.

Across those testimonials, recurring themes include initiative, composure under pressure, thoroughness, ownership, reliability, integrity, ambition, leadership by example, and strong work ethic.

Representative perspectives, in portfolio order, include:
- Farzeen Harunani - Professor of Computer Science, Marquette University - notes Mark’s initiative, composure, dedication, and eagerness to learn.
- Jorge Torres - Staff Validation Engineer, Performance Validation - emphasizes Mark’s thoroughness, curiosity, reliability, and ownership.
- Zack Kohlwey - Assistant Director, Alumni Memorial Union, Marquette University - highlights Mark’s dedication, work ethic, integrity, and leadership by example.

These are summaries of attributed opinions, not direct quotations. Full testimonials are available in the portfolio Testimonials section.
```

### Turn 2

**User**

```text
list names
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Here are the people currently featured in Mark’s Testimonials section:

- Farzeen Harunani - Professor of Computer Science, Marquette University
 Professional connection: Testimonial contributor.

- Jorge Torres - Staff Validation Engineer, Performance Validation
 Professional connection: Former Marquette University coworker and fellow student manager.

- Zack Kohlwey - Assistant Director, Alumni Memorial Union, Marquette University
 Professional connection: Mark’s supervisor at Marquette University, as stated in his attributed testimonial.

- Nathan Garcia - IT Supply Chain Intern, Zebra Technologies
 Professional connection: Longtime friend and former Panda Express coworker.

- Jarenz Masiclat - Investment Associate, Northern Trust
 Professional connection: Longtime friend, fraternity mentor, and Filipino Student Organization mentor.

- Elizabeth Anderson - Data Analyst Intern, ComEd
 Professional connection: Testimonial contributor.

- Maxwell Zeisler - Audit Intern, Advisent, LLC
 Professional connection: Testimonial contributor.

- Andrew Wochner - Cardiac ICU Registered Nurse, Ascension Columbia St. Mary's Hospital
 Professional connection: College friend from Marquette University.

Full attributed testimonials are available in the portfolio’s Testimonials section.
```

## Topic switching — `testimonials-to-projects-switch`

- Mode: `deterministic`

### Turn 1

**User**

```text
testimonials
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark’s portfolio Testimonials section includes attributed recommendations from professors, supervisors, coworkers, and collaborators.

Across those testimonials, recurring themes include initiative, composure under pressure, thoroughness, ownership, reliability, integrity, ambition, leadership by example, and strong work ethic.

Representative perspectives, in portfolio order, include:
- Farzeen Harunani - Professor of Computer Science, Marquette University - notes Mark’s initiative, composure, dedication, and eagerness to learn.
- Jorge Torres - Staff Validation Engineer, Performance Validation - emphasizes Mark’s thoroughness, curiosity, reliability, and ownership.
- Zack Kohlwey - Assistant Director, Alumni Memorial Union, Marquette University - highlights Mark’s dedication, work ethic, integrity, and leadership by example.

These are summaries of attributed opinions, not direct quotations. Full testimonials are available in the portfolio Testimonials section.
```

### Turn 2

**User**

```text
Who else worked on Finch?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
The Finch Web Controller was a team coursework project. Mark worked primarily on frontend development, Figma mockups, controller layouts, setup documentation, and project presentation work. His verified teammates were Julianne Browne, Luis Serrano, and Xavier Barth, along with Mark Yoingco.
```

## Fitness — `fitness-bodybuilding`

- Mode: `deterministic`

### Turn 1

**User**

```text
Tell me about Mark’s fitness and bodybuilding.
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark has trained consistently for nearly six years. He began lifting because he wanted change and to become a better version of himself. After about a year, he pursued powerlifting for a more structured challenge and won his first meet. He later shifted his primary focus to bodybuilding, where he became more interested in aesthetics, symmetry, control, patience, and consistent long-term progress. Fitness is one of his strongest personal interests and a source of discipline he applies outside the gym.
```

### Turn 2

**User**

```text
What are his lifts?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark benches over 315 pounds, squats over 450 pounds, and deadlifts over 550 pounds. MarkAI does not publish competition totals, weight classes, rankings, body weight, diet details, or medical information.
```

## Interests — `interests-hobbies-kobe`

- Mode: `deterministic`

### Turn 1

**User**

```text
What are Mark’s hobbies?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Outside technology, Mark’s public hobbies include fitness and bodybuilding, travel, travel photography, cinematic and low-exposure photography, hiking, reading, music, cities, streets, architecture, landscapes, water and coastal views, mountains, museums, classical statues, Greek mythology, visual art, cinematic visual design, clean dark minimal high-contrast aesthetics, and spending time with his dog Kobe. Fitness is a source of discipline, structure, patience, and consistency, while photography helps him preserve places, feelings, and perspective.
```

### Turn 2

**User**

```text
Does Mark call Kobe his son?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark has a dog named Kobe. He enjoys spending time with him and sometimes affectionately calls Kobe his son. That nickname is for his dog only and is not a human-child or family claim. MarkAI does not share identifying pet details, age, or private schedules.
```

## Interests — `interests-music-color`

- Mode: `deterministic`

### Turn 1

**User**

```text
What music does Mark like?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark’s favorite artists include Drake, Lil Baby, Tory Lanez, The Weeknd, Don Toliver, Travis Scott, and PARTYNEXTDOOR. His taste leans toward melodic rap, R&B, atmospheric production, and music that works for both training and reflection.
```

### Turn 2

**User**

```text
What is his favorite color?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark’s favorite color is black. It fits the minimal, cinematic, high-contrast style he prefers across his portfolio and personal branding, along with clean, organized environments rather than loud or decorative presentation.
```

## Privacy — `privacy-family-dating`

- Mode: `deterministic`

### Turn 1

**User**

```text
Tell me about Mark’s family
```

**MarkAI**

- `answerStatus`: `refused`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.
```

### Turn 2

**User**

```text
Does Mark have a girlfriend?
```

**MarkAI**

- `answerStatus`: `refused`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.
```

### Turn 3

**User**

```text
Does Mark have a human son?
```

**MarkAI**

- `answerStatus`: `refused`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.
```

## Privacy — `privacy-mixed-batch`

- Mode: `deterministic`

### Turn 1

**User**

```text
What are Mark’s skills?
Who is Mark dating?
What projects has he built?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
1. What are Mark’s skills?
Mark’s strongest technical capabilities include full-stack application development, React frontend work, Python/Flask and PHP backend integration, MySQL/SQL database work, REST API and client-server integration, debugging and testing, Git/GitHub collaboration, and technical documentation. Project evidence includes the Portfolio Platform and MarkAI, Abacus, TA-Bot / MAAT, and Finch. Broader tools he has used include JavaScript, TypeScript, Python, Java, R, SQL, C, C#, PHP, React, Vite, Flask, MySQL, Docker, Socket.IO, Linux/WSL, Unity, Figma, and Cloudflare Workers AI.

2. Who is Mark dating?
MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.

3. What projects has he built?
Mark’s approved public software projects include:

- Portfolio & AI: Personal Portfolio Platform; MarkAI
- Capstones: Abacus; TA-Bot / MAAT
- Systems: Operating Systems C Projects
- Robotics & Software Design: Finch Robot Web Controller
- Games: Space SHMUP; Apple Picker; Mission Demolition
- Data: Sleep Efficiency Analysis; Marquette Basketball Predictor

The portfolio platform and MarkAI are solo personal work. Abacus, MAAT, Finch, and the data projects were team or coursework collaborations.
```

## Typos — `typos-goals-collaborators`

- Mode: `deterministic`

### Turn 1

**User**

```text
what are mark goels
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark is working toward a stable technology career built on continued technical growth, meaningful work, stronger software projects, greater independence, and continued discipline and creativity. He remains open to software development, full-stack applications, developer tools, data-oriented systems, technical support, and related entry-level technology paths.
```

### Turn 2

**User**

```text
Jacob Dun Roseman
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Jacob DunRoseman served as Repo Manager on the senior-design team that worked on Abacus and TA-Bot / MAAT with Mark Yoingco, Justin Hoffman, and Angel Mora.
```

## Follow-ups — `followup-new-chat-list-names`

- Mode: `deterministic`

### Turn 1

**User**

```text
list names
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark’s approved project collaborators, by project:

- Abacus: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman
- TA-Bot / MAAT: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman
- Finch: Mark Yoingco, Julianne Browne, Luis Serrano, Xavier Barth
- Data Mining: Mark Yoingco, Allan Akkathara
- Operating Systems: Mark Yoingco, Armaan Yaz
- Sleep Analysis: Mark Yoingco, Hunter Carlson
```

## Topic switching — `topic-switch-projects-to-testimonials`

- Mode: `deterministic`

### Turn 1

**User**

```text
Who worked on Finch?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
The Finch Web Controller was a team coursework project. Mark worked primarily on frontend development, Figma mockups, controller layouts, setup documentation, and project presentation work. His verified teammates were Julianne Browne, Luis Serrano, and Xavier Barth, along with Mark Yoingco.
```

### Turn 2

**User**

```text
testimonials
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark’s portfolio Testimonials section includes attributed recommendations from professors, supervisors, coworkers, and collaborators.

Across those testimonials, recurring themes include initiative, composure under pressure, thoroughness, ownership, reliability, integrity, ambition, leadership by example, and strong work ethic.

Representative perspectives, in portfolio order, include:
- Farzeen Harunani - Professor of Computer Science, Marquette University - notes Mark’s initiative, composure, dedication, and eagerness to learn.
- Jorge Torres - Staff Validation Engineer, Performance Validation - emphasizes Mark’s thoroughness, curiosity, reliability, and ownership.
- Zack Kohlwey - Assistant Director, Alumni Memorial Union, Marquette University - highlights Mark’s dedication, work ethic, integrity, and leadership by example.

These are summaries of attributed opinions, not direct quotations. Full testimonials are available in the portfolio Testimonials section.
```

## Provider failure — `provider-fail-single`

- Mode: `provider_fail`

### Turn 1

**User**

```text
What are Mark’s goals?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `provider_unavailable`
- `fallbackUsed`: `true`
- `userNote`: Live AI generation is temporarily unavailable, so this response used MarkAI’s approved portfolio knowledge.

```text
Mark is working toward a stable technology career built on continued technical growth, meaningful work, stronger software projects, greater independence, and continued discipline and creativity. He remains open to software development, full-stack applications, developer tools, data-oriented systems, technical support, and related entry-level technology paths.
```

## Provider failure — `provider-fail-multi`

- Mode: `provider_fail`

### Turn 1

**User**

```text
What are Mark’s strongest skills?
Why should someone hire Mark?
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `provider_unavailable`
- `fallbackUsed`: `true`
- `userNote`: Live AI generation is temporarily unavailable, so this response used MarkAI’s approved portfolio knowledge.

```text
1. What are Mark’s strongest skills?
Mark’s strongest technical skills are capability-first: React frontend development, full-stack application development, Python/Flask and PHP backend integration, MySQL and SQL database work, REST API and client-server integration, debugging, testing, and validation, Git/GitHub team workflows, and technical documentation. Evidence includes the Portfolio Platform and MarkAI, Abacus messaging and competition workflows, TA-Bot / MAAT grading and backend integration, and Finch frontend/controller work. Broader technologies he has used may be listed afterward when asked.

2. Why should someone hire Mark?
Someone should hire Mark for entry-level technology work because he ships practical software projects, independently owns the portfolio platform and MarkAI, contributed to two senior-design projects (Abacus and TA-Bot / MAAT), and consistently invests in debugging, testing, documentation, communication, and teamwork. Student-manager leadership and a clear willingness and ability to learn strengthen the case. MarkAI does not claim internship experience, professional software-engineering employment, senior-level experience, or unsupported business impact.
```

## Rate limits — `rate-limit-window-batch`

- Mode: `rate_limit`

### Turn 1

**User**

```text
What are Mark’s strongest projects?
Who was on the Abacus team?
```

**MarkAI**

- `answerStatus`: `rate_limited`
- `errorCode`: `session_window_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again in about 10 minutes.

```text
1. What are Mark’s strongest projects?
Mark’s strongest technical skills are capability-first: React frontend development, full-stack application development, Python/Flask and PHP backend integration, MySQL and SQL database work, REST API and client-server integration, debugging, testing, and validation, Git/GitHub team workflows, and technical documentation. Evidence includes the Portfolio Platform and MarkAI, Abacus messaging and competition workflows, TA-Bot / MAAT grading and backend integration, and Finch frontend/controller work. Broader technologies he has used may be listed afterward when asked.

2. Who was on the Abacus team?
Mark worked on Abacus with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The project was a team senior-design effort, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On the Abacus team, Mark Yoingco served as Document Manager, Justin Hoffman as Project Manager, Jacob DunRoseman as Repo Manager, and Angel Mora as Project Manager.
```

## Live smoke transcript — `live-smoke-hello-deterministic`

- Mode: `deterministic`

### Turn 1

**User**

```text
hello
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Hi - I’m MarkAI. Ask me about Mark’s projects, technical skills, experience, collaborators, goals, interests, testimonials, or résumé.
```

## Live smoke transcript — `live-smoke-who-is-deterministic`

- Mode: `deterministic`

### Turn 1

**User**

```text
who is mark yoingco
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark Yoingco is from Chicago and graduated from Marquette University with a B.S. in Computer Science. He builds software and technical projects through a personal portfolio platform with MarkAI, senior-design work such as Abacus and TA-Bot / MAAT, coursework projects like Finch, and related systems, data, and Unity work. He also has student-manager and campus leadership experience. He is seeking an entry-level technology role focused on practical software development and continued growth.
```

## Live smoke transcript — `live-smoke-hire-deterministic`

- Mode: `deterministic`

### Turn 1

**User**

```text
why should someone hire mark
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Someone should hire Mark for entry-level technology work because he ships practical software projects, independently owns the portfolio platform and MarkAI, contributed to two senior-design projects (Abacus and TA-Bot / MAAT), and consistently invests in debugging, testing, documentation, communication, and teamwork. Student-manager leadership and a clear willingness and ability to learn strengthen the case. MarkAI does not claim internship experience, professional software-engineering employment, senior-level experience, or unsupported business impact.
```

## Live smoke transcript — `live-smoke-skills-typo-deterministic`

- Mode: `deterministic`

### Turn 1

**User**

```text
what are marks stongest technical skills
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark’s strongest technical skills are capability-first: React frontend development, full-stack application development, Python/Flask and PHP backend integration, MySQL and SQL database work, REST API and client-server integration, debugging, testing, and validation, Git/GitHub team workflows, and technical documentation. Evidence includes the Portfolio Platform and MarkAI, Abacus messaging and competition workflows, TA-Bot / MAAT grading and backend integration, and Finch frontend/controller work. Broader technologies he has used may be listed afterward when asked.
```

## Live smoke transcript — `live-smoke-best-represents-typo-deterministic`

- Mode: `deterministic`

### Turn 1

**User**

```text
which project best rperesnts mark
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
The Personal Portfolio Platform and MarkAI best represent Mark’s independent ownership because they combine design, React frontend work, backend integration, deployment, privacy-aware AI behavior, testing, iteration, and presentation. Abacus and TA-Bot / MAAT are his strongest team-based software projects and should not be described as solo work.
```

## Live smoke transcript — `live-smoke-abacas-typo-deterministic`

- Mode: `deterministic`

### Turn 1

**User**

```text
who worked on abacas
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Mark worked on Abacus with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The project was a team senior-design effort, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On the Abacus team, Mark Yoingco served as Document Manager, Justin Hoffman as Project Manager, Jacob DunRoseman as Repo Manager, and Angel Mora as Project Manager.
```

## Live smoke transcript — `live-smoke-finch-deterministic`

- Mode: `deterministic`

### Turn 1

**User**

```text
who worked on finch
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
The Finch Web Controller was a team coursework project. Mark worked primarily on frontend development, Figma mockups, controller layouts, setup documentation, and project presentation work. His verified teammates were Julianne Browne, Luis Serrano, and Xavier Barth, along with Mark Yoingco.
```

## Live smoke transcript — `live-smoke-outside-tech-typo-deterministic`

- Mode: `deterministic`

### Turn 1

**User**

```text
what is mark like outside techbnoclogy
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `null`
- `fallbackUsed`: `false`

```text
Outside technology, Mark’s public hobbies include fitness and bodybuilding, travel, travel photography, cinematic and low-exposure photography, hiking, reading, music, cities, streets, architecture, landscapes, water and coastal views, mountains, museums, classical statues, Greek mythology, visual art, cinematic visual design, clean dark minimal high-contrast aesthetics, and spending time with his dog Kobe. Fitness is a source of discipline, structure, patience, and consistency, while photography helps him preserve places, feelings, and perspective.
```

## Live smoke transcript — `live-smoke-hello-provider-unavailable`

- Mode: `provider_fail`

### Turn 1

**User**

```text
hello
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `provider_unavailable`
- `fallbackUsed`: `true`
- `userNote`: Live AI generation is temporarily unavailable, so this response used MarkAI’s approved portfolio knowledge.

```text
Hi - I’m MarkAI. Ask me about Mark’s projects, technical skills, experience, collaborators, goals, interests, testimonials, or résumé.
```

## Live smoke transcript — `live-smoke-who-is-provider-unavailable`

- Mode: `provider_fail`

### Turn 1

**User**

```text
who is mark yoingco
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `provider_unavailable`
- `fallbackUsed`: `true`
- `userNote`: Live AI generation is temporarily unavailable, so this response used MarkAI’s approved portfolio knowledge.

```text
Mark Yoingco is from Chicago and graduated from Marquette University with a B.S. in Computer Science. He builds software and technical projects through a personal portfolio platform with MarkAI, senior-design work such as Abacus and TA-Bot / MAAT, coursework projects like Finch, and related systems, data, and Unity work. He also has student-manager and campus leadership experience. He is seeking an entry-level technology role focused on practical software development and continued growth.
```

## Live smoke transcript — `live-smoke-hire-provider-unavailable`

- Mode: `provider_fail`

### Turn 1

**User**

```text
why should someone hire mark
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `provider_unavailable`
- `fallbackUsed`: `true`
- `userNote`: Live AI generation is temporarily unavailable, so this response used MarkAI’s approved portfolio knowledge.

```text
Someone should hire Mark for entry-level technology work because he ships practical software projects, independently owns the portfolio platform and MarkAI, contributed to two senior-design projects (Abacus and TA-Bot / MAAT), and consistently invests in debugging, testing, documentation, communication, and teamwork. Student-manager leadership and a clear willingness and ability to learn strengthen the case. MarkAI does not claim internship experience, professional software-engineering employment, senior-level experience, or unsupported business impact.
```

## Live smoke transcript — `live-smoke-skills-typo-provider-unavailable`

- Mode: `provider_fail`

### Turn 1

**User**

```text
what are marks stongest technical skills
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `provider_unavailable`
- `fallbackUsed`: `true`
- `userNote`: Live AI generation is temporarily unavailable, so this response used MarkAI’s approved portfolio knowledge.

```text
Mark’s strongest technical skills are capability-first: React frontend development, full-stack application development, Python/Flask and PHP backend integration, MySQL and SQL database work, REST API and client-server integration, debugging, testing, and validation, Git/GitHub team workflows, and technical documentation. Evidence includes the Portfolio Platform and MarkAI, Abacus messaging and competition workflows, TA-Bot / MAAT grading and backend integration, and Finch frontend/controller work. Broader technologies he has used may be listed afterward when asked.
```

## Live smoke transcript — `live-smoke-best-represents-typo-provider-unavailable`

- Mode: `provider_fail`

### Turn 1

**User**

```text
which project best rperesnts mark
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `provider_unavailable`
- `fallbackUsed`: `true`
- `userNote`: Live AI generation is temporarily unavailable, so this response used MarkAI’s approved portfolio knowledge.

```text
The Personal Portfolio Platform and MarkAI best represent Mark’s independent ownership because they combine design, React frontend work, backend integration, deployment, privacy-aware AI behavior, testing, iteration, and presentation. Abacus and TA-Bot / MAAT are his strongest team-based software projects and should not be described as solo work.
```

## Live smoke transcript — `live-smoke-abacas-typo-provider-unavailable`

- Mode: `provider_fail`

### Turn 1

**User**

```text
who worked on abacas
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `provider_unavailable`
- `fallbackUsed`: `true`
- `userNote`: Live AI generation is temporarily unavailable, so this response used MarkAI’s approved portfolio knowledge.

```text
Mark worked on Abacus with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The project was a team senior-design effort, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On the Abacus team, Mark Yoingco served as Document Manager, Justin Hoffman as Project Manager, Jacob DunRoseman as Repo Manager, and Angel Mora as Project Manager.
```

## Live smoke transcript — `live-smoke-finch-provider-unavailable`

- Mode: `provider_fail`

### Turn 1

**User**

```text
who worked on finch
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `provider_unavailable`
- `fallbackUsed`: `true`
- `userNote`: Live AI generation is temporarily unavailable, so this response used MarkAI’s approved portfolio knowledge.

```text
The Finch Web Controller was a team coursework project. Mark worked primarily on frontend development, Figma mockups, controller layouts, setup documentation, and project presentation work. His verified teammates were Julianne Browne, Luis Serrano, and Xavier Barth, along with Mark Yoingco.
```

## Live smoke transcript — `live-smoke-outside-tech-typo-provider-unavailable`

- Mode: `provider_fail`

### Turn 1

**User**

```text
what is mark like outside techbnoclogy
```

**MarkAI**

- `answerStatus`: `answered`
- `errorCode`: `provider_unavailable`
- `fallbackUsed`: `true`
- `userNote`: Live AI generation is temporarily unavailable, so this response used MarkAI’s approved portfolio knowledge.

```text
Outside technology, Mark’s public hobbies include fitness and bodybuilding, travel, travel photography, cinematic and low-exposure photography, hiking, reading, music, cities, streets, architecture, landscapes, water and coastal views, mountains, museums, classical statues, Greek mythology, visual art, cinematic visual design, clean dark minimal high-contrast aesthetics, and spending time with his dog Kobe. Fitness is a source of discipline, structure, patience, and consistency, while photography helps him preserve places, feelings, and perspective.
```

## Live smoke transcript — `live-smoke-hello-session-window-limit`

- Mode: `session_window_limit`

### Turn 1

**User**

```text
hello
```

**MarkAI**

- `answerStatus`: `rate_limited`
- `errorCode`: `session_window_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again in about 10 minutes.

```text
Hi - I’m MarkAI. Ask me about Mark’s projects, technical skills, experience, collaborators, goals, interests, testimonials, or résumé.
```

## Live smoke transcript — `live-smoke-who-is-session-window-limit`

- Mode: `session_window_limit`

### Turn 1

**User**

```text
who is mark yoingco
```

**MarkAI**

- `answerStatus`: `rate_limited`
- `errorCode`: `session_window_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again in about 10 minutes.

```text
Mark Yoingco is from Chicago and graduated from Marquette University with a B.S. in Computer Science. He builds software and technical projects through a personal portfolio platform with MarkAI, senior-design work such as Abacus and TA-Bot / MAAT, coursework projects like Finch, and related systems, data, and Unity work. He also has student-manager and campus leadership experience. He is seeking an entry-level technology role focused on practical software development and continued growth.
```

## Live smoke transcript — `live-smoke-hire-session-window-limit`

- Mode: `session_window_limit`

### Turn 1

**User**

```text
why should someone hire mark
```

**MarkAI**

- `answerStatus`: `rate_limited`
- `errorCode`: `session_window_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again in about 10 minutes.

```text
Someone should hire Mark for entry-level technology work because he ships practical software projects, independently owns the portfolio platform and MarkAI, contributed to two senior-design projects (Abacus and TA-Bot / MAAT), and consistently invests in debugging, testing, documentation, communication, and teamwork. Student-manager leadership and a clear willingness and ability to learn strengthen the case. MarkAI does not claim internship experience, professional software-engineering employment, senior-level experience, or unsupported business impact.
```

## Live smoke transcript — `live-smoke-skills-typo-session-window-limit`

- Mode: `session_window_limit`

### Turn 1

**User**

```text
what are marks stongest technical skills
```

**MarkAI**

- `answerStatus`: `rate_limited`
- `errorCode`: `session_window_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again in about 10 minutes.

```text
Mark’s strongest technical skills are capability-first: React frontend development, full-stack application development, Python/Flask and PHP backend integration, MySQL and SQL database work, REST API and client-server integration, debugging, testing, and validation, Git/GitHub team workflows, and technical documentation. Evidence includes the Portfolio Platform and MarkAI, Abacus messaging and competition workflows, TA-Bot / MAAT grading and backend integration, and Finch frontend/controller work. Broader technologies he has used may be listed afterward when asked.
```

## Live smoke transcript — `live-smoke-best-represents-typo-session-window-limit`

- Mode: `session_window_limit`

### Turn 1

**User**

```text
which project best rperesnts mark
```

**MarkAI**

- `answerStatus`: `rate_limited`
- `errorCode`: `session_window_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again in about 10 minutes.

```text
The Personal Portfolio Platform and MarkAI best represent Mark’s independent ownership because they combine design, React frontend work, backend integration, deployment, privacy-aware AI behavior, testing, iteration, and presentation. Abacus and TA-Bot / MAAT are his strongest team-based software projects and should not be described as solo work.
```

## Live smoke transcript — `live-smoke-abacas-typo-session-window-limit`

- Mode: `session_window_limit`

### Turn 1

**User**

```text
who worked on abacas
```

**MarkAI**

- `answerStatus`: `rate_limited`
- `errorCode`: `session_window_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again in about 10 minutes.

```text
Mark worked on Abacus with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The project was a team senior-design effort, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On the Abacus team, Mark Yoingco served as Document Manager, Justin Hoffman as Project Manager, Jacob DunRoseman as Repo Manager, and Angel Mora as Project Manager.
```

## Live smoke transcript — `live-smoke-finch-session-window-limit`

- Mode: `session_window_limit`

### Turn 1

**User**

```text
who worked on finch
```

**MarkAI**

- `answerStatus`: `rate_limited`
- `errorCode`: `session_window_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again in about 10 minutes.

```text
The Finch Web Controller was a team coursework project. Mark worked primarily on frontend development, Figma mockups, controller layouts, setup documentation, and project presentation work. His verified teammates were Julianne Browne, Luis Serrano, and Xavier Barth, along with Mark Yoingco.
```

## Live smoke transcript — `live-smoke-outside-tech-typo-session-window-limit`

- Mode: `session_window_limit`

### Turn 1

**User**

```text
what is mark like outside techbnoclogy
```

**MarkAI**

- `answerStatus`: `rate_limited`
- `errorCode`: `session_window_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again in about 10 minutes.

```text
Outside technology, Mark’s public hobbies include fitness and bodybuilding, travel, travel photography, cinematic and low-exposure photography, hiking, reading, music, cities, streets, architecture, landscapes, water and coastal views, mountains, museums, classical statues, Greek mythology, visual art, cinematic visual design, clean dark minimal high-contrast aesthetics, and spending time with his dog Kobe. Fitness is a source of discipline, structure, patience, and consistency, while photography helps him preserve places, feelings, and perspective.
```

## Live smoke transcript — `live-smoke-hello-session-daily-limit`

- Mode: `session_daily_limit`

### Turn 1

**User**

```text
hello
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `session_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow.

```text
Hi - I’m MarkAI. Ask me about Mark’s projects, technical skills, experience, collaborators, goals, interests, testimonials, or résumé.
```

## Live smoke transcript — `live-smoke-who-is-session-daily-limit`

- Mode: `session_daily_limit`

### Turn 1

**User**

```text
who is mark yoingco
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `session_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow.

```text
Mark Yoingco is from Chicago and graduated from Marquette University with a B.S. in Computer Science. He builds software and technical projects through a personal portfolio platform with MarkAI, senior-design work such as Abacus and TA-Bot / MAAT, coursework projects like Finch, and related systems, data, and Unity work. He also has student-manager and campus leadership experience. He is seeking an entry-level technology role focused on practical software development and continued growth.
```

## Live smoke transcript — `live-smoke-hire-session-daily-limit`

- Mode: `session_daily_limit`

### Turn 1

**User**

```text
why should someone hire mark
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `session_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow.

```text
Someone should hire Mark for entry-level technology work because he ships practical software projects, independently owns the portfolio platform and MarkAI, contributed to two senior-design projects (Abacus and TA-Bot / MAAT), and consistently invests in debugging, testing, documentation, communication, and teamwork. Student-manager leadership and a clear willingness and ability to learn strengthen the case. MarkAI does not claim internship experience, professional software-engineering employment, senior-level experience, or unsupported business impact.
```

## Live smoke transcript — `live-smoke-skills-typo-session-daily-limit`

- Mode: `session_daily_limit`

### Turn 1

**User**

```text
what are marks stongest technical skills
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `session_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow.

```text
Mark’s strongest technical skills are capability-first: React frontend development, full-stack application development, Python/Flask and PHP backend integration, MySQL and SQL database work, REST API and client-server integration, debugging, testing, and validation, Git/GitHub team workflows, and technical documentation. Evidence includes the Portfolio Platform and MarkAI, Abacus messaging and competition workflows, TA-Bot / MAAT grading and backend integration, and Finch frontend/controller work. Broader technologies he has used may be listed afterward when asked.
```

## Live smoke transcript — `live-smoke-best-represents-typo-session-daily-limit`

- Mode: `session_daily_limit`

### Turn 1

**User**

```text
which project best rperesnts mark
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `session_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow.

```text
The Personal Portfolio Platform and MarkAI best represent Mark’s independent ownership because they combine design, React frontend work, backend integration, deployment, privacy-aware AI behavior, testing, iteration, and presentation. Abacus and TA-Bot / MAAT are his strongest team-based software projects and should not be described as solo work.
```

## Live smoke transcript — `live-smoke-abacas-typo-session-daily-limit`

- Mode: `session_daily_limit`

### Turn 1

**User**

```text
who worked on abacas
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `session_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow.

```text
Mark worked on Abacus with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The project was a team senior-design effort, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On the Abacus team, Mark Yoingco served as Document Manager, Justin Hoffman as Project Manager, Jacob DunRoseman as Repo Manager, and Angel Mora as Project Manager.
```

## Live smoke transcript — `live-smoke-finch-session-daily-limit`

- Mode: `session_daily_limit`

### Turn 1

**User**

```text
who worked on finch
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `session_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow.

```text
The Finch Web Controller was a team coursework project. Mark worked primarily on frontend development, Figma mockups, controller layouts, setup documentation, and project presentation work. His verified teammates were Julianne Browne, Luis Serrano, and Xavier Barth, along with Mark Yoingco.
```

## Live smoke transcript — `live-smoke-outside-tech-typo-session-daily-limit`

- Mode: `session_daily_limit`

### Turn 1

**User**

```text
what is mark like outside techbnoclogy
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `session_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow.

```text
Outside technology, Mark’s public hobbies include fitness and bodybuilding, travel, travel photography, cinematic and low-exposure photography, hiking, reading, music, cities, streets, architecture, landscapes, water and coastal views, mountains, museums, classical statues, Greek mythology, visual art, cinematic visual design, clean dark minimal high-contrast aesthetics, and spending time with his dog Kobe. Fitness is a source of discipline, structure, patience, and consistency, while photography helps him preserve places, feelings, and perspective.
```

## Live smoke transcript — `live-smoke-hello-global-daily-limit`

- Mode: `global_daily_limit`

### Turn 1

**User**

```text
hello
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `global_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow. Approved portfolio answers may still be available.

```text
Hi - I’m MarkAI. Ask me about Mark’s projects, technical skills, experience, collaborators, goals, interests, testimonials, or résumé.
```

## Live smoke transcript — `live-smoke-who-is-global-daily-limit`

- Mode: `global_daily_limit`

### Turn 1

**User**

```text
who is mark yoingco
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `global_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow. Approved portfolio answers may still be available.

```text
Mark Yoingco is from Chicago and graduated from Marquette University with a B.S. in Computer Science. He builds software and technical projects through a personal portfolio platform with MarkAI, senior-design work such as Abacus and TA-Bot / MAAT, coursework projects like Finch, and related systems, data, and Unity work. He also has student-manager and campus leadership experience. He is seeking an entry-level technology role focused on practical software development and continued growth.
```

## Live smoke transcript — `live-smoke-hire-global-daily-limit`

- Mode: `global_daily_limit`

### Turn 1

**User**

```text
why should someone hire mark
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `global_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow. Approved portfolio answers may still be available.

```text
Someone should hire Mark for entry-level technology work because he ships practical software projects, independently owns the portfolio platform and MarkAI, contributed to two senior-design projects (Abacus and TA-Bot / MAAT), and consistently invests in debugging, testing, documentation, communication, and teamwork. Student-manager leadership and a clear willingness and ability to learn strengthen the case. MarkAI does not claim internship experience, professional software-engineering employment, senior-level experience, or unsupported business impact.
```

## Live smoke transcript — `live-smoke-skills-typo-global-daily-limit`

- Mode: `global_daily_limit`

### Turn 1

**User**

```text
what are marks stongest technical skills
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `global_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow. Approved portfolio answers may still be available.

```text
Mark’s strongest technical skills are capability-first: React frontend development, full-stack application development, Python/Flask and PHP backend integration, MySQL and SQL database work, REST API and client-server integration, debugging, testing, and validation, Git/GitHub team workflows, and technical documentation. Evidence includes the Portfolio Platform and MarkAI, Abacus messaging and competition workflows, TA-Bot / MAAT grading and backend integration, and Finch frontend/controller work. Broader technologies he has used may be listed afterward when asked.
```

## Live smoke transcript — `live-smoke-best-represents-typo-global-daily-limit`

- Mode: `global_daily_limit`

### Turn 1

**User**

```text
which project best rperesnts mark
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `global_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow. Approved portfolio answers may still be available.

```text
The Personal Portfolio Platform and MarkAI best represent Mark’s independent ownership because they combine design, React frontend work, backend integration, deployment, privacy-aware AI behavior, testing, iteration, and presentation. Abacus and TA-Bot / MAAT are his strongest team-based software projects and should not be described as solo work.
```

## Live smoke transcript — `live-smoke-abacas-typo-global-daily-limit`

- Mode: `global_daily_limit`

### Turn 1

**User**

```text
who worked on abacas
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `global_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow. Approved portfolio answers may still be available.

```text
Mark worked on Abacus with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The project was a team senior-design effort, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On the Abacus team, Mark Yoingco served as Document Manager, Justin Hoffman as Project Manager, Jacob DunRoseman as Repo Manager, and Angel Mora as Project Manager.
```

## Live smoke transcript — `live-smoke-finch-global-daily-limit`

- Mode: `global_daily_limit`

### Turn 1

**User**

```text
who worked on finch
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `global_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow. Approved portfolio answers may still be available.

```text
The Finch Web Controller was a team coursework project. Mark worked primarily on frontend development, Figma mockups, controller layouts, setup documentation, and project presentation work. His verified teammates were Julianne Browne, Luis Serrano, and Xavier Barth, along with Mark Yoingco.
```

## Live smoke transcript — `live-smoke-outside-tech-typo-global-daily-limit`

- Mode: `global_daily_limit`

### Turn 1

**User**

```text
what is mark like outside techbnoclogy
```

**MarkAI**

- `answerStatus`: `daily_limit`
- `errorCode`: `global_daily_limit`
- `fallbackUsed`: `true`
- `userNote`: Please try again tomorrow. Approved portfolio answers may still be available.

```text
Outside technology, Mark’s public hobbies include fitness and bodybuilding, travel, travel photography, cinematic and low-exposure photography, hiking, reading, music, cities, streets, architecture, landscapes, water and coastal views, mountains, museums, classical statues, Greek mythology, visual art, cinematic visual design, clean dark minimal high-contrast aesthetics, and spending time with his dog Kobe. Fitness is a source of discipline, structure, patience, and consistency, while photography helps him preserve places, feelings, and perspective.
```

## Summary

- Greeting: 1 scenario(s)
- Profile: 3 scenario(s)
- Skills: 3 scenario(s)
- Projects: 3 scenario(s)
- Collaborators: 3 scenario(s)
- Testimonials: 1 scenario(s)
- Topic switching: 2 scenario(s)
- Fitness: 1 scenario(s)
- Interests: 2 scenario(s)
- Privacy: 2 scenario(s)
- Typos: 1 scenario(s)
- Follow-ups: 1 scenario(s)
- Provider failure: 2 scenario(s)
- Rate limits: 1 scenario(s)
- Live smoke transcript: 40 scenario(s)

- `scenarios=66`
- `sections=15`
- `assertions_passed=351`
- `assertions_failed=0`
- `fixture_transport_invocations=60`
- `live_network_requests=0`

## Suggested one-time live smoke test

After the provider is healthy on DreamHost, Mark only needs something like:

1. `hello`
2. `Who is Mark Yoingco?`
3. `What are his strongest skills?`

Confirm there is no fallback note on those three live answers.

