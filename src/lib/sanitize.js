import DOMPurify from 'dompurify'

// Strip ALL HTML from user-generated text — defense-in-depth. React already
// escapes children, but this guarantees no markup survives even if a value is
// ever rendered via dangerouslySetInnerHTML or copied into an href/title.
export const clean = (str) =>
  DOMPurify.sanitize(str || '', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })

export const cleanCode = (str) =>
  DOMPurify.sanitize(str || '', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
