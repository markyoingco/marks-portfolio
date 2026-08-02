/**
 * Deterministic MarkAI suggested questions.
 * Session persistence is deferred; these reset with New Chat / remount.
 */

export const MARKAI_SUGGESTED_QUESTIONS = [
  {
    id: 'suggest-about-mark',
    label: 'Tell me about Mark.',
    question: 'Tell me about Mark.',
    category: 'profile',
  },
  {
    id: 'suggest-abacus',
    label: 'What did Mark contribute to Abacus?',
    question: 'What did Mark contribute to Abacus?',
    category: 'abacus',
  },
  {
    id: 'suggest-technologies',
    label: 'What technologies has Mark worked with?',
    question: 'What technologies has Mark worked with?',
    category: 'technologies',
  },
  {
    id: 'suggest-individual',
    label: 'What did Mark build by himself?',
    question: 'What did Mark build by himself?',
    category: 'individual-team',
  },
  {
    id: 'suggest-experience',
    label: 'What experience does Mark have outside the classroom?',
    question: 'What experience does Mark have outside the classroom?',
    category: 'work',
  },
  {
    id: 'suggest-contact',
    label: 'How can I contact Mark?',
    question: 'How can I contact Mark?',
    category: 'contact',
  },
]
