// Mock data for the DevSocio prototype. In production these come from
// Firestore collections (PRD §8.3). Shapes mirror those collections.

// Tech-stack tag → color, rendered as colorful pills (PRD §3.2.1).
export const STACK_COLORS = {
  React: '#61DAFB',
  'Next.js': '#FFFFFF',
  TypeScript: '#3178C6',
  JavaScript: '#F7DF1E',
  Python: '#3776AB',
  Flutter: '#54C5F8',
  Go: '#00ADD8',
  Rust: '#FF7043',
  Node: '#3C873A',
  'Tailwind': '#38BDF8',
  Firebase: '#FFCA28',
  AWS: '#FF9900',
  Figma: '#F24E1E',
  Solidity: '#A6A6A6',
  Swift: '#FA7343',
}

export const DEV_LEVELS = {
  Beginner: { color: '#439a86' },
  Builder: { color: '#007991' },
  Senior: { color: '#439a86' },
  Founder: { color: '#FFB800' },
}

const av = (seed, bg) =>
  `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}&backgroundColor=${bg}`

export const CURRENT_USER = {
  uid: 'u_me',
  username: 'you_dev',
  displayName: 'You',
  bio: 'Building things on DevSocio. Frontend-leaning full-stack dev.',
  avatar: av('youdev', '007991'),
  devLevel: 'Builder',
  techStack: ['React', 'TypeScript', 'Node', 'Tailwind'],
  credits: 380,
  followersCount: 128,
  followingCount: 212,
  postsCount: 14,
  openToCollab: true,
  lookingForCofounder: false,
  links: { github: 'you', linkedin: 'you', portfolio: 'you.dev', twitter: 'you' },
}

export const USERS = [
  {
    uid: 'u_arjun',
    username: 'arjun_builds',
    displayName: 'Arjun',
    bio: 'First-year CSE • learning React • shipping ugly things proudly 🌱',
    avatar: av('arjun', '439a86'),
    devLevel: 'Beginner',
    techStack: ['React', 'JavaScript'],
    followersCount: 42,
    followingCount: 180,
    openToCollab: true,
    lookingForCofounder: false,
  },
  {
    uid: 'u_priya',
    username: 'priya.dev',
    displayName: 'Priya',
    bio: 'Freelance full-stack • 2 yrs • open to collabs • code > talk',
    avatar: av('priya', 'c084fc'),
    devLevel: 'Builder',
    techStack: ['React', 'Node', 'Python', 'AWS'],
    followersCount: 1240,
    followingCount: 320,
    openToCollab: true,
    lookingForCofounder: false,
  },
  {
    uid: 'u_rohit',
    username: 'rohit_founds',
    displayName: 'Rohit',
    bio: 'Early-stage SaaS founder • non-technical • looking for a dev co-founder 🚀',
    avatar: av('rohit', 'ffb800'),
    devLevel: 'Founder',
    techStack: ['Figma', 'AWS'],
    followersCount: 890,
    followingCount: 410,
    openToCollab: true,
    lookingForCofounder: true,
  },
  {
    uid: 'u_sneha',
    username: 'sneha.eng',
    displayName: 'Sneha',
    bio: 'Senior engineer @ product co • OSS contributor • here to mentor ⚡',
    avatar: av('sneha', '00c896'),
    devLevel: 'Senior',
    techStack: ['Go', 'Rust', 'Python', 'AWS'],
    followersCount: 5600,
    followingCount: 140,
    openToCollab: false,
    lookingForCofounder: false,
  },
  {
    uid: 'u_maya',
    username: 'maya_flutters',
    displayName: 'Maya',
    bio: 'Mobile dev • Flutter all day • design systems nerd',
    avatar: av('maya', 'fa7343'),
    devLevel: 'Builder',
    techStack: ['Flutter', 'Firebase', 'Figma'],
    followersCount: 760,
    followingCount: 200,
    openToCollab: true,
    lookingForCofounder: false,
  },
]

const userByName = (n) => USERS.find((u) => u.username === n)

export const POSTS = [
  {
    postId: 'p1',
    author: userByName('priya.dev'),
    type: 'Code Snippet',
    createdAt: '2h',
    content: 'Tiny debounce hook I reach for in every React project 👇',
    code: `function useDebounce(value, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return v
}`,
    language: 'jsx',
    tags: ['React', 'TypeScript'],
    hashtags: ['#reacthooks', '#cleancode'],
    likes: 132,
    commentsCount: 18,
    aiAnalysis: 'A custom hook that delays a value update until input settles — great for search boxes.',
  },
  {
    postId: 'p2',
    author: userByName('arjun_builds'),
    type: 'Project Showcase',
    createdAt: '5h',
    content: 'Shipped my first ever project — a weather app with animated backgrounds! Be gentle 😅',
    image: 'gradient-sky',
    tags: ['React', 'JavaScript'],
    hashtags: ['#firstproject', '#buildinpublic'],
    likes: 207,
    commentsCount: 41,
    aiAnalysis: 'Project concept: 7/10 — solid beginner build. Next: add geolocation + caching to stand out.',
  },
  {
    postId: 'p3',
    author: userByName('rohit_founds'),
    type: 'Idea Post',
    createdAt: '8h',
    content:
      'Idea: a "Figma for backend architecture" — drag-drop services, auto-generate IaC + cost estimate. Looking for a technical co-founder. 🚀',
    tags: ['AWS', 'Go'],
    hashtags: ['#startup', '#cofounder'],
    likes: 98,
    commentsCount: 27,
    aiAnalysis: 'Market score 8/10. Strong: clear pain point, hot infra space. Watch: crowded tooling market, needs deep cloud expertise.',
  },
  {
    postId: 'p4',
    author: userByName('sneha.eng'),
    type: 'Opinion / Take',
    createdAt: '1d',
    content:
      'Hot take: most "10x engineer" talk is just people who delete more code than they write. Simplicity is the real flex.',
    tags: ['Go', 'Rust'],
    hashtags: ['#hottake', '#engineering'],
    likes: 421,
    commentsCount: 88,
    aiAnalysis: 'Counter-angle: 10x impact can also come from leverage (tooling, mentoring), not just code reduction.',
  },
  {
    postId: 'p5',
    author: userByName('maya_flutters'),
    type: 'Dev Meme',
    createdAt: '1d',
    content: 'Works on my machine ¯\\_(ツ)_/¯',
    image: 'gradient-meme',
    tags: ['Flutter'],
    hashtags: ['#devhumor'],
    likes: 980,
    commentsCount: 53,
    aiAnalysis: 'Humor level: 9/10 — certified relatable 💀',
    memeScore: 9,
  },
]

export const IDEAS = [
  {
    ideaId: 'i1',
    author: userByName('rohit_founds'),
    title: 'Figma for Backend Architecture',
    body: 'Drag-drop cloud services onto a canvas, auto-generate Terraform + a live cost estimate. Visual infra for teams that hate YAML.',
    createdAt: '8h',
    invested: 1420,
    aiScore: 8.4,
    strengths: ['Clear, painful problem', 'Hot infra/devtools space', 'Strong visual demo potential'],
    weaknesses: ['Crowded IaC tooling market', 'Needs deep multi-cloud expertise', 'Hard to monetize early'],
    competitors: ['Terraform Cloud', 'Brainboard', 'Cloudcraft'],
    comments: 27,
    tags: ['AWS', 'Go'],
  },
  {
    ideaId: 'i2',
    author: userByName('priya.dev'),
    title: 'CollabMatch — Tinder for dev co-founders',
    body: 'Swipe on devs by stack + timezone + commitment level. Mutual match opens a collab board with a shared milestone tracker.',
    createdAt: '1d',
    invested: 890,
    aiScore: 7.1,
    strengths: ['Network-effect potential', 'Fits DevSocio natively', 'Viral, shareable format'],
    weaknesses: ['Cold-start problem', 'Trust/quality matching is hard', 'Retention beyond novelty'],
    competitors: ['CoFoundersLab', 'YC Co-founder Matching'],
    comments: 19,
    tags: ['React', 'Firebase'],
  },
  {
    ideaId: 'i3',
    author: userByName('maya_flutters'),
    title: 'PR Roast — AI that reviews like a grumpy senior',
    body: 'GitHub bot that reviews PRs with brutally honest (but useful) feedback in a configurable personality. Free tier = mild, paid = savage.',
    createdAt: '2d',
    invested: 640,
    aiScore: 6.8,
    strengths: ['Fun, shareable hook', 'Real value in review quality', 'Clear upgrade path'],
    weaknesses: ['Crowded AI-review space', 'Tone risk for teams', 'LLM cost per review'],
    competitors: ['CodeRabbit', 'Greptile', 'GitHub Copilot'],
    comments: 12,
    tags: ['Python', 'React'],
  },
]

export const NOTIFICATIONS = [
  { id: 'n1', type: 'like', actor: userByName('priya.dev'), text: 'liked your post', time: '12m', read: false },
  { id: 'n2', type: 'follow', actor: userByName('sneha.eng'), text: 'started following you', time: '1h', read: false },
  { id: 'n3', type: 'collab', actor: userByName('rohit_founds'), text: 'sent you a collab request', time: '3h', read: false },
  { id: 'n4', type: 'comment', actor: userByName('arjun_builds'), text: 'commented: "this is clean 🔥"', time: '5h', read: true },
  { id: 'n5', type: 'credits', actor: null, text: 'You earned +150 credits — a referral signed up! 🎉', time: '1d', read: true },
]

export const CONVERSATIONS = [
  { id: 'c1', user: userByName('priya.dev'), last: 'wanna pair on that hook lib?', time: '2m', unread: 2, online: true },
  { id: 'c2', user: userByName('rohit_founds'), last: 'Collab Request: Figma for Backend', time: '1h', unread: 0, online: true, isCollab: true },
  { id: 'c3', user: userByName('sneha.eng'), last: 'nice work on the PR 👏', time: '4h', unread: 0, online: false },
  { id: 'c4', user: userByName('maya_flutters'), last: 'sent a project link', time: '1d', unread: 0, online: false },
]

export const TRENDING_HASHTAGS = [
  { tag: '#buildinpublic', posts: '2.4k' },
  { tag: '#reacthooks', posts: '1.1k' },
  { tag: '#startup', posts: '980' },
  { tag: '#hottake', posts: '760' },
  { tag: '#firstproject', posts: '540' },
]

export const LEADERBOARD = [
  { rank: 1, user: userByName('sneha.eng'), credits: 4820 },
  { rank: 2, user: userByName('priya.dev'), credits: 3910 },
  { rank: 3, user: userByName('maya_flutters'), credits: 2740 },
  { rank: 4, user: userByName('rohit_founds'), credits: 2110 },
  { rank: 5, user: CURRENT_USER, credits: 380 },
]

// Credits shop — PRD §5.2
export const REWARDS = [
  { id: 'r1', name: 'Featured Post', cost: 200, desc: 'Pinned to Explore for 24h', icon: 'Pin' },
  { id: 'r2', name: 'Profile Boost', cost: 150, desc: 'Shown in Suggested Devs for 48h', icon: 'Rocket' },
  { id: 'r3', name: 'Verified Badge', cost: 500, desc: 'Green checkmark (activity-based)', icon: 'BadgeCheck' },
  { id: 'r4', name: 'Custom AI Persona', cost: 300, desc: 'Unique AI style for your posts', icon: 'Bot' },
  { id: 'r5', name: 'Extra AI Calls', cost: 50, desc: '5 calls beyond daily limit', icon: 'Zap' },
  { id: 'r6', name: 'Profile Theme', cost: 100, desc: 'Premium color schemes', icon: 'Palette' },
  { id: 'r7', name: '"Top Dev" Badge', cost: 1000, desc: 'Permanent leaderboard badge', icon: 'Crown' },
]

// Earning rules — PRD §5.1
export const EARN_RULES = [
  { action: 'Sign up', amount: 100 },
  { action: 'Complete profile', amount: 50 },
  { action: 'First post published', amount: 30 },
  { action: 'Daily login', amount: 5 },
  { action: 'Post gets 10 likes', amount: 20 },
  { action: 'Refer a friend (signs up)', amount: 150 },
  { action: 'Weekly streak (7 days)', amount: 100 },
]

// `icon` maps to a key in TYPE_ICONS (src/components/postTypes.js).
export const POST_TYPES = [
  { type: 'Code Snippet', icon: 'Code2', tint: '#007991', ai: 'AI explains the code in 1 line' },
  { type: 'Project Showcase', icon: 'ImageIcon', tint: '#439a86', ai: 'AI rates the project concept' },
  { type: 'Idea Post', icon: 'Lightbulb', tint: '#FFB800', ai: 'AI gives market score + feedback' },
  { type: 'Dev Meme', icon: 'Smile', tint: '#FF4C4C', ai: 'AI detects if it’s actually funny' },
  { type: 'Question / Help', icon: 'HelpCircle', tint: '#439a86', ai: 'AI suggests a first answer' },
  { type: 'Opinion / Take', icon: 'Flame', tint: '#FF7043', ai: 'AI finds counter-arguments' },
]
