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
    "MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.",
  bodybuilding:
    "Bodybuilding interests Mark because it combines discipline, structure, symmetry, patience, and progress earned over time. It is a major interest outside technology and reinforces focus, consistency, and quality work habits that also support professional growth.",
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
    "Outside technology, Mark is interested in fitness and bodybuilding, travel, photography, hiking, reading, music, cities, architecture, and cinematic visual design. He describes fitness as a source of discipline, structure, patience, and consistency, while photography helps him document places and experiences that give him a new perspective.",
  cooking:
    "Cooking is a practical personal interest for Mark, not professional culinary experience. It is one of the ways he spends time outside technology.",
  dog: "MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.",
  friendsFamily:
    "MarkAI only provides professional and intentionally public information about Mark. You can ask about his projects, experience, skills, interests, goals, or portfolio.",
  museums:
    "Mark enjoys museums, especially where they connect to photography, classical art, architecture, statues, history, and visual storytelling.",
  passion:
    "Mark is passionate about building useful software and about bodybuilding outside technology. In both areas he focuses on disciplined practice, steady improvement, and work he can stand behind.",
  favoriteArtists:
    "Mark enjoys music as a general public interest alongside reading, hiking, travel, and photography. MarkAI keeps music preferences high-level and does not list specific favorite artists.",
  favoriteArtistsWorkout:
    "Music is part of Mark’s broader public interests and often fits training and reflection. MarkAI discusses music only as a general interest and does not list specific favorite artists.",
  favoriteFilms:
    "Some of Mark’s favorite films are Creed, Creed II, The Batman, and Magazine Dreams. He also enjoys Marvel and DC stories, while Regular Show is one of his favorite animated series.",
  favoriteFilmsMarvelDc:
    "Mark enjoys both Marvel and DC movies, characters, and story worlds. That includes heroes, character arcs, visual design, and major film stories. He does not claim to have seen every release.",
  favoriteFilmsCreed:
    "Creed and Creed II connect naturally to Mark’s interest in training, ambition, resilience, and earned progress. They are among his favorite films alongside The Batman and Magazine Dreams.",
  favoriteFilmsBatman:
    "The Batman fits Mark’s preference for dark, cinematic, serious, high-contrast environments. It is one of his favorite films alongside Creed, Creed II, and Magazine Dreams.",
  favoriteShow:
    "Regular Show is one of Mark’s favorite animated series. It reflects a more relaxed and humorous side of his entertainment interests and is not classified as a movie.",
  careerGoals:
    "Mark is working toward a stable technology career built on continued technical growth, meaningful work, stronger software projects, greater independence, and continued discipline and creativity. He remains open to software development, full-stack applications, developer tools, data-oriented systems, technical support, and related entry-level technology paths.",
  success:
    "For Mark, success means career stability, professional growth, independence, meaningful work, physical discipline, and pride in earned progress. A title alone is not enough; he wants to know he built something useful and followed through.",
  funFacts:
    "Here are several approved fun facts about Mark:\n\n- Bodybuilding is his strongest interest outside technology.\n- Favorite films include Creed, Creed II, The Batman, and Magazine Dreams; Regular Show is a favorite series; he also enjoys Marvel and DC.\n- He likes photography and travel, plus museums, hiking, and running.\n- He is interested in Greek mythology and classical statues and art.\n- He prefers a dark cinematic visual style across his portfolio.\n- Outside work he also enjoys reading, music, and exploring cities, architecture, and landscapes.",
  capabilities:
    "You can ask about Mark’s projects, skills, education, experience, collaborators, goals, personality, hobbies, music, films, fitness, travel, testimonials, résumé, or public links.\n\nExamples:\n- “What did Mark build for Abacus?”\n- “What are his strongest skills?”\n- “What are Mark’s goals?”\n- “What music and films does he like?”\n- “Who did he work with on MAAT?”\n- “Can I see the Finch repository?”\n- “What does Mark do outside technology?”",
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
    "The Abacus team included Mark Yoingco, Justin Hoffman, Angel Mora, and Jacob DunRoseman.",
  collaboratorsMaat:
    "The TA-Bot / MAAT team included Mark Yoingco, Justin Hoffman, Angel Mora, and Jacob DunRoseman.",
  collaboratorsSam:
    "MarkAI provides only Mark’s approved public project and collaborator information.",
  collaboratorsFinch:
    "The Finch Web Controller team included Mark Yoingco, Julianne Browne, Luis Serrano, and Xavier Barth.",
  collaboratorsDataMining:
    "The Data Mining Game Predictor team included Mark Yoingco and Allan Akkathara.",
  collaboratorsOs:
    "For Operating Systems C Projects, the approved collaborator names are Mark Yoingco and Armaan Yaz. Private or shared course repositories remain unpublished.",
  collaboratorsSleep:
    "For the Sleep Efficiency Analysis data-science project, the approved collaborator names are Mark Yoingco and Hunter Carlson.",
  collaboratorsInventory:
    "Mark’s approved project collaborators, by project:\n\n- Abacus: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman\n- TA-Bot / MAAT: Mark Yoingco, Justin Hoffman, Angel Mora, Jacob DunRoseman\n- Finch: Mark Yoingco, Julianne Browne, Luis Serrano, Xavier Barth\n- Data Mining: Mark Yoingco, Allan Akkathara\n- Operating Systems: Mark Yoingco, Armaan Yaz\n- Sleep Analysis: Mark Yoingco, Hunter Carlson",
  fromChicago: "Mark is from Chicago.",
  locationPrivacy:
    "MarkAI does not provide precise or current location information. Mark’s approved public background states that he is from Chicago.",
  testimonials:
    "Yes. Mark’s portfolio includes public testimonials from people who have worked with, taught, or known him. Zack Kohlwey, Mark’s former supervisor at Marquette University, highlights his dedication, work ethic, and leadership by example. Farzeen Harunani, a Computer Science professor at Marquette, notes his initiative, composure, and dedication. Jorge Torres, a former coworker, emphasizes his thoroughness, ownership, and reliability. Full attributed quotes are in the portfolio Testimonials section.",
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

function resolveFollowupFromHistory(text, history) {
  const topicFollowUp = resolveTopicFollowup(text, history, ANSWERS);
  if (topicFollowUp) return topicFollowUp;

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

  if (
    includesAny(text, [
      "phone",
      "email address",
      "raw email",
      "password",
      "credential",
      "private repository",
      "private repo",
      "relationship",
      "girlfriend",
      "boyfriend",
      "breakup",
      "romantic",
      "dating",
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
      "time with friends",
      "time with family",
      "spending time with friends",
      "spending time with family",
      "does mark have a dog",
      "have a dog",
      "his dog",
      "mark’s dog",
      "mark's dog",
      "dog’s name",
      "dog's name",
      "dogs name",
      "name of his dog",
      "name of the dog",
      "what is his dog",
      "pet named",
      "dog named",
      "named kobe",
      "dog kobe",
      "his dog kobe",
      "who is kobe",
      "tell me about kobe",
      "pets",
      "pet ownership",
      "favorite color",
      "favourite color",
      "favorite colour",
      "favourite colour",
      "favorite artist",
      "favourite artist",
      "favorite artists",
      "favourite artists",
      "favorite rappers",
      "favourite rappers",
      "favorite food",
      "favourite food",
      "drake",
      "lil baby",
      "tory lanez",
      "the weeknd",
      "don toliver",
      "travis scott",
      "partynextdoor",
      "party next door",
      "home life",
      "private struggle",
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
      "reviews",
      "recommendations",
      "recommendation",
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
      "coworkers say",
      "teammates say",
      "teammates or coworkers",
      "work ethic",
    ])
  ) {
    return {
      category: "testimonials",
      mode: "recruiter",
      answer: ANSWERS.testimonials,
      answerStatus: "answered",
    };
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
      "what music",
      "music does mark",
      "kind of music",
      "does mark like music",
      "does mark listen",
      "listen to",
      "r&b",
      "hip-hop",
      "hip hop",
      "workout music",
      "music fits",
      "music while",
    ]) ||
    (includesAny(text, ["music"]) &&
      includesAny(text, ["like", "listen", "taste", "enjoy"])) ||
    (includesAny(text, ["music", "rapper", "rappers", "artist", "artists"]) &&
      includesAny(text, [
        "like",
        "listen",
        "taste",
        "workout",
        "working out",
        "train",
        "visual",
      ]) &&
      !includesAny(text, ["favorite", "favourite"]))
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
    includesAny(text, [
      "where has mark traveled",
      "where has mark travelled",
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
      "spend his free time",
      "spends his free time",
      "new perspectives",
      "tell me everything about mark",
      "tell me about his life",
      "about mark’s life",
      "about mark's life",
      "about marks life",
    ])
  ) {
    let answer = ANSWERS.hobbies;
    if (includesAny(text, ["passionate"])) answer = ANSWERS.passion;
    else if (includesAny(text, ["visual style"])) answer = ANSWERS.environment;
    else if (includesAny(text, ["cook"])) answer = ANSWERS.cooking;
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
    ])
  ) {
    return {
      category: "careerGoals",
      mode: "recruiter",
      answer: ANSWERS.careerGoals,
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
      category: broadLife ? "hobbies" : "profile",
      mode: "general",
      answer: broadLife ? ANSWERS.hobbies : ANSWERS.profile,
      answerStatus: "answered",
    };
  }

  if (
    includesAny(text, [
      "favorite color",
      "favourite color",
      "color black",
      "why does mark like black",
      "why black",
    ])
  ) {
    return {
      category: "sensitive",
      mode: "general",
      answer: ANSWERS.sensitive,
      answerStatus: "refused",
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
    ])
  ) {
    return {
      category: "bodybuilding",
      mode: "casual",
      answer: ANSWERS.bodybuilding,
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
  };
}

export { classifyQuestion };
