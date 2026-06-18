import 'package:flutter/material.dart';
import 'theme.dart';

const kAdminEmail = 'sampathlox@gmail.com';

/// The six DevSocio post types (mirrors src/components/postTypes.jsx).
class PostType {
  final String label;
  final IconData icon;
  final Color tint;
  const PostType(this.label, this.icon, this.tint);
}

const kPostTypes = <PostType>[
  PostType('Code Snippet', Icons.code, AppColors.primary),
  PostType('Project Showcase', Icons.rocket_launch, AppColors.accent),
  PostType('Idea Post', Icons.lightbulb_outline, AppColors.warning),
  PostType('Dev Meme', Icons.sentiment_very_satisfied, AppColors.danger),
  PostType('Question / Help', Icons.help_outline, AppColors.success),
  PostType('Opinion / Take', Icons.local_fire_department, AppColors.orange),
];

PostType postTypeFor(String label) =>
    kPostTypes.firstWhere((t) => t.label == label, orElse: () => kPostTypes[0]);

const kDevLevels = ['Builder', 'Maker', 'Founder'];

const kStoryReactions = ['🚀', '💀', '🔥', '🤯', '👾', '✅'];

const kTechStackOptions = [
  'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Node.js', 'Express',
  'Python', 'Django', 'Flask', 'FastAPI', 'TypeScript', 'JavaScript',
  'Go', 'Rust', 'Java', 'Kotlin', 'Swift', 'Flutter', 'Dart',
  'C++', 'C#', '.NET', 'Ruby', 'Rails', 'PHP', 'Laravel',
  'PostgreSQL', 'MongoDB', 'Firebase', 'Supabase', 'GraphQL',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'TailwindCSS', 'Figma',
];

/// Credit shop items (mirrors the web Credits page rewards).
class Reward {
  final String id;
  final String title;
  final String description;
  final int cost;
  final IconData icon;
  const Reward(this.id, this.title, this.description, this.cost, this.icon);
}

const kRewards = <Reward>[
  Reward('featured', 'Featured Post', 'Pin a post for 7 days', 500,
      Icons.push_pin),
  Reward('boost', 'Profile Boost', 'Highlighted in Explore', 200,
      Icons.trending_up),
  Reward('verified', 'Verified Badge', 'Blue checkmark', 300, Icons.verified),
  Reward('persona', 'Custom AI Persona', 'Personalize AI replies', 150,
      Icons.auto_awesome),
  Reward('aiboost', 'AI Boost', '5 extra AI uses', 100, Icons.bolt),
  Reward('theme', 'Profile Theme', 'Unlock a premium theme', 250,
      Icons.palette),
  Reward('topdev', 'Top Dev Badge', 'Stand out on the leaderboard', 400,
      Icons.workspace_premium),
];
