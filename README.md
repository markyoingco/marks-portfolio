# Mark Yoingco Portfolio Platform

A multi-mode personal portfolio built with React, Vite, JavaScript, CSS, PHP, MySQL, and Cloudflare Workers AI.

The platform combines three connected experiences:

- A cinematic responsive Webpage
- An interactive command-line Terminal
- MarkAI, a conversational portfolio assistant

**Live site:** https://markyoingco.com

## Purpose

This platform serves as my personal brand, technical proof page, and central place for recruiters, professors, and collaborators to explore my background and work.

It presents my:

- Resume
- Software projects
- Technical skills
- Education
- Work experience
- Testimonials
- Travel photography
- Leadership and involvement
- Career direction
- Contact information

## Portfolio Modes

### Webpage

A cinematic visual portfolio with responsive navigation, project cards, About panels, testimonials, travel photography, contact workflows, resume access, and dark/light themes.

The Webpage includes:

- Home
- About
- Portfolio
- Testimonials
- Travel
- Contact
- Resume viewing and downloading
- Responsive desktop, tablet, and mobile layouts
- Dark and light theme switching
- Shared project, testimonial, and travel data

### Terminal

An interactive command-line portfolio where visitors can explore content through terminal-style commands.

Supported functionality includes:

- `cd` folder navigation
- `ls` file and folder listings
- `cat` readable text files
- `open` portfolio pages, GitHub repositories, LinkedIn, VSCO, and other approved public links
- Resume PDF opening and downloading
- Nested project and testimonial folders
- Context-aware Help panels
- Tab autocomplete
- Command history
- Editable command input
- Public-link aliases
- Terminal-based contact submissions through `message.form`
- Responsive desktop and mobile layouts

The Terminal also includes a personal archive with Mark's original writing about his mindset, goals, interests, growth, and life outside technology.

### MarkAI

MarkAI is a conversational portfolio assistant focused on Mark's intentionally public professional information.

Visitors can ask about:

- Background and education
- Technical skills
- Software projects
- Verified project contributions
- Work experience
- Leadership
- Testimonials
- Career goals
- Interests
- Portfolio navigation
- Public project and social links

MarkAI is built with:

- React/Vite chat interface
- Private PHP backend
- Cloudflare Workers AI
- Approved structured knowledge records
- Intent classification
- Typo-tolerant natural-language routing
- Contextual follow-up handling
- Provider-response validation
- Deterministic fallback answers
- Safe public-link resolution
- Anonymous usage limits
- Privacy safeguards
- Fixture and regression testing

MarkAI does not provide private family, financial, relationship, medical, journal, or other sensitive personal information.

## Built With

### Languages

- JavaScript
- PHP
- SQL
- HTML
- CSS

### Frontend

- React
- Vite
- Responsive CSS
- Shared content modules

### Backend and Data

- PHP
- MySQL
- JSON API requests
- DreamHost shared hosting

### AI Integration

- Cloudflare Workers AI
- Intent classification
- Natural-language routing
- Contextual follow-up handling
- Provider-response validation
- Deterministic fallbacks
- Approved knowledge export

### Tools and Testing

- Git
- GitHub
- Docker and Docker Compose
- Linux/WSL
- DBeaver
- Figma
- PHP linting
- API integration testing
- Fixture and regression testing
- Vite build validation
- Responsive testing
- Manual debugging

## Portfolio Categories

- Portfolio Platform
- Senior Design Capstones
- Systems Programming
- Software Design and Analysis
- Programming Computer Games
- Data Science and Machine Learning
- Creative Leadership
- Service

## Current Features

- Cinematic dark-first visual design
- Dark and light theme switching
- Saved theme preference
- Responsive desktop, tablet, and mobile layouts
- Multi-mode navigation
- Interactive Terminal portfolio
- Conversational MarkAI experience
- Mobile-safe Terminal input and navigation
- Shared project, testimonial, and travel data
- Resume PDF viewing and downloading
- Project GitHub and webpage links
- Nested Terminal project folders
- Testimonial person folders
- Travel photography and VSCO integration
- PHP/MySQL contact form
- Terminal `message.form` contact workflow
- Intent classification and typo-tolerant routing
- Context-aware MarkAI follow-ups
- Provider-response validation
- Deterministic fallback answers
- Public knowledge and privacy safeguards
- Anonymous usage controls
- DreamHost deployment with a custom domain

## Terminal Structure

```text
terminal
├── resume
├── personal
│   ├── about.txt
│   ├── mindset.txt
│   ├── goals.txt
│   ├── beyond-work.txt
│   └── vsco.link
├── portfolio
├── testimonials
├── travel
└── contact
```

## MarkAI Knowledge and Privacy

MarkAI uses approved public records covering:

- Profile and education
- Skills
- Projects
- Verified contributions
- Work and leadership
- Testimonials
- Career direction
- Public interests
- Approved public links

The assistant is designed to avoid exposing:

- Private contact details beyond approved public links
- Family conflict or financial hardship
- Relationship information
- Medical or mental-health information
- Private journal content
- Precise current residence
- Private repositories
- Credentials or server configuration

## Deployment Structure

The public website is deployed to DreamHost and includes:

- Compiled React/Vite assets
- Public images and documents
- Public PHP contact endpoints

The private MarkAI server is stored outside the public web root and includes:

- PHP runtime services
- Provider integration
- Usage controls
- Approved generated knowledge
- Private local configuration files

Private configuration, credentials, runtime state, source files, and development dependencies are excluded from public deployment packages.

## Repository Notes

- Webpage, Terminal, and MarkAI are maintained in one repository.
- MarkAI is not a separate application or repository.
- The contact form and Terminal contact workflow use the same PHP/MySQL backend.
- Public MarkAI answers are limited to approved professional and intentionally public information.
- Production releases are built only after validation and review.
