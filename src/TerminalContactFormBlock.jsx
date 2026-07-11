function TerminalContactFormLine({ item, lineIndex }) {
  if (item.type === 'blank') {
    return (
      <div
        key={`form-blank-${lineIndex}`}
        className="terminal-output__spacer terminal-contact-form__spacer"
        aria-hidden="true"
      />
    )
  }

  if (item.type === 'field') {
    return (
      <div
        key={`form-field-${lineIndex}`}
        className="terminal-output__line terminal-contact-form__field"
      >
        {item.value}
      </div>
    )
  }

  if (item.type === 'error') {
    return (
      <div
        key={`form-error-${lineIndex}`}
        className="terminal-output__line terminal-contact-form__error"
      >
        {item.value}
      </div>
    )
  }

  if (item.type === 'review') {
    return (
      <div
        key={`form-review-${lineIndex}-${item.label}`}
        className="terminal-output__line terminal-contact-form__review"
      >
        <span className="terminal-contact-form__review-label">{item.label}:</span>{' '}
        <span className="terminal-contact-form__review-value">{item.value}</span>
      </div>
    )
  }

  return (
    <div
      key={`form-text-${lineIndex}`}
      className="terminal-output__line terminal-output__line--muted terminal-contact-form__text"
    >
      {item.value}
    </div>
  )
}

export default function TerminalContactFormBlock({ block }) {
  const { variant, separator, title, lines } = block
  const showHeader = variant === 'start' || variant === 'review'

  return (
    <div className="terminal-contact-form">
      {showHeader ? (
        <>
          <div className="terminal-contact-form__rule">{separator}</div>
          <div className="terminal-contact-form__title">{title}</div>
          <div className="terminal-contact-form__rule">{separator}</div>
        </>
      ) : null}
      <div className="terminal-contact-form__body">
        {lines.map((item, lineIndex) => (
          <TerminalContactFormLine key={`${variant}-${lineIndex}`} item={item} lineIndex={lineIndex} />
        ))}
      </div>
      {showHeader ? <div className="terminal-contact-form__rule">{separator}</div> : null}
    </div>
  )
}
