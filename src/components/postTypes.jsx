import { Code2, ImageIcon, Lightbulb, Smile, HelpCircle, Flame } from './icons'

// Post type -> { icon component, tint colour }. Mirrors POST_TYPES in mock.js.
export const TYPE_META = {
  'Code Snippet': { Icon: Code2, tint: '#6C63FF' },
  'Project Showcase': { Icon: ImageIcon, tint: '#00E5FF' },
  'Idea Post': { Icon: Lightbulb, tint: '#FFB800' },
  'Dev Meme': { Icon: Smile, tint: '#FF4C4C' },
  'Question / Help': { Icon: HelpCircle, tint: '#00C896' },
  'Opinion / Take': { Icon: Flame, tint: '#FF7043' },
}

export const ICON_BY_KEY = { Code2, ImageIcon, Lightbulb, Smile, HelpCircle, Flame }
