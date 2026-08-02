/**
 * Local deterministic MarkAI responder.
 * No network, no knowledge export, no persistence.
 */

import {
  normalizeIntentText,
  applyIntentTypos,
  rewriteIntentPronouns,
  matchIntentTopic,
  resolveTopicFollowup,
} from "./intentUnderstanding.js";

const MOCK_DELAY_MS = 400

/** Normalize visitor-facing punctuation dashes to spaced ASCII hyphens. */
export function normalizePublicPunctuation(answer) {
  return String(answer ?? '')
    .replace(/\u2014/g, ' - ')
    .replace(/\u2013/g, ' - ')
    .replace(/&mdash;/gi, ' - ')
    .replace(/&ndash;/gi, ' - ')
    .replace(/ {2,}/g, ' ')
}

const ANSWERS = {
  profile:
    "Mark is from Chicago and graduated from Marquette University with a Bachelor of Science in Computer Science. He is seeking his first full-time technology role. His work includes a personal portfolio platform, senior design projects, systems coursework, robotics, data projects, and Unity projects.",
  abacus:
    "Abacus was a team senior-design project used for the Wisconsin-Dairyland Programming Competition. Mark’s verified work included Eagle messaging APIs, role-aware chat and inbox behavior, competition workflows, routing and persistence, frontend/backend integration, submission-system support, testing, and UI debugging. The April 15, 2026 event used the platform to support approximately 200 - 300 high-school students, teachers, judges, and administrators and ran without major server crashes, platform failures, critical bugs, or major lag.",
  technologies:
    "Mark has worked with technologies including JavaScript, TypeScript, Python, Java, R, SQL, C, C#, PHP, React, Vite, Flask, MySQL, Docker, Socket.IO, Linux/WSL, Unity, Figma, Cloudflare Workers AI, and REST-style APIs through coursework and projects.",
  individualTeam:
    "Mark built his portfolio platform as an individual project. Abacus, MAAT, Finch, Sleep Efficiency Analysis, and the basketball predictor were team or coursework projects, so their team context should remain clear.",
  work: "Mark’s public experience includes AV Technician, Information Desk Specialist Manager, Assistant Building Manager, Hollister retail work, and Panda Express Chef/Person in Charge, along with approved campus leadership experience.",
  contact:
    "The portfolio Contact page is the preferred method. LinkedIn, GitHub, the résumé, and VSCO may also be relevant depending on what a visitor is looking for.",
  links:
    "Mark’s public portfolio links include his homepage, project contact section, GitHub, LinkedIn, résumé, and VSCO profile.",
  sensitive:
    "MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.",
  status:
    "MarkAI is live on markyoingco.com and actively maintained. It answers from Mark’s approved portfolio information using a PHP backend and Cloudflare Workers AI, with response validation, deterministic fallback answers, privacy protections, and anonymous usage limits. Future updates may include bug fixes, testing, design refinement, and approved knowledge expansion.",
  favoriteColor:
    "Mark’s favorite color is black. It fits the minimal, cinematic, high-contrast style he prefers across his portfolio and personal branding, along with clean, organized environments rather than loud or decorative presentation.",
  bodybuilding:
    "Mark has trained consistently for nearly six years. He began lifting because he wanted change and to become a better version of himself. After about a year, he pursued powerlifting for a more structured challenge and won his first meet. He later shifted his primary focus to bodybuilding, where he became more interested in aesthetics, symmetry, control, patience, and consistent long-term progress. Fitness is one of his strongest personal interests and a source of discipline he applies outside the gym.",
  powerlifting:
    "After about a year of lifting, Mark moved into powerlifting because he wanted a more structured challenge and something greater to work toward. He competed in and won his first powerlifting meet, including through Marquette Powerlifting Club support. He later chose bodybuilding as his primary focus. MarkAI does not publish meet names, dates, weight classes, competition totals, or rankings.",
  liftingNumbers:
    "Mark benches over 315 pounds, squats over 450 pounds, and deadlifts over 550 pounds. MarkAI does not publish competition totals, weight classes, rankings, body weight, diet details, or medical information.",
  fitnessTaught:
    "Fitness has become one of Mark’s strongest personal interests and a source of discipline that he applies outside the gym. Training reinforces patience, consistency, structure, and long-term progress that also support how he approaches projects and professional growth.",
  bodybuildingMeaning:
    "Mark later chose bodybuilding as his primary focus because it better connects with his interest in aesthetics, structure, symmetry, control, patience, consistency, and long-term physical development. It remains a major public interest outside technology rather than professional coaching or medical expertise.",
  mythology:
    "Mark connects with Icarus, Achilles, and Heracles through themes such as ambition, intensity, discipline, consequence, and endurance. Greek mythology is a creative and symbolic interest connected to art and classical imagery, not a religion or a psychological profile.",
  mythologyIcarus:
    "For Mark, Icarus connects to ambition, risk, and the consequences of losing control. It is one symbolic interest among several mythological figures, not a permanent identity.",
  mythologyAchilles:
    "For Mark, Achilles connects to intensity, strength, drive, and resilience. It represents one symbolic theme among several, not a permanent favorite.",
  mythologyHeracles:
    "For Mark, Heracles connects to endurance, discipline, repeated effort, and growth through challenging work. It is symbolic interest, not religion.",
  values:
    "Mark values discipline, consistency, responsibility, ownership, ambition, resilience, patience, humility, learning, usefulness, creativity, personal growth, professional independence, controlled confidence, and direct communication. He wants progress to come from repeatable actions rather than temporary intensity.",
  personality:
    "Mark is a recent Computer Science graduate building toward a stable technology career. His work includes a personal portfolio platform, senior-design projects, systems coursework, robotics, data projects, and Unity projects. He works in a practical, collaborative, growth-oriented way. Outside technology, he values quiet confidence, disciplined ambition, creativity, and controlled strength.",
  discipline:
    "Mark values consistency because long-term progress depends on repeatable actions. He applies that mindset to training, software projects, and professional growth rather than relying only on short periods of motivation.",
  consistency:
    "Mark believes consistency is more dependable than temporary intensity. He values doing the work even when motivation is absent and sees repeated controlled effort as the path to progress.",
  controlledStrength:
    "To Mark, controlled strength means having ambition and intensity without letting them control the decision. Discipline gives that energy direction through patience, consistency, and deliberate responses.",
  setbacks:
    "Mark treats challenges as opportunities to improve future decisions. He values learning, adjusting, and continuing to make steady progress in his work and training.",
  builderIdentity:
    "Mark is motivated by turning ideas into working results. He enjoys combining creativity, organization, and practical problem-solving to build something people can actually use.",
  quietAmbition:
    "Mark’s ambition is quiet. He prefers building seriously and letting finished results carry more weight than constant announcements or loud self-promotion.",
  earnedConfidence:
    "Mark wants confidence to come from preparation, follow-through, experience, and continued learning. Compliments help, but demonstrated results matter. That does not mean he never questions himself.",
  drives:
    "Mark is driven by meaningful work, professional growth, independence, discipline, creativity, and the satisfaction of turning ideas into usable results.",
  vibe: "Mark’s public style combines quiet confidence, disciplined ambition, creativity, and controlled strength. He prefers clean systems, cinematic presentation, direct communication, and results that show the work without exaggerated claims.",
  earnedLife:
    "To Mark, an earned life means building stability, independence, responsibility, meaningful work, confidence, and structured freedom he can take genuine pride in.",
  freedomStructure:
    "For Mark, freedom is not the absence of responsibility. He wants greater independence inside a structure that still protects work, fitness, learning, creativity, and travel.",
  leadershipBalance:
    "Mark is willing to lead when he understands the work and can support the team, and he also values knowing when to listen, learn, or let someone else lead. He prefers preparation and usefulness over title alone.",
  learningHumility:
    "Mark treats not knowing something as part of learning. He values clear questions, documentation, repetition, debugging, feedback, and working with other people rather than pretending to understand everything.",
  cityVision:
    "Mark is interested in modern cities, architecture, technology, opportunity, and cinematic environments. Cities represent ambition, opportunity, and professional progress. His exact long-term location can still evolve.",
  perspectiveExploration:
    "Mark values new perspectives as much as new places. Travel, museums, photography, reading, films, music, hiking, and meeting different people help him stay ambitious while remaining grounded and open to learning.",
  remembered:
    "Mark wants to be remembered for what he built, how he worked, and what he followed through on. Visibility without substance is not the goal.",
  becoming:
    "Mark sees himself as still evolving. The direction is clear - more discipline, responsibility, confidence, skill, and independence - even if the exact final version continues to change.",
  futureVision:
    "Mark wants a growing technology career, an active and disciplined lifestyle, continued learning, creative interests, and greater independence.",
  hobbies:
    "Outside technology, Mark’s public hobbies include fitness and bodybuilding, travel, travel photography, cinematic and low-exposure photography, hiking, reading, music, cities, streets, architecture, landscapes, water and coastal views, mountains, museums, classical statues, Greek mythology, visual art, cinematic visual design, clean dark minimal high-contrast aesthetics, and spending time with his dog Kobe. Fitness is a source of discipline, structure, patience, and consistency, while photography helps him preserve places, feelings, and perspective.",
  cooking:
    "Cooking is not part of MarkAI’s current approved public hobby list. You can ask about approved interests such as fitness, travel, photography, music, hiking, museums, and mythology.",
  dog: "Mark has a dog named Kobe. He enjoys spending time with him and sometimes affectionately calls Kobe his son. That nickname is for his dog only and is not a human-child or family claim. MarkAI does not share identifying pet details, age, or private schedules.",
  friendsFamily:
    "MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.",
  museums:
    "Mark enjoys museums, especially where they connect to photography, classical art, architecture, statues, history, and visual storytelling.",
  passion:
    "Mark is passionate about building useful software and about bodybuilding outside technology. In both areas he focuses on disciplined practice, steady improvement, and work he can stand behind.",
  favoriteArtists:
    "Mark’s favorite artists include Drake, Lil Baby, Tory Lanez, The Weeknd, Don Toliver, Travis Scott, and PARTYNEXTDOOR. His taste leans toward melodic rap, R&B, atmospheric production, and music that works for both training and reflection.",
  favoriteArtistsWorkout:
    "Mark’s broader music interests often fit training and personal reflection. His favorite artists include Drake, Lil Baby, Tory Lanez, The Weeknd, Don Toliver, Travis Scott, and PARTYNEXTDOOR, spanning energetic tracks and darker, atmospheric moods.",
  favoriteFilms:
    "MarkAI does not currently publish a verified list of Mark’s favorite movie titles. You can ask about approved public interests such as music, fitness, travel, photography, hiking, reading, museums, mythology, and cinematic visual design.",
  favoriteFilmsMarvelDc:
    "MarkAI does not currently publish verified favorite movie or franchise rankings. Approved public interests include music, fitness, travel, photography, and cinematic visual design.",
  favoriteFilmsCreed:
    "MarkAI does not currently publish verified favorite movie titles, including specific film names.",
  favoriteFilmsBatman:
    "MarkAI does not currently publish verified favorite movie titles, including specific film names.",
  favoriteShow:
    "MarkAI does not currently publish a verified list of Mark’s favorite shows or movie titles.",
  careerGoals:
    "Mark is working toward a stable technology career built on continued technical growth, meaningful work, stronger software projects, greater independence, and continued discipline and creativity. He remains open to software development, full-stack applications, developer tools, data-oriented systems, technical support, and related entry-level technology paths.",
  success:
    "For Mark, success means career stability, professional growth, independence, meaningful work, physical discipline, and pride in earned progress. A title alone is not enough; he wants to know he built something useful and followed through.",
  overview:
    "Mark is a recent Computer Science graduate from Marquette University, from Chicago, seeking an entry-level technology role. His public work includes a personal portfolio platform with MarkAI, senior-design projects such as Abacus and TA-Bot / MAAT, Finch, systems coursework, robotics, data projects, and Unity games. He works in a practical, collaborative, growth-oriented way with quiet confidence, disciplined ambition, creativity, and controlled strength. Career interests include software development, full-stack applications, developer tools, data-oriented systems, and technical support or systems roles. Outside technology, approved interests include fitness and bodybuilding, travel and photography, hiking, reading, music, cities and architecture, museums, Greek mythology, cinematic visual design, and his dog Kobe. His favorite color is black.",
  workLocation:
    "Mark is seeking entry-level technology roles and is drawn to city environments that support ambition, architecture, technology, and professional progress. He is from Chicago and remains open to Chicago opportunities and suitable roles as his search evolves. MarkAI does not share a precise current residence or private move logistics.",
  travelAndWork:
    "Public travel places shown in Mark’s portfolio include Hawaii, Las Vegas, Chicago, California, Lake Louise in Canada, Manila in the Philippines, London, the Amalfi Coast in Italy, Rome in Italy, Milwaukee, and Nashville. For work, he is seeking entry-level technology roles, is drawn to city environments, is from Chicago, and remains open to Chicago opportunities and suitable roles. MarkAI does not share a precise current residence.",
  funFacts:
    "Here are several approved fun facts about Mark:\n\n- Bodybuilding is his strongest interest outside technology.\n- Favorite artists include Drake, Lil Baby, Tory Lanez, The Weeknd, Don Toliver, Travis Scott, and PARTYNEXTDOOR.\n- He likes photography and travel, plus museums and hiking.\n- He is interested in Greek mythology and classical statues and art.\n- His favorite color is black, and he prefers a dark cinematic visual style.\n- Outside work he also enjoys reading, music, and spending time with his dog Kobe.",
  capabilities:
    "You can ask about Mark’s projects, skills, education, experience, collaborators, goals, personality, hobbies, music, fitness, travel, testimonials, résumé, or public links.\n\nExamples:\n- “What did Mark build for Abacus?”\n- “What are his strongest skills?”\n- “What are Mark’s goals?”\n- “What music does he like?”\n- “Who did he work with on MAAT?”\n- “Can I see the Finch repository?”\n- “What does Mark do outside technology?”",
  familyGoals:
    "MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.",
  photography:
    "Mark uses photography to preserve feelings, places, views, memories, and important moments. He prefers cinematic, personal, dark, low-exposure, story-driven images of cities, architecture, landscapes, museums, and travel experiences.",
  travel:
    "Travel helps Mark experience different environments, people, cultures, architecture, and ways of living. It gives him new perspectives and motivates greater freedom and independence. Cities connect to ambition and energy, coastal environments to peace, and mountains and hiking to effort that earns the view.",
  travelPlaces:
    "Places shown in Mark’s public portfolio travel content include Hawaii, Las Vegas, Chicago, California, Lake Louise in Canada, Manila in the Philippines, London, the Amalfi Coast in Italy, Rome in Italy, Milwaukee, and Nashville. The Travel section and VSCO gallery are the best places to view related photography.",
  environment:
    "Mark prefers clean, organized, minimal environments with a cinematic mix of classical architecture, statues, modern technology, city lights, rooftops, and controlled darkness. He likes a modern technical-professional atmosphere and dislikes corny or overly decorative presentation.",
  collaboratorsAbacus:
    "Mark worked on Abacus with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The project was a team senior-design effort, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On the Abacus team, Mark Yoingco served as Document Manager, Justin Hoffman as Project Manager, Jacob DunRoseman as Repo Manager, and Angel Mora as Project Manager.",
  collaboratorsMaat:
    "Mark worked on TA-Bot / MAAT with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The project was a team senior-design effort, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. The core student team was Mark Yoingco, Justin Hoffman, Jacob DunRoseman, and Angel Mora.",
  collaboratorsSam:
    "MarkAI provides only Mark’s approved public project and collaborator information.",
  collaboratorsFinch:
    "The Finch Web Controller was a team coursework project. Mark worked primarily on frontend development, Figma mockups, controller layouts, setup documentation, and project presentation work. His verified teammates were Julianne Browne, Luis Serrano, and Xavier Barth, along with Mark Yoingco.",
  collaboratorsDataMining:
    "The Data Mining Game Predictor team included Mark Yoingco and Allan Akkathara.",
  collaboratorsOs:
    "For Operating Systems C Projects, the approved collaborator names are Mark Yoingco and Armaan Yaz. Private or shared course repositories remain unpublished.",
  collaboratorsSleep:
    "For the Sleep Efficiency Analysis data-science project, the approved collaborator names are Mark Yoingco and Hunter Carlson.",
  collaboratorsInventory:
    "Mark’s approved project collaborators, by project:\n\n- Abacus: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman\n- TA-Bot / MAAT: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman\n- Finch: Mark Yoingco, Julianne Browne, Luis Serrano, Xavier Barth\n- Data Mining: Mark Yoingco, Allan Akkathara\n- Operating Systems: Mark Yoingco, Armaan Yaz\n- Sleep Analysis: Mark Yoingco, Hunter Carlson",
  collaboratorsJustin:
    "Justin Hoffman was Project Manager on Mark’s Abacus senior-design team and was also part of the core student team for TA-Bot / MAAT with Mark Yoingco, Jacob DunRoseman, and Angel Mora.",
  collaboratorsAngel:
    "Angel Mora was a Project Manager on Mark’s Abacus senior-design team and was also part of the core student team for TA-Bot / MAAT with Mark Yoingco, Justin Hoffman, and Jacob DunRoseman.",
  collaboratorsJacob:
    "Jacob DunRoseman served as Repo Manager on the senior-design team that worked on Abacus and TA-Bot / MAAT with Mark Yoingco, Justin Hoffman, and Angel Mora.",
  collaboratorsLuis:
    "Luis Serrano was a verified teammate on the Finch Web Controller coursework project with Mark Yoingco, Julianne Browne, and Xavier Barth.",
  collaboratorsXavier:
    "Xavier Barth was a verified teammate on the Finch Web Controller coursework project with Mark Yoingco, Julianne Browne, and Luis Serrano.",
  collaboratorsJulianne:
    "Julianne Browne was a verified teammate on the Finch Web Controller coursework project with Mark Yoingco, Luis Serrano, and Xavier Barth.",
  collaboratorsAllan:
    "Allan Akkathara worked with Mark on the Data Mining Game Predictor (Marquette Basketball Predictor).",
  seniorDesignTeam:
    "Mark worked on Abacus and TA-Bot / MAAT with Justin Hoffman, Jacob DunRoseman, and Angel Mora. The projects were team senior-design efforts, and Mark’s portfolio distinguishes his individual contributions from the team’s overall work. On Abacus, Mark Yoingco was Document Manager, Justin Hoffman was Project Manager, Jacob DunRoseman was Repo Manager, and Angel Mora was Project Manager.",
  fromChicago: "Mark is from Chicago.",
  locationPrivacy:
    "MarkAI does not provide precise or current location information. Mark’s approved public background states that he is from Chicago.",
  testimonials:
    "Mark’s portfolio Testimonials section includes attributed recommendations from professors, supervisors, coworkers, and collaborators.\n\nAcross those testimonials, recurring themes include initiative, composure under pressure, thoroughness, ownership, reliability, integrity, ambition, leadership by example, and strong work ethic.\n\nRepresentative perspectives, in portfolio order, include:\n- Farzeen Harunani — Professor of Computer Science, Marquette University — notes Mark’s initiative, composure, dedication, and eagerness to learn.\n- Jorge Torres — Staff Validation Engineer, Performance Validation — emphasizes Mark’s thoroughness, curiosity, reliability, and ownership.\n- Zack Kohlwey — Assistant Director, Alumni Memorial Union, Marquette University — highlights Mark’s dedication, work ethic, integrity, and leadership by example.\n\nThese are summaries of attributed opinions, not direct quotations. Full testimonials are available in the portfolio Testimonials section.",
  testimonialsList:
    "Here are the people currently featured in Mark’s Testimonials section:\n\n- Farzeen Harunani — Professor of Computer Science, Marquette University\n  Professional connection: Testimonial contributor.\n\n- Jorge Torres — Staff Validation Engineer, Performance Validation\n  Professional connection: Former Marquette University coworker and fellow student manager.\n\n- Zack Kohlwey — Assistant Director, Alumni Memorial Union, Marquette University\n  Professional connection: Mark’s supervisor at Marquette University, as stated in his attributed testimonial.\n\n- Nathan Garcia — IT Supply Chain Intern, Zebra Technologies\n  Professional connection: Longtime friend and former Panda Express coworker.\n\n- Jarenz Masiclat — Investment Associate, Northern Trust\n  Professional connection: Longtime friend, fraternity mentor, and Filipino Student Organization mentor.\n\n- Elizabeth Anderson — Data Analyst Intern, ComEd\n  Professional connection: Testimonial contributor.\n\n- Maxwell Zeisler — Audit Intern, Advisent, LLC\n  Professional connection: Testimonial contributor.\n\n- Andrew Wochner — Cardiac ICU Registered Nurse, Ascension Columbia St. Mary's Hospital\n  Professional connection: College friend from Marquette University.\n\nFull attributed testimonials are available in the portfolio’s Testimonials section.",
  testimonialProfessors:
    "From the published Testimonials section, the professor testimonial currently featured is:\n\n- Farzeen Harunani — Professor of Computer Science, Marquette University\n  Professional connection: Testimonial contributor.\n\nFull attributed testimonials are available in the portfolio’s Testimonials section.",
  testimonialCoworkers:
    "From the published Testimonials section, contributors with an explicit coworker connection are:\n\n- Jorge Torres — Staff Validation Engineer, Performance Validation\n  Professional connection: Former Marquette University coworker and fellow student manager.\n\n- Nathan Garcia — IT Supply Chain Intern, Zebra Technologies\n  Professional connection: Longtime friend and former Panda Express coworker.\n\nFull attributed testimonials are available in the portfolio’s Testimonials section.",
  testimonialZack:
    "Zack Kohlwey — Assistant Director, Alumni Memorial Union, Marquette University.\n\nSummary of his attributed testimonial: Zack writes that he supervised Mark for about two and a half years at Marquette University, hired Mark as a University Information Specialist, later promoted him to Student Manager, and emphasizes Mark’s dedication, work ethic, integrity, ambition, relationship-building, and leadership by example. This is a summary, not a direct quotation.",
  testimonialZackQuote:
    "Zack Kohlwey — Assistant Director, Alumni Memorial Union, Marquette University — wrote:\n\nI have known Mark for two and a half years, and I was his supervisor at Marquette University. I have had the opportunity to observe Mark’s dedication, work ethic, and values driven decision making firsthand. He respects all individuals and has the ability to form true relationships and friendships with a wide range of people and thinks of the staff as a team.\n\nI hired Mark as a University Information Specialist at the student union’s Information Desk. Not even a year into working, I promoted Mark to Student Manager. His integrity and ambition stood out to me, and that is what ultimately led me to promote him. He understood how his choices and decisions at the desk made an impact on others as this role was the initial interaction that someone had with the university as they walked into the building or called. Mark definitely embraced challenges as learning moments for personal growth, and he exceled at being a role model and leader by example.",
  testimonialFarzeen:
    "Farzeen Harunani — Professor of Computer Science, Marquette University.\n\nSummary of her attributed testimonial: Farzeen describes Mark’s initiative when seeking research and career advice, composure under pressure, dedication, and eagerness to learn. Her published title is Professor of Computer Science, Marquette University, and her attributed testimonial states that Mark took three classes with her. This is a summary, not a direct quotation.",
  testimonialFarzeenQuote:
    "Farzeen Harunani — Professor of Computer Science, Marquette University — wrote:\n\nThe first time I met Mark Yoingco one-on-one was when he came into my office seeking research and career advice. It was the second week of his senior year, and he was enrolled in the capstone class with me. He wanted to know which year-long project would be the most beneficial to him, longterm. This, in itself, showed a rare level of initiative.\n\nHe took three classes with me, and impressed me with his unflappable demeanor and dedication to getting the job done. No matter how tight the deadlines might be, Mark does not ever let on if he is stressed. He is eager to learn, to improve, and to commit to every endeavor with a smile.",
  testimonialJorge:
    "Jorge Torres — Staff Validation Engineer, Performance Validation.\n\nCanonical relationship text from the portfolio: Former Marquette University coworker and fellow student manager.\n\nSummary of his attributed testimonial: Jorge emphasizes Mark’s thoroughness, curiosity, reliability, ownership, and work ethic. This is a summary, not a direct quotation.",
  testimonialJorgeQuote:
    "Jorge Torres — Staff Validation Engineer, Performance Validation — wrote:\n\nI've known Mark since my junior year of college, and in that time I've come to know him as someone who takes the time to fully understand every task before diving in, no matter how big or small. He never settles for surface-level work - whether he's reviewing code and software comments or testing and documenting a project's performance, he holds himself to a high standard of accuracy and thoroughness.\n\nMark is one of the hardest-working individuals I've had the pleasure of working with. He approaches every project with genuine curiosity, taking the time to ask the right questions and dig into the \"why\" behind a problem rather than just executing tasks on the surface. That mindset consistently translates into higher-quality, more reliable work.\n\nI had the opportunity to work alongside Mark as a Student Manager, which gave me a front-row seat to his work ethic and attention to detail. He was consistently reliable, communicated clearly about progress and roadblocks, and took genuine ownership of the quality of his output. Watching him grow and take on more responsibility over that time was genuinely impressive.\n\nProfessionally, Mark is an outstanding individual who would be an asset to any team he's a part of, thanks to his incredibly diverse skill set and unwavering dedication to doing things right.",
  testimonialsAllQuotes:
    "Full attributed quotations are available speaker-by-speaker. Ask for a person by name for a word-for-word attributed quotation, or open the portfolio’s Testimonials section for every published testimonial.",
  projectsInventory:
    "Mark’s approved public software projects include:\n\n- Portfolio & AI: Personal Portfolio Platform; MarkAI\n- Capstones: Abacus; TA-Bot / MAAT\n- Systems: Operating Systems C Projects\n- Robotics & Software Design: Finch Robot Web Controller\n- Games: Space SHMUP; Apple Picker; Mission Demolition\n- Data: Sleep Efficiency Analysis; Marquette Basketball Predictor\n\nThe portfolio platform and MarkAI are solo personal work. Abacus, MAAT, Finch, and the data projects were team or coursework collaborations.",
  githubOnly:
    "Mark’s public GitHub profile is available through the safe link below. If you have a specific project in mind, ask for that repository by name.",
  resume:
    "Mark’s public résumé is available as a PDF through the safe link below.",
  fallback:
    "I may be missing the intended topic. You can ask about Mark’s projects, skills, experience, goals, interests, collaborators, résumé, or public links.",
  fmsc: "Mark has public volunteer service experience with Feed My Starving Children, shown in the Portfolio Service section. A public FMSC location page is available through the safe link below. MarkAI does not share private organization, member, schedule, or internal details.",
  merchSigma:
    "Sigma Chi merchandise design is shown in Mark’s Portfolio Merch section. It does not have a separate public software repository; the Portfolio section is the approved place to view it.",
};

function includesAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

function historyContext(history) {
  return (Array.isArray(history) ? history.slice(-6) : [])
    .map((turn) =>
      String(turn?.content || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .join(" ");
}

function historySuggestsTestimonials(history) {
  const context = historyContext(history);
  if (!context) return false;
  const hasTestimonial = includesAny(context, [
    "testimonial",
    "testimonials",
    "recommendation",
    "recommendations",
    "reference",
    "references",
    "farzeen harunani",
    "jorge torres",
    "zack kohlwey",
    "alumni memorial union",
    "professor of computer science",
    "staff validation engineer",
    "testimonials section",
    "attributed",
  ]);
  if (!hasTestimonial) return false;
  return !historyHasProjectTeamTopic(context);
}

function historyHasProjectTeamTopic(context) {
  return includesAny(String(context || "").toLowerCase(), [
    "abacus",
    "eagle messaging",
    "maat",
    "ta-bot",
    "tabot",
    "finch",
    "birdvroom",
    "senior design",
    "document manager",
    "repo manager",
    "justin hoffman",
    "angel mora",
    "jacob dunroseman",
    "luis serrano",
    "xavier barth",
    "julianne browne",
    "allan akkathara",
    "armaan yaz",
    "hunter carlson",
    "project collaborators, by project",
    "verified teammates",
    "core student team",
    "operating systems c",
    "data mining game",
    "sleep efficiency analysis",
  ]);
}

function hasProjectTeamCues(haystack) {
  return includesAny(String(haystack || "").toLowerCase(), [
    "project",
    "team",
    "teammate",
    "teammates",
    "classmate",
    "classmates",
    "collaborator",
    "collaborators",
    "senior design",
    "abacus",
    "eagle",
    "maat",
    "ta-bot",
    "tabot",
    "finch",
    "birdvroom",
    "worked on",
    "worked with",
    "justin",
    "hoffman",
    "angel",
    "mora",
    "jacob",
    "dunroseman",
    "luis",
    "serrano",
    "xavier",
    "barth",
    "julianne",
    "browne",
    "allan",
    "akkathara",
    "armaan",
    "hunter carlson",
    "document manager",
    "repo manager",
    "operating systems",
    "data mining",
    "sleep analysis",
  ]);
}

function isTestimonialFollowupContext(text, history) {
  if (!historySuggestsTestimonials(history)) return false;
  if (hasProjectTeamCues(text)) return false;
  const normalized = text.trim().replace(/[?.!]+$/g, "");
  return (
    includesAny(text, [
      "whole list",
      "list of names",
      "all names",
      "who else",
      "their relationship",
      "relationship with mark",
      "how do they know",
      "how does he know",
      "how does she know",
      "full quotes",
      "all full quotes",
      "which one",
      "which ones",
      "professors",
      "coworkers",
      "supervisor",
      "who wrote",
      "who gave",
    ]) ||
    [
      "whole list",
      "all names",
      "who else",
      "names",
      "list",
      "list names",
      "relationships",
      "relationship",
      "full quotes",
      "all full quotes",
      "professors",
      "coworkers",
      "supervisor",
    ].includes(normalized)
  );
}

function resolveTestimonialsAnswer(text, history = []) {
  const wantsQuote = includesAny(text, [
    "full quote",
    "exact quote",
    "word for word",
    "direct quote",
    "full testimonial",
    "full quotes",
    "all full quotes",
  ]);
  let answer = ANSWERS.testimonials;
  let category = "testimonials";
  const ctx = historyContext(history);

  const personZack =
    includesAny(text, [
      "zack",
      "kohlwey",
      "supervisor testimonial",
      "who supervised",
      "who promoted",
      "how does zack know",
      "came from his supervisor",
      "from his supervisor",
      "which one was his supervisor",
    ]) ||
    (wantsQuote &&
      (ctx.includes("zack") ||
        ctx.includes("kohlwey") ||
        ctx.includes("alumni memorial")));
  const personFarzeen =
    includesAny(text, [
      "farzeen",
      "harunani",
      "professor testimonial",
      "was farzeen",
      "how does farzeen know",
    ]) ||
    (wantsQuote &&
      (ctx.includes("farzeen") ||
        ctx.includes("harunani") ||
        ctx.includes("professor of computer science")));
  const personJorge =
    includesAny(text, ["jorge", "torres", "how does jorge know"]) ||
    (wantsQuote &&
      (ctx.includes("jorge") ||
        ctx.includes("torres") ||
        ctx.includes("performance validation")));

  const wantsList = includesAny(text, [
    "whole list",
    "list of names",
    "all names",
    "who gave",
    "every person",
    "every name",
    "complete list",
    "full list",
    "relationship with mark",
    "relationship to mark",
    "their relationship",
    "how do they know",
    "which people were",
    "each person’s relationship",
    "each person's relationship",
    "each persons relationship",
  ]);
  const wantsProfessors =
    includesAny(text, [
      "from professors",
      "came from professors",
      "which ones were professors",
      "which testimonials came from professors",
    ]) &&
    !includesAny(text, ["coworkers", "supervisors", "collaborators"]);
  const wantsCoworkers =
    includesAny(text, [
      "from coworkers",
      "came from coworkers",
      "which ones were coworkers",
      "which testimonials came from coworkers",
    ]) &&
    !includesAny(text, ["professors", "supervisors", "collaborators"]);
  const wantsAllQuotes = includesAny(text, ["all full quotes", "all quotes"]);

  if (wantsAllQuotes) {
    category = "testimonialsList";
    answer =
      ANSWERS.testimonialsAllQuotes ||
      "Full attributed quotations are available in the portfolio’s Testimonials section. Ask for a speaker by name for a word-for-word attributed quotation.";
  } else if (personZack && !wantsList) {
    category = "testimonialZack";
    answer = wantsQuote ? ANSWERS.testimonialZackQuote : ANSWERS.testimonialZack;
  } else if (personFarzeen && !wantsList) {
    category = "testimonialFarzeen";
    answer = wantsQuote
      ? ANSWERS.testimonialFarzeenQuote
      : ANSWERS.testimonialFarzeen;
  } else if (personJorge && !wantsList) {
    category = "testimonialJorge";
    answer = wantsQuote
      ? ANSWERS.testimonialJorgeQuote
      : ANSWERS.testimonialJorge;
  } else if (wantsProfessors) {
    category = "testimonialProfessors";
    answer = ANSWERS.testimonialProfessors;
  } else if (wantsCoworkers) {
    category = "testimonialCoworkers";
    answer = ANSWERS.testimonialCoworkers;
  } else if (
    wantsList ||
    (isTestimonialFollowupContext(text, history) &&
      includesAny(text, ["list", "names", "relationship", "who else", "how do they know"]))
  ) {
    category = "testimonialsList";
    answer = ANSWERS.testimonialsList;
  } else if (includesAny(text, ["strongest testimonial"])) {
    category = "testimonialZack";
    answer =
      "MarkAI does not rank testimonials. A commonly requested professional recommendation is from Zack Kohlwey — Assistant Director, Alumni Memorial Union, Marquette University. " +
      ANSWERS.testimonialZack;
  } else if (wantsQuote) {
    answer =
      "MarkAI can share an exact attributed quotation when you name the speaker, for example “Zack’s full quote?” or “Farzeen full quote?”. Full testimonials are also available in the portfolio Testimonials section.";
  }

  return {
    category,
    mode: "recruiter",
    answer,
    answerStatus: "answered",
  };
}

function resolveFollowupFromHistory(text, history) {
  const topicFollowUp = resolveTopicFollowup(text, history, ANSWERS);
  if (topicFollowUp) return topicFollowUp;

  if (isTestimonialFollowupContext(text, history)) {
    return resolveTestimonialsAnswer(text, history);
  }

  const normalized = text.trim().replace(/[?.!]+$/g, "");
  const isRepoFollowUp =
    includesAny(text, [
      "repo?",
      "repository?",
      "github repo",
      "source code",
      "show me the code",
      "can i see the code",
      "where is the project",
      "can i see this project",
      "give me the repo",
      "what repository",
      "website repository",
      "project repository",
      "see the repository",
      "see the repo",
    ]) ||
    ["repo", "repository", "code", "github repo", "source"].includes(
      normalized,
    ) ||
    (includesAny(text, ["repository", "repo"]) &&
      includesAny(text, [
        "portfolio",
        "abacus",
        "finch",
        "maat",
        "shmup",
        "apple picker",
        "mission demolition",
        "sleep",
        "basketball",
        "operating systems",
      ]));

  const isPhotosFollowUp = ["photos", "photo", "photography"].includes(
    normalized,
  );
  if (!isRepoFollowUp && !isPhotosFollowUp) return null;

  const context = historyContext(history);

  if (isPhotosFollowUp) {
    if (
      includesAny(context, [
        "outside technology",
        "hobbies",
        "travel",
        "photography",
        "for fun",
        "free time",
      ]) ||
      context !== ""
    ) {
      return {
        category: "travelPlaces",
        mode: "casual",
        answer:
          "Mark’s travel photography is available through the Travel section and VSCO gallery below.",
        answerStatus: "answered",
      };
    }
  }

  if (!isRepoFollowUp) return null;

  const projectMap = [
    ["abacus", "abacus"],
    ["eagle", "abacus"],
    ["maat", "maat"],
    ["ta-bot", "maat"],
    ["tabot", "maat"],
    ["finch", "finch"],
    ["birdvroom", "finch"],
    ["portfolio", "portfolioPlatform"],
    ["marks-portfolio", "portfolioPlatform"],
  ];
  for (const [needle, category] of projectMap) {
    if (context.includes(needle) || text.includes(needle)) {
      return {
        category,
        mode: "technical",
        answer: "You can view the project’s public repository below.",
        answerStatus: "answered",
      };
    }
  }

  if (includesAny(context, ["sigma chi", "merch"])) {
    return {
      category: "merchSigma",
      mode: "casual",
      answer: ANSWERS.merchSigma,
      answerStatus: "answered",
    };
  }

  if (context === "") {
    return {
      category: "githubOnly",
      mode: "technical",
      answer: ANSWERS.githubOnly,
      answerStatus: "answered",
    };
  }

  return {
    category: "noPublicRepo",
    mode: "technical",
    answer:
      "That project does not currently have an approved public repository link, but you can view it in Mark’s Portfolio section.",
    answerStatus: "answered",
  };
}

function classifyQuestion(rawQuestion, history = []) {
  let text = applyIntentTypos(normalizeIntentText(rawQuestion));
  text = text
    .replaceAll("there relationship", "their relationship")
    .replaceAll("there relations", "their relations");

  if (
    includesAny(text, [
      "phone",
      "email address",
      "raw email",
      "password",
      "credential",
      "private repository",
      "private repo",
      "girlfriend",
      "boyfriend",
      "breakup",
      "romantic",
      "romantic relationship",
      "romantic relationships",
      "dating",
      "dating relationship",
      "relationship status",
      "relationship history",
      "private relationship",
      "private relationships",
      "personal relationship",
      "personal relationships",
      "mark’s relationships",
      "mark's relationships",
      "marks relationships",
      "his relationships",
      "who is mark dating",
      "who has mark been involved",
      "been involved with",
      "who is mark involved",
      "tell me about mark’s romantic",
      "tell me about mark's romantic",
      "tell me about private family relationships",
      "private family relationships",
      "lonely",
      "loneliness",
      "sadness",
      "depression",
      "anxiety",
      "mental health",
      "mental-health",
      "therapy",
      "medical",
      "health history",
      "diagnosis",
      "lung",
      "finances",
      "financial hardship",
      "financial problems",
      "struggling with money",
      "money situation",
      "being broke",
      "is mark broke",
      "mark broke",
      "why does mark need money",
      "why does he need money",
      "need money",
      "how much money",
      "what salary",
      "salary does mark need",
      "family financial",
      "family’s financial",
      "family's financial",
      "addiction",
      "substance",
      "drugs",
      "family problems",
      "family conflict",
      "family issues",
      "tell me about mark’s family",
      "tell me about mark's family",
      "tell me about marks family",
      "about mark’s family",
      "about mark's family",
      "about his family",
      "mark’s family",
      "mark's family",
      "his family",
      "friends and family",
      "with friends and family",
      "time with family",
      "spending time with family",
      "human son",
      "have a human son",
      "does mark have a human son",
      "mark have a human son",
      "home life",
      "private struggle",
      "private problems",
      "private messages",
      "private contact",
      "private contact details",
      "private phone",
      "private phone number",
      "where exactly does mark live",
      "exact address",
      "precise residence",
      "private journal",
      "private diary",
      "show me mark’s private journal",
      "show me mark's private journal",
      "mental health issues",
      "mental-health issues",
      "what addictions",
      "addictions has mark",
      "credentials",
      "api token",
      "api tokens",
      "emotional low",
      "self-pity",
      "precise location",
      "home address",
      "what does family mean",
      "family mean to his goals",
      "family mean to mark",
      "support his family",
      "supporting family",
      "why support his family",
      "why does he want to support",
      "need to support his family",
      "need to support family",
      "does mark need to support",
      "depend on his family",
      "depending on family",
    ])
  ) {
    return {
      category: "sensitive",
      mode: "general",
      answer: ANSWERS.sensitive,
      answerStatus: "refused",
    };
  }

  text = rewriteIntentPronouns(text, history);

  const followUp = resolveFollowupFromHistory(text, history);
  if (followUp) return followUp;

  const earlyIntent = matchIntentTopic(text, ANSWERS);
  if (earlyIntent) return earlyIntent;

  if (
    includesAny(text, [
      "is markai live",
      "markai status",
      "connected",
      "real ai",
      "preview",
    ]) ||
    (text.includes("markai") &&
      includesAny(text, ["live", "status", "ready", "working"]))
  ) {
    return {
      category: "status",
      mode: "general",
      answer: ANSWERS.status,
      answerStatus: "answered",
    };
  }

  if (includesAny(text, ["fmsc", "feed my starving", "starving children"])) {
    return {
      category: "fmsc",
      mode: "casual",
      answer: ANSWERS.fmsc,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "sigma chi merch",
      "sigma chi merchandise",
      "merch design",
      "about sigma chi merch",
      "about sigma chi merchandise",
    ])
  ) {
    return {
      category: "merchSigma",
      mode: "casual",
      answer: ANSWERS.merchSigma,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "all existing links",
      "all links",
      "show me mark’s links",
      "show me mark's links",
      "show me marks links",
      "give me all links",
      "give me every link",
      "give me his links",
      "mark’s links",
      "mark's links",
      "marks links",
      "find mark online",
      "where can i find mark",
      "github and linkedin",
      "linkedin and github",
      "give me his github",
      "give me his linkedin",
      "public links",
      "portfolio links",
    ])
  ) {
    return {
      category: "links",
      mode: "general",
      answer: ANSWERS.links,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, ["abacus", "eagle", "messaging"]) &&
    !includesAny(text, [
      "abacus team",
      "on the abacus",
      "worked on abacus",
      "who was on abacus",
      "who worked on abacus",
      "sam mazzone",
    ])
  ) {
    return {
      category: "abacus",
      mode: "technical",
      answer: ANSWERS.abacus,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "list every project",
      "list all mark’s projects",
      "list all mark's projects",
      "list all marks projects",
      "list out every project",
      "list all projects",
      "what projects has mark",
      "what projects did mark",
      "what has mark built",
      "what has mark worked on",
      "what mark has built",
      "what mark worked on",
      "software projects",
      "project portfolio",
      "project list",
      "all projects",
      "every project",
      "summarize mark’s technical work",
      "summarize mark's technical work",
      "summarize marks technical work",
      "technical work",
      "built in college",
      "build in college",
      "personal projects",
      "projects has he completed",
      "projects he completed",
      "projects mark has done",
      "projects mark has",
      "show me his projects",
      "give me his projects",
      "give me his project portfolio",
      "show me his software projects",
    ])
  ) {
    return {
      category: "projectsInventory",
      mode: "technical",
      answer: ANSWERS.projectsInventory,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "sam mazzone",
      "did sam mazzone",
      "did sam work",
      "was sam",
      "what was sam",
      "sam’s role",
      "sam's role",
      "sams role",
      "who was sam",
    ])
  ) {
    return {
      category: "collaboratorsSam",
      mode: "general",
      answer: ANSWERS.collaboratorsSam,
      answerStatus: "refused",
    };
  }

  if (
    includesAny(text, [
      "abacus team",
      "on the abacus",
      "worked on abacus",
      "who was on abacus",
      "who worked on abacus",
    ])
  ) {
    return {
      category: "collaboratorsAbacus",
      mode: "technical",
      answer: ANSWERS.collaboratorsAbacus,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "maat team",
      "ta-bot team",
      "tabot team",
      "worked on ta-bot",
      "worked on maat",
      "helped with maat",
      "helped with ta-bot",
      "who worked on ta-bot",
      "who helped with maat",
      "who worked on maat",
      "who was on ta-bot",
      "who was on maat",
    ])
  ) {
    return {
      category: "collaboratorsMaat",
      mode: "technical",
      answer: ANSWERS.collaboratorsMaat,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "finch team",
      "on the finch",
      "on mark’s finch",
      "on mark's finch",
      "worked on finch",
      "who was on finch",
      "who worked on finch",
      "who else worked on finch",
      "finch collaborators",
      "finch teammates",
    ])
  ) {
    return {
      category: "collaboratorsFinch",
      mode: "technical",
      answer: ANSWERS.collaboratorsFinch,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "justin hoffman",
      "worked with justin",
      "who else worked with justin",
    ]) || /\bjustin\b/.test(text)
  ) {
    if (
      includesAny(text, [
        "who else",
        "rest of",
        "other members",
        "other teammates",
        "team with justin",
      ])
    ) {
      return {
        category: "collaboratorsAbacus",
        mode: "technical",
        answer: ANSWERS.seniorDesignTeam,
        answerStatus: "answered",
      };
    }
    return {
      category: "collaboratorsJustin",
      mode: "technical",
      answer: ANSWERS.collaboratorsJustin,
      answerStatus: "answered",
    };
  }

  if (includesAny(text, ["angel mora", "angel moran"]) || /\bangel\b/.test(text)) {
    return {
      category: "collaboratorsAngel",
      mode: "technical",
      answer: ANSWERS.collaboratorsAngel,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, ["jacob dunroseman", "jacob dun roseman"]) ||
    /\bjacob\b/.test(text)
  ) {
    return {
      category: "collaboratorsJacob",
      mode: "technical",
      answer: ANSWERS.collaboratorsJacob,
      answerStatus: "answered",
    };
  }

  if (includesAny(text, ["luis serrano"]) || /\bluis\b/.test(text)) {
    return {
      category: "collaboratorsLuis",
      mode: "technical",
      answer: ANSWERS.collaboratorsLuis,
      answerStatus: "answered",
    };
  }

  if (includesAny(text, ["xavier barth"]) || /\bxavier\b/.test(text)) {
    return {
      category: "collaboratorsXavier",
      mode: "technical",
      answer: ANSWERS.collaboratorsXavier,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, ["julianne browne", "who is julian"]) ||
    /\bjulianne\b|\bjulian\b/.test(text)
  ) {
    return {
      category: "collaboratorsJulianne",
      mode: "technical",
      answer: ANSWERS.collaboratorsJulianne,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "project teammates",
      "project team",
      "project teams",
      "who else was on the team",
      "who else was on the project",
      "who was on the team",
      "who was on the project team",
      "classmates who worked",
      "collaborators on the project",
      "team members",
      "list names from the project",
      "senior design team",
    ])
  ) {
    const ctx = historyContext(history);
    let category = "collaboratorsInventory";
    let answer = ANSWERS.collaboratorsInventory;
    if (includesAny(`${text} ${ctx}`, ["finch", "birdvroom", "luis", "xavier", "julianne"])) {
      category = "collaboratorsFinch";
      answer = ANSWERS.collaboratorsFinch;
    } else if (
      includesAny(`${text} ${ctx}`, [
        "justin",
        "hoffman",
        "angel",
        "mora",
        "jacob",
        "dunroseman",
        "abacus",
        "maat",
        "ta-bot",
        "senior design",
      ])
    ) {
      category = "collaboratorsAbacus";
      answer = ANSWERS.seniorDesignTeam;
    }
    return {
      category,
      mode: "technical",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "allan akkathara",
      "basketball predictor team",
      "worked with mark on data mining",
      "who worked with mark on data mining",
      "data mining collaborators",
      "data mining team",
    ])
  ) {
    return {
      category: "collaboratorsDataMining",
      mode: "technical",
      answer: ANSWERS.collaboratorsDataMining,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "armaan yaz",
      "worked with mark in operating systems",
      "who worked with mark in operating systems",
      "os collaborators",
      "operating systems collaborators",
      "who worked with mark on operating systems",
    ])
  ) {
    return {
      category: "collaboratorsOs",
      mode: "technical",
      answer: ANSWERS.collaboratorsOs,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "hunter carlson",
      "worked with mark on the data science",
      "who worked with mark on the data science",
      "sleep analysis collaborators",
      "data science collaborators",
      "who worked with mark on sleep",
    ])
  ) {
    return {
      category: "collaboratorsSleep",
      mode: "technical",
      answer: ANSWERS.collaboratorsSleep,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "project collaborators",
      "list mark’s project collaborators",
      "list mark's project collaborators",
      "list marks project collaborators",
      "who has mark worked with",
      "who has mark collaborated",
      "list collaborators",
    ])
  ) {
    return {
      category: "collaboratorsInventory",
      mode: "technical",
      answer: ANSWERS.collaboratorsInventory,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "testimonial",
      "testimonials",
      "testiomonials",
      "reviews",
      "recommendations",
      "recommendation",
      "references",
      "what people say",
      "people say about",
      "others say",
      "people say",
      "show me mark’s testimonials",
      "show me mark's testimonials",
      "show me marks testimonials",
      "does mark have testimonial",
      "have testimonials",
      "recommended mark",
      "who has recommended",
      "who recommended",
      "who recommends",
      "coworkers say",
      "professors and coworkers",
      "professors say",
      "teammates say",
      "teammates or coworkers",
      "work ethic",
      "zack",
      "farzeen",
      "jorge",
      "full quote",
      "exact quote",
      "strongest testimonial",
      "supervisor testimonial",
      "professor testimonial",
      "more testimonials",
      "whole list of testimonials",
      "testimonial names",
      "who gave mark",
      "who gave a testimonial",
      "who wrote the testimonials",
      "who wrote them",
      "relationship with mark",
      "relationship to mark",
      "their relationship",
      "how do they know",
      "how does zack know",
      "how does farzeen know",
      "how does jorge know",
      "who supervised",
      "who promoted",
      "which testimonial",
      "which testimonials",
      "which people were",
      "which ones were",
      "which one was",
      "came from professors",
      "came from coworkers",
      "came from his supervisor",
      "from his supervisor",
      "from professors",
      "from coworkers",
      "was farzeen",
      "all full quotes",
      "full quotes",
      "each person’s relationship",
      "each person's relationship",
      "each persons relationship",
    ]) || isTestimonialFollowupContext(text, history)
  ) {
    return resolveTestimonialsAnswer(text, history);
  }

  if (
    includesAny(text, [
      "what drives mark",
      "what drives him",
      "drives mark",
      "what motivates mark",
      "what motivates him",
      "what motivates",
    ])
  ) {
    return {
      category: "drives",
      mode: "casual",
      answer: ANSWERS.drives,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "describe mark’s vibe",
      "describe mark's vibe",
      "describe marks vibe",
      "mark’s vibe",
      "mark's vibe",
      "marks vibe",
      "what is mark’s vibe",
      "what is mark's vibe",
      "what is marks vibe",
      "how would you describe mark’s vibe",
      "how would you describe mark's vibe",
      "what is mark’s mindset",
      "what is mark's mindset",
      "what is marks mindset",
      "mark’s mindset",
      "mark's mindset",
      "what makes mark different",
    ])
  ) {
    return {
      category: "vibe",
      mode: "casual",
      answer: ANSWERS.vibe,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "earned life",
      "what does an earned life",
      "what is an earned life",
      "earned life mean",
    ])
  ) {
    return {
      category: "earnedLife",
      mode: "casual",
      answer: ANSWERS.earnedLife,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "what gives mark confidence",
      "gives mark confidence",
      "earned confidence",
      "quiet confidence",
      "what does quiet confidence",
      "quiet ambition",
      "what does quiet ambition",
    ])
  ) {
    let answer = ANSWERS.earnedConfidence;
    if (includesAny(text, ["quiet ambition"])) answer = ANSWERS.quietAmbition;
    else if (includesAny(text, ["quiet confidence"])) answer = ANSWERS.vibe;
    return {
      category: "earnedConfidence",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "why does mark build",
      "why mark build",
      "why does mark care about results",
      "care about results",
      "turning ideas into",
    ])
  ) {
    return {
      category: "builderIdentity",
      mode: "casual",
      answer: ANSWERS.builderIdentity,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "how does mark view leadership",
      "how does mark lead",
      "comfortable leading",
      "is mark comfortable leading",
      "mark lead",
      "approach learning",
      "how does mark approach learning",
      "what has teamwork taught",
      "teamwork taught",
    ])
  ) {
    const answer = includesAny(text, ["learning", "teamwork taught", "taught"])
      ? ANSWERS.learningHumility
      : ANSWERS.leadershipBalance;
    return {
      category: "leadershipBalance",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "what does freedom mean",
      "freedom mean to mark",
      "freedom mean to him",
    ])
  ) {
    return {
      category: "freedomStructure",
      mode: "casual",
      answer: ANSWERS.freedomStructure,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "why city life",
      "why does he like city",
      "why does mark like city",
      "like city life",
      "city life",
      "drawn to cities",
      "modern city",
    ])
  ) {
    return {
      category: "cityVision",
      mode: "casual",
      answer: ANSWERS.cityVision,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "new perspectives",
      "gain new perspectives",
      "perspective and exploration",
    ])
  ) {
    return {
      category: "perspectiveExploration",
      mode: "casual",
      answer: ANSWERS.perspectiveExploration,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "want to be remembered",
      "should people remember",
      "what should people remember",
      "remembered for",
    ])
  ) {
    return {
      category: "remembered",
      mode: "casual",
      answer: ANSWERS.remembered,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "finished becoming",
      "still evolving",
      "finished product",
      "person is he becoming",
      "type of person is he becoming",
      "what type of person is he becoming",
      "person is mark trying to become",
      "what type of person is mark trying to become",
    ])
  ) {
    return {
      category: "becoming",
      mode: "casual",
      answer: ANSWERS.becoming,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "what kind of future",
      "kind of future does mark",
      "future does mark want",
      "future does he want",
    ])
  ) {
    return {
      category: "futureVision",
      mode: "casual",
      answer: ANSWERS.futureVision,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "describe mark’s personality",
      "describe mark's personality",
      "describe marks personality",
      "mark’s personality",
      "mark's personality",
      "marks personality",
      "what kind of person is mark",
      "type of person is mark",
    ])
  ) {
    return {
      category: "personality",
      mode: "casual",
      answer: ANSWERS.personality,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "what does discipline mean",
      "discipline mean to mark",
      "what does consistency mean",
      "consistency mean to",
      "controlled strength",
      "controlled intensity",
      "how does mark handle setbacks",
      "handle setbacks",
    ])
  ) {
    let answer = ANSWERS.discipline;
    if (includesAny(text, ["consistency"])) answer = ANSWERS.consistency;
    else if (includesAny(text, ["controlled strength", "controlled intensity"]))
      answer = ANSWERS.controlledStrength;
    else if (includesAny(text, ["setback"])) answer = ANSWERS.setbacks;
    return {
      category: "discipline",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "what are mark’s goals",
      "what are mark's goals",
      "what are marks goals",
      "why does mark want a technology career",
      "technology career",
      "career goals",
      "what does success mean",
      "success mean to mark",
      "success look like",
    ])
  ) {
    const answer = includesAny(text, ["success"])
      ? ANSWERS.success
      : ANSWERS.careerGoals;
    return {
      category: "careerGoals",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "favorite artists",
      "favourite artists",
      "favorite artist",
      "favourite artist",
      "favorite musician",
      "favourite musician",
      "favorite rappers",
      "favourite rappers",
      "favorite r&b",
      "favourite r&b",
      "what music",
      "music does mark",
      "kind of music",
      "does mark like music",
      "does mark listen",
      "listen to",
      "drake",
      "lil baby",
      "tory lanez",
      "the weeknd",
      "don toliver",
      "travis scott",
      "partynextdoor",
      "party next door",
      "r&b",
      "hip-hop",
      "hip hop",
      "workout music",
      "music fits",
      "music while",
    ]) ||
    (includesAny(text, ["music", "rapper", "rappers", "artist", "artists"]) &&
      includesAny(text, [
        "favorite",
        "favourite",
        "like",
        "listen",
        "taste",
        "workout",
        "working out",
        "train",
        "visual",
      ]))
  ) {
    const answer = includesAny(text, ["workout", "working out", "train"])
      ? ANSWERS.favoriteArtistsWorkout
      : ANSWERS.favoriteArtists;
    return {
      category: "favoriteArtists",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "favorite movies",
      "favourite movies",
      "favorite movie",
      "favourite movie",
      "favorite films",
      "favourite films",
      "favorite film",
      "favourite film",
      "favorite show",
      "favourite show",
      "creed",
      "the batman",
      "magazine dreams",
      "regular show",
      "marvel or dc",
      "dc or marvel",
      "superhero movies",
      "superhero movie",
      "does mark like marvel",
      "does mark like dc",
      "like superhero",
    ]) ||
    (includesAny(text, ["marvel", "dc"]) &&
      includesAny(text, [
        "movie",
        "movies",
        "film",
        "films",
        "or",
        "superhero",
        "like",
      ]))
  ) {
    let answer = ANSWERS.favoriteFilms;
    if (
      includesAny(text, ["regular show", "favorite show", "favourite show"])
    ) {
      answer = ANSWERS.favoriteShow;
    } else if (
      includesAny(text, ["marvel or dc", "dc or marvel", "superhero"]) ||
      (includesAny(text, ["marvel", "dc"]) &&
        !includesAny(text, ["creed", "batman", "magazine", "regular"]))
    ) {
      answer = ANSWERS.favoriteFilmsMarvelDc;
    } else if (includesAny(text, ["creed"])) {
      answer = ANSWERS.favoriteFilmsCreed;
    } else if (includesAny(text, ["batman"])) {
      answer = ANSWERS.favoriteFilmsBatman;
    }
    return {
      category: "favoriteFilms",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, ["traveled", "travelled", "travel"]) &&
    includesAny(text, [
      "want to work",
      "where does mark want to work",
      "job locations",
      "work location",
    ])
  ) {
    return {
      category: "travelPlaces",
      mode: "casual",
      answer: ANSWERS.travelAndWork,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "where has mark traveled",
      "where has mark travelled",
      "where has mark been",
      "where mark has been",
      "cities he has visited",
      "cities mark has visited",
      "places are shown",
      "travel places",
      "photography trips",
      "travel section",
      "travel photos",
      "see his travel",
      "view mark’s photography",
      "view mark's photography",
      "where can i see his travel",
      "where can i view mark",
      "what is in the travel",
      "what can i see in the travel",
      "places has mark photographed",
      "where does mark like to travel",
    ]) ||
    text === "travel" ||
    (/\btravel\b/.test(text) &&
      includesAny(text, [
        "where",
        "places",
        "cities",
        "visited",
        "section",
        "photos",
        "photography",
        "trips",
        "locations",
        "prefer",
        "beaches",
        "mountains",
        "learned",
        "influence",
        "why does mark like",
      ]))
  ) {
    let answer = ANSWERS.travelPlaces;
    if (
      includesAny(text, [
        "mean",
        "why does mark like traveling",
        "why travel",
        "influence",
        "learned",
        "prefer",
        "beaches",
        "mountains",
      ])
    ) {
      answer = ANSWERS.travel;
    } else if (
      includesAny(text, ["photograph", "photography", "photos"]) &&
      !includesAny(text, [
        "travel section",
        "where has",
        "places",
        "traveled",
        "travelled",
        "visited",
        "been",
      ])
    ) {
      answer = ANSWERS.photography;
    }
    return {
      category: "travelPlaces",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "why does mark like photography",
      "photography mean",
      "what does travel mean",
      "travel mean to mark",
      "environment does mark want",
      "environment mark want",
      "kind of environment",
    ])
  ) {
    let answer = ANSWERS.photography;
    if (includesAny(text, ["travel"])) answer = ANSWERS.travel;
    else if (includesAny(text, ["environment"])) answer = ANSWERS.environment;
    return {
      category: "photographyTravel",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "hobbies",
      "interests outside",
      "passionate about",
      "visual style",
      "why does mark like black",
      "why black",
      "for fun",
      "outside of technology",
      "outside technology",
      "not coding",
      "free time",
      "does mark cook",
      "like cooking",
      "cooking",
      "museums",
      "museum",
      "have a dog",
      "his dog",
      "dog’s name",
      "dog's name",
      "dogs name",
      "dog name",
      "name of his dog",
      "what is his dog",
      "named kobe",
      "who is kobe",
      "tell me about kobe",
      "kobe",
      "my son",
      "his son",
      "call kobe",
      "calls kobe",
      "kobe his son",
      "spend his free time",
      "spends his free time",
      "new perspectives",
      "tell me about his life",
      "about mark’s life",
      "about mark's life",
      "about marks life",
      "like outside technology",
      "what are mark’s interests",
      "what are mark's interests",
      "what are marks interests",
    ]) ||
    text === "dog" ||
    text === "interests"
  ) {
    let answer = ANSWERS.hobbies;
    if (includesAny(text, ["passionate"])) answer = ANSWERS.passion;
    else if (includesAny(text, ["visual style", "like black", "why black"]))
      answer = ANSWERS.favoriteColor;
    else if (includesAny(text, ["cook"])) answer = ANSWERS.cooking;
    else if (
      includesAny(text, ["dog", "kobe", "my son", "his son", "call kobe", "calls kobe"]) ||
      text === "dog"
    )
      answer = ANSWERS.dog;
    else if (includesAny(text, ["museum"])) answer = ANSWERS.museums;
    return {
      category: "hobbies",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "technologies",
      "technology",
      "tech stack",
      "skills",
      "programming languages",
      "tools",
    ])
  ) {
    return {
      category: "technologies",
      mode: "technical",
      answer: ANSWERS.technologies,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "built by himself",
      "build by himself",
      "build himself",
      "solo",
      "individual project",
      "team project",
      "ownership",
    ])
  ) {
    return {
      category: "individualTeam",
      mode: "technical",
      answer: ANSWERS.individualTeam,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "work experience",
      "jobs",
      "employment",
      "outside the classroom",
      "leadership",
    ])
  ) {
    return {
      category: "work",
      mode: "recruiter",
      answer: ANSWERS.work,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "contact",
      "linkedin",
      "github",
      "resume",
      "résumé",
      "vsco",
      "reach mark",
      "how can i contact",
      "how do i contact",
      "contact mark",
    ])
  ) {
    return {
      category: "contact",
      mode: "recruiter",
      answer: ANSWERS.contact,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "currently live",
      "current residence",
      "where does mark live",
      "where does he live",
      "where mark lives",
      "where he lives",
      "where is mark living",
      "where is he living",
    ])
  ) {
    return {
      category: "locationPrivacy",
      mode: "general",
      answer: ANSWERS.locationPrivacy,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "where is mark from",
      "where is he from",
      "where mark is from",
      "where he is from",
      "hometown",
      "grew up",
      "from chicago",
    ])
  ) {
    return {
      category: "fromChicago",
      mode: "general",
      answer: ANSWERS.fromChicago,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "where does mark want to work",
      "where does he want to work",
      "where mark wants to work",
      "where he wants to work",
      "where is mark looking",
      "job locations",
      "willing to relocate",
      "want to work",
    ]) ||
    text === "work"
  ) {
    return {
      category: "careerGoals",
      mode: "recruiter",
      answer: ANSWERS.workLocation,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "bench",
      "squat",
      "deadlift",
      "dead lift",
      "how much can mark lift",
      "how much does mark lift",
      "what are mark’s lifts",
      "what are mark's lifts",
      "maxes",
      "pr numbers",
      "lifting numbers",
    ])
  ) {
    return {
      category: "liftingNumbers",
      mode: "casual",
      answer: ANSWERS.liftingNumbers,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "powerlifting",
      "first meet",
      "won his first",
      "won a powerlifting",
      "did mark compete",
      "did he compete",
      "compete in powerlifting",
      "powerlifting meet",
    ]) &&
    !includesAny(text, [
      "bodybuilding",
      "why bodybuilding",
      "move from powerlifting",
      "to bodybuilding",
    ])
  ) {
    return {
      category: "powerlifting",
      mode: "casual",
      answer: ANSWERS.powerlifting,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "bodybuilding",
      "fitness",
      "gym",
      "training mean",
      "how does fitness",
      "gym taught",
      "bodybuilding mean",
      "what does bodybuilding",
      "why does mark work out",
      "why does mark workout",
      "why work out",
      "why workout",
      "why does mark train",
      "how long has mark been working out",
      "how long has mark trained",
      "how long working out",
      "how long training",
      "why did mark start lifting",
      "why start lifting",
      "why did mark start",
      "fitness background",
      "gym background",
      "working out",
      "why bodybuilding",
      "move from powerlifting",
      "powerlifting to bodybuilding",
      "what has fitness taught",
      "what has the gym taught",
    ])
  ) {
    let answer = ANSWERS.bodybuilding;
    if (
      includesAny(text, [
        "gym taught",
        "fitness taught",
        "what has fitness",
        "what has the gym",
        "taught mark",
      ])
    ) {
      answer = ANSWERS.fitnessTaught;
    } else if (
      includesAny(text, [
        "bodybuilding mean",
        "what does bodybuilding",
        "why bodybuilding",
        "why did mark move",
        "move from powerlifting",
        "powerlifting to bodybuilding",
      ])
    ) {
      answer = ANSWERS.bodybuildingMeaning;
    }
    return {
      category: "bodybuilding",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "who is mark",
      "tell me about mark",
      "tell me briefly about mark",
      "briefly about mark",
      "background",
      "education",
      "graduate",
      "tell me everything about mark",
      "everything about mark",
    ])
  ) {
    const broadLife = includesAny(text, [
      "tell me everything",
      "everything about mark",
      "about his life",
      "about mark’s life",
      "about mark's life",
    ]);
    return {
      category: broadLife ? "overview" : "profile",
      mode: "general",
      answer: broadLife ? ANSWERS.overview : ANSWERS.profile,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "favorite color",
      "favourite color",
      "favorite colour",
      "favourite colour",
      "color black",
      "why does mark like black",
      "why black",
    ])
  ) {
    return {
      category: "favoriteColor",
      mode: "casual",
      answer: ANSWERS.favoriteColor,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "mythology",
      "achilles",
      "icarus",
      "heracles",
      "hercules",
      "greek myth",
      "mythology figures",
      "figures connect",
    ])
  ) {
    let answer = ANSWERS.mythology;
    if (includesAny(text, ["icarus"])) answer = ANSWERS.mythologyIcarus;
    else if (includesAny(text, ["achilles"]))
      answer = ANSWERS.mythologyAchilles;
    else if (includesAny(text, ["heracles", "hercules"]))
      answer = ANSWERS.mythologyHeracles;
    return {
      category: "mythology",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "what does mark value",
      "what are mark’s values",
      "what are mark's values",
      "what are marks values",
      "long-term goals",
      "long term goals",
      "what does success",
      "type of person",
      "recruiters to remember",
    ])
  ) {
    let answer = ANSWERS.values;
    if (includesAny(text, ["success"])) answer = ANSWERS.success;
    else if (includesAny(text, ["type of person", "recruiters to remember"]))
      answer = ANSWERS.personality;
    return {
      category: "values",
      mode: "casual",
      answer,
      answerStatus: "answered",
    };
  }

  return {
    category: "fallback",
    mode: "general",
    answer: ANSWERS.fallback,
    answerStatus: "unavailable",
  };
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve();
    }, ms);

    if (!signal) {
      return;
    }

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * @param {string} question
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{
 * success: true,
 * answer: string,
 * answerStatus: 'answered',
 * links: [],
 * mode: 'recruiter' | 'technical' | 'general' | 'casual',
 * conversationId: 'preview',
 * error: null
 * }>}
 */
export async function getMockMarkAiResponse(question, options = {}) {
  await delay(MOCK_DELAY_MS, options.signal);
  const classified = classifyQuestion(question, options.history || []);

  return {
    success: true,
    answer: normalizePublicPunctuation(classified.answer),
    answerStatus: classified.answerStatus,
    links: [],
    mode: classified.mode,
    conversationId: "preview",
    error: null,
    errorCode: null,
    userMessage: null,
    userNote: null,
    retryAfterSeconds: null,
    fallbackUsed: false,
  };
}

export { classifyQuestion };
