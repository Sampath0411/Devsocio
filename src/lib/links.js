// Detect a social platform from a pasted URL and extract a display handle.
// Returns { platform, url, handle }. Platform drives which icon to show.
export function detectLink(raw) {
  if (!raw) return null
  let url = raw.trim()
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  let host = '', path = ''
  try {
    const u = new URL(url)
    host = u.hostname.replace(/^www\./, '').toLowerCase()
    path = u.pathname.replace(/^\/|\/$/g, '')
  } catch {
    return { platform: 'link', url, handle: raw }
  }
  const seg = path.split('/')[0] || ''
  if (host.includes('github.com')) return { platform: 'github', url, handle: seg || 'github' }
  if (host.includes('linkedin.com')) return { platform: 'linkedin', url, handle: seg.replace(/^in$/, '') ? path.split('/')[1] || 'profile' : 'profile' }
  if (host.includes('twitter.com') || host.includes('x.com')) return { platform: 'twitter', url, handle: seg || 'x' }
  if (host.includes('instagram.com')) return { platform: 'instagram', url, handle: seg || 'instagram' }
  if (host.includes('youtube.com') || host.includes('youtu.be')) return { platform: 'youtube', url, handle: seg || 'youtube' }
  if (host.includes('dev.to')) return { platform: 'devto', url, handle: seg || 'dev.to' }
  return { platform: 'portfolio', url, handle: host }
}

// Map of platform → label, for rendering.
export const PLATFORM_LABEL = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  twitter: 'X',
  instagram: 'Instagram',
  youtube: 'YouTube',
  devto: 'dev.to',
  portfolio: 'Website',
  link: 'Link',
}
