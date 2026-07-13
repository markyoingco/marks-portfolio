import { FILE_CAT_SEPARATOR } from './terminalFileOutput'

export const CONTACT_FORM_STEPS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'message',
  'confirm',
]

export const CONTACT_FORM_FIELD_STEPS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'message',
]

export const CONTACT_FORM_TOTAL_STEPS = CONTACT_FORM_FIELD_STEPS.length

export const CONTACT_FORM_INPUT_PROMPT = '> '

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const FIELD_LABELS = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone optional',
  message: 'Message',
}

export function createInitialContactFormState() {
  return {
    active: false,
    step: 'firstName',
    data: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      message: '',
    },
  }
}

export function startContactFormState() {
  return {
    active: true,
    step: 'firstName',
    data: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      message: '',
    },
  }
}

export function isContactFormOutput(output) {
  return Boolean(output && output.kind === 'contactForm')
}

export function getContactFormStepIndex(step) {
  const index = CONTACT_FORM_FIELD_STEPS.indexOf(step)
  return index === -1 ? null : index + 1
}

export function getContactFormStepLabel(step) {
  const index = getContactFormStepIndex(step)
  if (index === null) {
    return ''
  }

  return `[${index}/${CONTACT_FORM_TOTAL_STEPS}] ${FIELD_LABELS[step]}:`
}

export function buildContactFormStartOutput() {
  return {
    kind: 'contactForm',
    variant: 'start',
    separator: FILE_CAT_SEPARATOR,
    title: 'message.form',
    lines: [
      { type: 'text', value: 'Terminal contact form started.' },
      { type: 'text', value: 'Type cancel anytime to exit.' },
      { type: 'blank' },
      { type: 'field', value: getContactFormStepLabel('firstName') },
    ],
  }
}

export function buildContactFormFieldOutput(step) {
  return {
    kind: 'contactForm',
    variant: 'field',
    lines: [{ type: 'field', value: getContactFormStepLabel(step) }],
  }
}

export function buildContactFormErrorOutput(step, error) {
  return {
    kind: 'contactForm',
    variant: 'error',
    lines: [
      { type: 'error', value: error },
      { type: 'field', value: getContactFormStepLabel(step) },
    ],
  }
}

export function buildContactFormReviewOutput(data) {
  return {
    kind: 'contactForm',
    variant: 'review',
    separator: FILE_CAT_SEPARATOR,
    title: 'Review message',
    lines: [
      { type: 'review', label: 'First name', value: data.firstName },
      { type: 'review', label: 'Last name', value: data.lastName },
      { type: 'review', label: 'Email', value: data.email },
      {
        type: 'review',
        label: 'Phone',
        value: data.phone || 'Not provided',
      },
      { type: 'review', label: 'Message', value: data.message },
      { type: 'blank' },
      {
        type: 'text',
        value: 'Submit message? Type y to send or n to cancel.',
      },
    ],
  }
}

export function buildContactFormConfirmErrorOutput() {
  return {
    kind: 'contactForm',
    variant: 'confirm-error',
    lines: [
      { type: 'error', value: 'Please type y to send or n to cancel.' },
      {
        type: 'text',
        value: 'Submit message? Type y to send or n to cancel.',
      },
    ],
  }
}

/** @deprecated Use buildContactFormStartOutput() */
export function getContactFormStartLines() {
  return []
}

/** @deprecated Use buildContactFormFieldOutput() */
export function getContactFormPrompt(step) {
  return getContactFormStepLabel(step)
}

export function validateContactFormField(step, value) {
  const trimmed = value.trim()

  if (step === 'phone') {
    return { valid: true, value: trimmed }
  }

  if (step === 'firstName' && trimmed === '') {
    return { valid: false, error: 'First name is required.' }
  }

  if (step === 'lastName' && trimmed === '') {
    return { valid: false, error: 'Last name is required.' }
  }

  if (step === 'email') {
    if (trimmed === '') {
      return { valid: false, error: 'Email is required.' }
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      return {
        valid: false,
        error: 'Invalid email. Please enter a valid email address.',
      }
    }
    return { valid: true, value: trimmed }
  }

  if (step === 'message' && trimmed === '') {
    return { valid: false, error: 'Message is required.' }
  }

  return { valid: true, value: trimmed }
}

export function getNextContactFormStep(step) {
  const index = CONTACT_FORM_STEPS.indexOf(step)
  if (index === -1 || index >= CONTACT_FORM_STEPS.length - 1) {
    return 'confirm'
  }

  return CONTACT_FORM_STEPS[index + 1]
}

/** @deprecated Use buildContactFormReviewOutput() */
export function buildContactFormReviewLines(data) {
  return []
}

export function parseContactFormConfirmInput(input) {
  const lower = input.trim().toLowerCase()

  if (lower === 'y' || lower === 'yes') {
    return 'yes'
  }

  if (lower === 'n' || lower === 'no' || lower === 'cancel') {
    return 'no'
  }

  return null
}

function isLocalDevHost() {
  if (typeof window === 'undefined') {
    return false
  }

  const hostname = window.location.hostname
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function getContactSubmitErrorLines() {
  if (isLocalDevHost()) {
    return [
      'Message could not send in local dev.',
      'This form uses /api/contact.php, which runs on DreamHost.',
      'Deploy to markyoingco.com to test the real database submission.',
    ]
  }

  return [
    'Message failed to send.',
    'Please try again or email me directly at markyoingco23@gmail.com.',
  ]
}

export async function submitTerminalContactMessage(data) {
  try {
    const response = await fetch('/api/contact.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        message: data.message,
      }),
    })

    const payload = await response.json().catch(() => null)

    if (response.ok && payload?.success) {
      return {
        ok: true,
        lines: [
          'Message sent successfully.',
          'Thank you - I’ll get back to you soon.',
        ],
      }
    }

    return {
      ok: false,
      lines: getContactSubmitErrorLines(),
    }
  } catch {
    return {
      ok: false,
      lines: getContactSubmitErrorLines(),
    }
  }
}
