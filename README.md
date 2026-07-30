# Mark Yoingco Portfolio Platform

A multi-mode personal portfolio built with React, Vite, JavaScript, CSS, PHP, and MySQL.

The platform combines a cinematic webpage, an interactive command-line terminal portfolio, and a live MarkAI portfolio assistant.

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
- Contact information

## Portfolio Modes

### Webpage

A cinematic, responsive portfolio experience with dark and light themes.

It includes:

- Home and professional positioning
- About, education, experience, skills, and beyond-work content
- Project cards across software, systems, games, data, leadership, and service work
- Testimonials
- Travel photography
- Contact and resume access

### Terminal

An interactive command-line portfolio for deeper exploration of the same professional content.

Supported functionality includes:

- `cd` folder navigation
- `ls` file and folder listings
- `cat` readable text files
- `open` for public webpage, GitHub, LinkedIn, and approved external links
- Public-link aliases for common destinations
- Resume PDF opening and downloading
- Nested project and testimonial folders
- Contextual Help panels
- Tab autocomplete
- Command history
- Editable command input
- Terminal-based contact submissions
- Responsive desktop and mobile layouts

### MarkAI

A live conversational portfolio assistant grounded in Mark's approved portfolio information.

MarkAI includes:

- A React/Vite chat interface
- A private PHP backend
- Cloudflare Workers AI integration
- Approved portfolio knowledge for projects, experience, skills, interests, and background
- Intent classification
- Typo-tolerant natural-language routing
- Contextual follow-up questions
- Deterministic fallback answers
- Provider-response validation
- Privacy safeguards
- Anonymous usage limiting
- Safe contextual public links

MarkAI answers from approved public information only. It does not invent private details, expose credentials, or claim unsupported AI capabilities.

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

### Backend and Data

- PHP
- MySQL
- JSON API requests

### AI Integration

- Cloudflare Workers AI
- LLM API integration
- Intent classification
- Provider-response validation
- Deterministic fallback system

### Testing

- Provider fixtures
- Runtime fixtures
- Usage fixtures
- Intent-understanding fixtures
- Contextual-link fixtures
- Privacy and answer-leak checks
- Manual responsive testing
- Vite build validation

### Deployment

- DreamHost
- Private server configuration outside the public web root
- Git and GitHub

## Webpage Sections

- Home
- About
- Portfolio
- Testimonials
- Travel
- Contact

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
- Multi-mode navigation between Webpage, Terminal, and MarkAI
- Interactive terminal portfolio
- Mobile-safe terminal input and navigation
- Shared project, testimonial, and travel data
- Resume PDF viewing and downloading
- Project GitHub and webpage links
- Nested terminal project folders
- Testimonial person folders
- Travel photography and VSCO integration
- PHP/MySQL contact form
- Terminal `message.form` contact workflow
- Live MarkAI assistant with validated provider answers and deterministic fallbacks
- DreamHost deployment with a custom domain

## Terminal Structure

```text
terminal
├── resume
├── personal
├── portfolio
├── testimonials
├── travel
└── contact
```
