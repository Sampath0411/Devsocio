// Central icon set — lucide-react for UI, custom SVGs for brand marks.
// Keeping them in one place lets us swap the icon library in one edit.
export {
  Home,
  Compass,
  Lightbulb,
  Mail,
  Bell,
  Coins,
  User,
  UserPlus,
  Users,
  LogOut,
  Plus,
  Search,
  Send,
  Code2,
  Image as ImageIcon,
  Sparkles,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Bookmark,
  MoreHorizontal,
  Check,
  CheckCheck,
  X,
  Settings,
  TrendingUp,
  Trophy,
  Star,
  Crown,
  Rocket,
  Gift,
  Skull,
  Flame,
  Zap,
  Brain,
  Handshake,
  Circle,
  ChevronLeft,
  Pin,
  Palette,
  BadgeCheck,
  Bot,
  HelpCircle,
  Quote,
  AlertTriangle,
  Smile,
  Link2,
  Eye,
  EyeOff,
  Lock,
  ShieldAlert,
  Shield,
  Flag,
  Menu,
  PenSquare,
  Camera,
  Copy,
  Trash2,
  FileText,
  AtSign,
  ArrowRight,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Loader2,
  Download,
} from 'lucide-react'

// ---- Brand marks (lucide dropped brand icons) ----
export function GithubMark({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5C5.73.5.5 5.74.5 12.04c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.55-3.88-1.55-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.78 2.7 1.27 3.36.97.1-.75.4-1.27.73-1.56-2.56-.29-5.25-1.29-5.25-5.74 0-1.27.45-2.3 1.19-3.12-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.19a11 11 0 0 1 5.79 0c2.2-1.5 3.17-1.19 3.17-1.19.63 1.59.24 2.77.12 3.06.74.82 1.18 1.85 1.18 3.12 0 4.46-2.69 5.44-5.26 5.73.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.55 11.55 0 0 0 23.5 12.04C23.5 5.74 18.27.5 12 .5Z" />
    </svg>
  )
}

export function GoogleMark({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.82-.07-1.6-.21-2.36H12v4.46h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.72Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29V6.62H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4.01-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.09C6.23 6.86 8.88 4.75 12 4.75Z" />
    </svg>
  )
}
