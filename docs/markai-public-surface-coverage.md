# MarkAI public-surface coverage audit

Development-only report. **Do not export this document into the model context or approved knowledge package.**

Generated for Phase 3A.1 addendum (music, films, lifestyle, travel, and public-surface parity).

## Summary

| Metric | Value |
| --- | --- |
| Approved records (export) | 107 |
| Public travel locations answerable | 11 |
| Coverage classification focus | Webpage + Terminal factual surfaces + Mark-approved MarkAI-only preferences |
| Favorites added to Webpage / Terminal / resume / cards | No |
| Lyrics stored | No |
| Friend / family / dog identifying data added | No |

Public-surface parity target topics are classified below as:

- **ANSWERABLE** - deterministic and/or approved-record backed
- **LINK-ONLY** - prefer safe trusted links rather than repeating private contact raw values
- **EXCLUDED-SENSITIVE** - refused or omitted by privacy policy
- **NEEDS-REVIEW** - public-ish but not yet fully structured for MarkAI
- **DUPLICATE-COVERED** - already covered by another primary topic/record

## Exact public travel sources

| Source | Path |
| --- | --- |
| Canonical travel places | `src/travelPlacesData.js` (`TRAVEL_PLACES`) |
| Terminal travel file output | `src/terminalTravelFileOutput.js` |
| Webpage Travel photo labels | `src/blogPhotosData.js` |
| Webpage Travel screen | `src/PortfolioApp.jsx` (Travel screen) |
| VSCO public gallery URL | `src/terminalProfileFileOutput.js` / trusted link `link-vsco` |

Answerable place inventory (from `TRAVEL_PLACES` only):

1. Hawaii
2. Las Vegas
3. Chicago
4. California
5. Lake Louise, Canada
6. Manila, Philippines
7. London
8. Amalfi Coast, Italy
9. Rome, Italy
10. Milwaukee
11. Nashville

`blogPhotosData.js` location labels may be more granular (for example Getty Center, Positano). MarkAI lists the canonical `TRAVEL_PLACES` set for “where has Mark traveled?” and does not invent additional destinations from image pixels.

## Records added specifically for this approval

| Record ID | Topic |
| --- | --- |
| `interest-favorite-artists` | Music preferences |
| `interest-favorite-films-television` | Films / Regular Show / Marvel+DC |
| `interest-lifestyle-hobbies-expanded` | Lifestyle hobbies incl. cooking, dog, friends/family (non-identifying) |
| `travel-public-places-inventory` | Public travel places + meaning framing |

Trusted link added for Travel section routing:

- `link-travel-section` (internal ID for development / response `links[]` only; never printed in answer prose)

## Coverage matrix

### Professional / profile

| Public topic | Classification | Canonical source | Approved record IDs | Example questions | Fallback | Safe link IDs (dev) | Privacy restrictions | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Professional summary | ANSWERABLE | Webpage Welcome / Terminal profile | profile / education / career-direction records | Who is Mark? Tell me about Mark | Deterministic `profile` | `link-portfolio-home`, `link-resume-pdf` | No private bio claims | - |
| Education | ANSWERABLE | Webpage Education / Terminal resume | education records | Where did Mark go to school? | Deterministic `profile` | `link-resume-pdf` | No grades/GPA unless approved | - |
| Target roles | ANSWERABLE | Career direction records | `career-direction-first-full-time-tech-role`, `personality-career-purpose` | What roles is Mark seeking? | Deterministic `careerGoals` | `link-resume-pdf`, `link-contact-section` | No salary expectations unless approved | - |
| Skills | ANSWERABLE | Webpage Skills / shared skill records | skill-* records | What technologies does Mark use? | Deterministic `technologies` | `link-github-profile` | No private tooling secrets | - |
| Work experience | ANSWERABLE | Webpage Experience / Terminal resume | work-* records | What is Mark’s work experience? | Deterministic `work` | `link-resume-pdf`, `link-linkedin` | No private supervisor contact | - |
| Leadership / involvement | ANSWERABLE | Webpage Experience / leadership records | leadership / membership records | Leadership experience? | Deterministic `work` | `link-resume-pdf` | No private org disputes | - |
| Values and goals | ANSWERABLE | Approved personality / career records | `personality-growth-and-values`, `personality-career-purpose` | What are Mark’s values/goals? | Deterministic `values` / `careerGoals` | optional resume/contact | No private journal content | - |
| Favorite color | ANSWERABLE | Approved aesthetic interest | `personality-aesthetic-environment`, `interest-creative-aesthetics-design` | Favorite color? | Deterministic `favoriteColor` | - | - | - |
| Current MarkAI status | ANSWERABLE | MarkAI status answer | project-markai / status deterministic | Is MarkAI live? | Deterministic `status` | `link-markai-route` | No provider secrets | - |

### Projects

| Public topic | Classification | Canonical source | Approved record IDs | Example questions | Fallback | Safe link IDs (dev) | Privacy restrictions | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Public project inventory | ANSWERABLE | Webpage Portfolio / Terminal project files / shared project data | `projects-public-inventory` + project-* | What projects has Mark built? | Deterministic `projectsInventory` | `link-portfolio-section` | No private repos | - |
| Project contributions | ANSWERABLE | Project records | project-* | What did Mark do on Abacus? | Deterministic project answers | project GitHub links | No private commit dumps | - |
| Project teammates (when asked) | ANSWERABLE | MarkAI-only collaborator records | `collaborators-*` | Who worked on Abacus? | Deterministic collaborator answers | related project GitHub | No unpublished teammates | Names are MarkAI-only; not added to Webpage/Terminal/resume |
| Ownership solo vs team | ANSWERABLE | Project records | inventory + project-* | Did Mark build that alone? | Deterministic `individualTeam` | portfolio/project links | - | - |

### Testimonials / contact / navigation

| Public topic | Classification | Canonical source | Approved record IDs | Example questions | Fallback | Safe link IDs (dev) | Privacy restrictions | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Testimonials | ANSWERABLE | `src/testimonialsData.js` + Webpage Testimonials | `testimonials-public-overview`, testimonial-* | Testimonials? Reviews? | Deterministic `testimonials` | `link-testimonials-section` | No private metadata, no raw emails | Deep-link hash not available yet |
| Webpage / Terminal / MarkAI modes | ANSWERABLE | Navigation records | `navigation-portfolio-modes` | What modes does the portfolio have? | Deterministic navigation/contact | mode links | - | - |
| Resume access | LINK-ONLY / ANSWERABLE | Trusted resume link | contact/navigation records | Where is Mark’s resume? | Deterministic `contact` | `link-resume-pdf` | No private docs | - |
| GitHub / LinkedIn | LINK-ONLY / ANSWERABLE | Trusted profile links | contact records | GitHub? LinkedIn? | Deterministic `contact` / `links` | `link-github-profile`, `link-linkedin` | No private repos | - |
| Contact section | LINK-ONLY | Webpage Contact | `contact-preferred-methods` | How do I contact Mark? | Deterministic `contact` | `link-contact-section` | Raw phone / private email excluded | Prefer section over raw contact |
| Raw phone / private email | EXCLUDED-SENSITIVE | Privacy policy | privacy rules | What is Mark’s phone/email? | Refuse / redirect | contact section only | Never return raw values | - |

### Interests / lifestyle / entertainment (MarkAI-only expansions)

| Public topic | Classification | Canonical source | Approved record IDs | Example questions | Fallback | Safe link IDs (dev) | Privacy restrictions | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Favorite artists | ANSWERABLE | Mark-approved (not Webpage/Terminal) | `interest-favorite-artists` | Favorite artists? Drake? R&B? | Deterministic `favoriteArtists` | - | No lyrics, albums, personal artist claims | Not on Webpage/Terminal by design |
| Favorite films / show | ANSWERABLE | Mark-approved (not Webpage/Terminal) | `interest-favorite-films-television` | Favorite movies? Regular Show? Marvel or DC? | Deterministic `favoriteFilms` | - | No script quotes; Regular Show is a series | Not on Webpage/Terminal by design |
| Fitness / bodybuilding | ANSWERABLE | Interest + personality depth | `interest-fitness-bodybuilding`, `personality-bodybuilding-depth` | Bodybuilding? Gym? | Deterministic `bodybuilding` | - | No medical/measurements | - |
| Mythology | ANSWERABLE | Interest + personality depth | `interest-greek-mythology-art`, `personality-mythology-figures` | Greek mythology? Icarus? | Deterministic `mythology` | - | Not religion claims | - |
| Hobbies / lifestyle | ANSWERABLE | Expanded lifestyle record | `interest-lifestyle-hobbies-expanded` (+ related) | Hobbies? For fun? Cooking? Museums? | Deterministic `hobbies` (+ cooking/museums) | - | No professional cooking claim | - |
| Dog | ANSWERABLE (non-identifying) | Lifestyle record | `interest-lifestyle-hobbies-expanded` | Does Mark have a dog? | Deterministic dog answer | - | No name/breed/age/medical | Identifying details excluded |
| Friends / family time | ANSWERABLE (non-identifying) | Lifestyle record | `interest-lifestyle-hobbies-expanded` | Friends and family? | Deterministic friends/family answer | - | No names, schedules, private stories | - |

### Travel / photography

| Public topic | Classification | Canonical source | Approved record IDs | Example questions | Fallback | Safe link IDs (dev) | Privacy restrictions | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Travel places | ANSWERABLE | `src/travelPlacesData.js` | `travel-public-places-inventory` | Where has Mark traveled? | Deterministic `travelPlaces` | `link-travel-section`, `link-vsco` | No itinerary/lodging/current location | Blog labels more granular than inventory |
| Travel meaning | ANSWERABLE | Approved framing + travel interest | `travel-public-places-inventory`, `interest-travel-photography` | What does travel mean to Mark? | Deterministic `travel` / photographyTravel | `link-vsco` / travel section | No exaggerated motivation | - |
| Photography | ANSWERABLE | Travel/photography interests | `interest-travel-photography`, personality photography record | Why photography? Where view photos? | Deterministic photography / travelPlaces | `link-vsco`, `link-travel-section` | No private EXIF/GPS | - |
| VSCO | LINK-ONLY / ANSWERABLE | Trusted VSCO link | related travel records | Where can I view Mark’s photography? | Deterministic travel/contact | `link-vsco` | Public gallery only | - |

### Explicit exclusions

| Topic | Classification | Notes |
| --- | --- | --- |
| Raw phone number | EXCLUDED-SENSITIVE | Never answerable |
| Raw private email | EXCLUDED-SENSITIVE | Prefer Contact section |
| Private repositories | EXCLUDED-SENSITIVE | OS private/shared course repos unpublished |
| Internal link IDs in prose | EXCLUDED-SENSITIVE | May exist in `links[]` only |
| Credentials / API keys | EXCLUDED-SENSITIVE | Refused |
| Private journal content | EXCLUDED-SENSITIVE | Not in approved publicText |
| Unpublished testimonials | EXCLUDED-SENSITIVE | Only `published: true` |
| Disabled trusted links | EXCLUDED-SENSITIVE | Not returned |
| Song lyrics / script dialogue | EXCLUDED-SENSITIVE | Not stored; validator/policy reject |

## Coverage percentage (parity target)

Parity checklist from the addendum (representative topics): **28 / 28 primary topics ANSWERABLE or LINK-ONLY = 100%** for the approved public-surface target list.

Remaining non-blocking gaps (not counted as unanswered target topics):

1. Travel section and Testimonials section lack dedicated deep-link hashes (href currently portfolio home).
2. `blogPhotosData.js` includes finer location labels than `TRAVEL_PLACES`; MarkAI deliberately answers the canonical 11-place inventory.
3. Favorite artists/films intentionally absent from Webpage/Terminal/resume/cards.

## Unanswered public topics

None among the Phase 3A.1 public-surface parity target list after this addendum.

Optional future NEEDS-REVIEW items outside this approval:

- Per-photo captions beyond public location labels
- Dedicated `#travel` / `#testimonials` hashes if added to the SPA later

## Confirmation checklist

- [x] Favorites not added to Webpage, Terminal, resume, or portfolio cards
- [x] No lyrics stored in knowledge records
- [x] No friend/family/dog identifying data added
- [x] Travel answers limited to public canonical places
- [x] Travel/VSCO returned through safe links array
- [x] Deterministic fallbacks for provider disabled/fail/reject/rate-limit paths

## Link coverage (Phase 3A.2 addendum)

Canonical MarkAI registry: `markai-knowledge/links/trusted-links.json` 
Terminal short aliases: `src/publicOpenAliases.js` (URLs must match the registry) 
Webpage/Terminal project maps: `src/PortfolioApp.jsx`, `src/terminalPortfolioProjectData.js`

### Counts

| Metric | Value |
| --- | --- |
| Total approved public links in registry | 30 |
| Enabled links | 29 |
| Disabled sensitive links | 1 (`link-email`) |
| Project repositories (public) | 11 |
| Terminal short `open` aliases | 24 keys in `PUBLIC_OPEN_ALIASES` |
| Public projects without a repository link | MarkAI experience (in-app), Sigma Chi merch, FMSC service (FMSC has Webpage/Terminal `.link` only; not MarkAI-trusted) |
| Broken / conflicting links found | Section links lack SPA deep hashes (known); `#markai` not wired in frontend hash router |
| Private repos excluded | XINU shared/solo course repos never registered |

### Project → repository mapping

| Project | Public repository | MarkAI link ID | Terminal alias |
| --- | --- | --- | --- |
| Personal Portfolio Platform | `https://github.com/markyoingco/marks-portfolio` | `link-github-portfolio` | `open portfolio-site` |
| Abacus | `https://github.com/musyslab/Abacus` | `link-github-abacus` | `open abacus` |
| TA-Bot / MAAT | `https://github.com/musyslab/MAAT` | `link-github-maat` | `open maat` / `open ta-bot` |
| Finch Robot Web Controller | `https://github.com/markyoingco/BirdVroomVroom` | `link-github-finch` | `open finch` |
| Operating Systems C (docs) | `https://github.com/markyoingco/operating-systems-c-projects` | `link-github-os-c-docs` | `open operating-systems-c` |
| Space SHMUP | `https://github.com/markyoingco/space-shmup-unity` | `link-github-space-shmup` | `open space-shmup` |
| Apple Picker | `https://github.com/markyoingco/apple-picker-unity` | `link-github-apple-picker` | `open apple-picker` |
| Mission Demolition | `https://github.com/markyoingco/mission-demolition-unity` | `link-github-mission-demolition` | `open mission-demolition` |
| Sleep Efficiency Analysis | `https://github.com/markyoingco/sleep-efficiency-analysis` | `link-github-sleep-efficiency` | `open sleep-analysis` |
| Marquette Basketball Predictor | `https://github.com/markyoingco/marquette-basketball-predictor-2024` | `link-github-marquette-basketball-predictor` | `open basketball-predictor` |

### Other public destinations

| Destination | Canonical URL / route | MarkAI ID | Terminal alias | Verification |
| --- | --- | --- | --- | --- |
| Portfolio home | `https://markyoingco.com` | `link-portfolio-home` | - | Static match |
| Portfolio section | `https://markyoingco.com` | `link-portfolio-section` | `open portfolio` | SPA screen (no hash) |
| Contact section | `https://markyoingco.com` | `link-contact-section` | `open contact` | SPA screen (no hash) |
| Testimonials section | `https://markyoingco.com` | `link-testimonials-section` | `open testimonials` | SPA screen (no hash) |
| Travel section | `https://markyoingco.com` | `link-travel-section` | `open travel` | SPA screen (no hash) |
| Resume PDF | `/documents/MarkPort_TechResume_2026.pdf` → absolutized in MarkAI responses | `link-resume-pdf` | `open resume` | Path matches `resumeDocument.js` |
| GitHub profile | `https://github.com/markyoingco` | `link-github-profile` | `open github` | Match |
| LinkedIn | `https://www.linkedin.com/in/mark-yoingco` | `link-linkedin` | `open linkedin` | Match |
| VSCO | `https://vsco.co/markyoingco/gallery` | `link-vsco` | `open vsco` / `open photography` | Match |
| MarkAI route | `https://markyoingco.com/#markai` | `link-markai-route` | `open markai` | In-app open; hash not SPA-wired |
| Email | mailto (disabled) | `link-email` | - | Never returned |

### Contextual MarkAI behavior

- Links selected server-side after classification; model never invents URLs.
- Short follow-ups (`Repo?`, `Can I see the code?`, `Photos?`) resolve from bounded recent history.
- Unknown/no-public-repo projects fall back to Portfolio section with explicit wording.
- Deterministic fallback returns the same contextual `links[]` when provider is disabled/fails/rejected/rate-limited.
- Internal `link-*` IDs never appear in answer prose.

### Example query → links

| Query example | Fallback links |
| --- | --- |
| Abacus contribution / team | Abacus repository |
| Justin projects | Abacus + MAAT repositories |
| Allan project | Basketball Predictor repository |
| Photography / travel photos | Travel section + VSCO |
| Contact | Contact section + LinkedIn |
| Résumé | Resume PDF |
| All public links | Home, portfolio, contact, testimonials, travel, GitHub, LinkedIn, resume, VSCO |

Do not export this development report into `approved-v1.json`.
