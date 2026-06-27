import { Code2, ImageIcon, Lightbulb, Smile, HelpCircle, Flame } from './icons'

// Post type -> { icon component, tint colour }. Mirrors POST_TYPES in mock.js.
export const TYPE_META = {
  'Code Snippet':      { Icon: Code2,       tint: '#FCA311' },
  'Project Showcase':  { Icon: ImageIcon,   tint: '#22C55E' },
  'Idea Post':         { Icon: Lightbulb,   tint: '#FCA311' },
  'Dev Meme':          { Icon: Smile,       tint: '#F472B6' },
  'Question / Help':   { Icon: HelpCircle,  tint: '#60A5FA' },
  'Opinion / Take':    { Icon: Flame,       tint: '#FB923C' },
}

export const ICON_BY_KEY = { Code2, ImageIcon, Lightbulb, Smile, HelpCircle, Flame }
