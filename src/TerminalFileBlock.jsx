function TerminalFileContentLine({ item, lineIndex }) {
  if (item.type === 'blank') {
    return (
      <div
        key={`blank-${lineIndex}`}
        className="terminal-output__spacer terminal-file-block__spacer"
        aria-hidden="true"
      />
    )
  }

  if (item.type === 'link') {
    return (
      <div
        key={`link-${lineIndex}-${item.href}`}
        className="terminal-output__line terminal-file-block__line terminal-file-block__contact"
      >
        <span className="terminal-file-block__contact-label">{item.prefix}</span>
        <a
          href={item.href}
          className="terminal-output__link"
          {...(item.external !== false
            ? { target: '_blank', rel: 'noreferrer noopener' }
            : {})}
        >
          {item.label}
        </a>
      </div>
    )
  }

  if (item.type === 'title') {
    return (
      <div
        key={`title-${lineIndex}`}
        className="terminal-output__line terminal-file-block__line terminal-file-block__title"
      >
        {item.value}
      </div>
    )
  }

  if (item.type === 'lead') {
    return (
      <div
        key={`lead-${lineIndex}`}
        className="terminal-output__line terminal-file-block__line terminal-file-block__lead"
      >
        {item.value}
      </div>
    )
  }

  if (item.type === 'section') {
    return (
      <div
        key={`section-${lineIndex}-${item.value}`}
        className="terminal-output__line terminal-file-block__line terminal-file-block__section"
      >
        {item.value}
      </div>
    )
  }

  if (item.type === 'project') {
    return (
      <div
        key={`project-${lineIndex}-${item.index}`}
        className="terminal-output__line terminal-file-block__line terminal-file-block__project"
      >
        <span className="terminal-file-block__project-index">[{item.index}]</span>{' '}
        {item.value}
      </div>
    )
  }

  if (item.type === 'bullet') {
    return (
      <div
        key={`bullet-${lineIndex}`}
        className="terminal-output__line terminal-output__line--muted terminal-file-block__line terminal-file-block__bullet"
      >
        <span className="terminal-file-block__bullet-mark" aria-hidden="true">
          -
        </span>
        {item.value}
      </div>
    )
  }

  if (item.type === 'role') {
    return (
      <div
        key={`role-${lineIndex}`}
        className="terminal-output__line terminal-file-block__line terminal-file-block__role"
      >
        {item.value}
      </div>
    )
  }

  if (item.type === 'meta') {
    return (
      <div
        key={`meta-${lineIndex}`}
        className="terminal-output__line terminal-output__line--muted terminal-file-block__line terminal-file-block__meta"
      >
        {item.value}
      </div>
    )
  }

  if (item.type === 'stackLabel') {
    return (
      <div
        key={`stack-label-${lineIndex}`}
        className="terminal-output__line terminal-file-block__line terminal-file-block__stack-label"
      >
        {item.value}
      </div>
    )
  }

  if (item.type === 'stackValue') {
    return (
      <div
        key={`stack-value-${lineIndex}`}
        className="terminal-output__line terminal-output__line--muted terminal-file-block__line terminal-file-block__stack-value"
      >
        {item.value}
      </div>
    )
  }

  return (
    <div
      key={`text-${lineIndex}-${item.value}`}
      className="terminal-output__line terminal-output__line--muted terminal-file-block__line"
    >
      {item.value}
    </div>
  )
}

export default function TerminalFileBlock({ block }) {
  const { filename, separator, content } = block

  return (
    <div className="terminal-file-block">
      <div className="terminal-file-block__rule">{separator}</div>
      <div className="terminal-file-block__filename">{filename}</div>
      <div className="terminal-file-block__rule">{separator}</div>
      <div className="terminal-file-block__body">
        {content.map((item, lineIndex) => (
          <TerminalFileContentLine
            key={`${filename}-${lineIndex}`}
            item={item}
            lineIndex={lineIndex}
          />
        ))}
      </div>
      <div className="terminal-file-block__rule">{separator}</div>
      <div className="terminal-file-block__footer">End of {filename}</div>
      <div className="terminal-file-block__rule">{separator}</div>
    </div>
  )
}
