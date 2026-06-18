import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme.dart';
import '../../data/github_client.dart';
import '../../data/post_repository.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../models/app_user.dart';
import '../../widgets/avatar.dart';
import '../../widgets/badges.dart';
import '../../widgets/post_card.dart';

/// Resolves a username to its profile, then shows it.
final profileByUsernameProvider =
    FutureProvider.family<AppUser?, String>((ref, username) =>
        ref.watch(userRepositoryProvider).fetchByUsername(username));

class ProfileScreen extends ConsumerWidget {
  final String username;
  const ProfileScreen({super.key, required this.username});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(profileByUsernameProvider(username));

    return Scaffold(
      appBar: AppBar(title: Text('@$username')),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (user) {
          if (user == null) {
            return const Center(
                child: Text('User not found.',
                    style: TextStyle(color: AppColors.textMuted)));
          }
          // Watch the live doc so follower counts update in real time.
          final live = ref.watch(userRepositoryProvider).watchProfile(user.uid);
          return StreamBuilder<AppUser?>(
            stream: live,
            initialData: user,
            builder: (context, snap) =>
                _ProfileBody(user: snap.data ?? user),
          );
        },
      ),
    );
  }
}

class _ProfileBody extends ConsumerWidget {
  final AppUser user;
  const _ProfileBody({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(currentUserProvider).value;
    final following = ref.watch(myFollowingProvider).value ?? const {};
    final isMe = me?.uid == user.uid;
    final isFollowing = following.contains(user.uid);
    final postsAsync = ref.watch(userPostsProvider(user.uid));
    final ideasAsync = ref.watch(ideasProvider);
    final ghUsername = (user.links['github'] as String?)?.split('/').last ?? '';

    return DefaultTabController(
      length: 2,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Avatar(
                        url: user.avatar,
                        size: 76,
                        founderRing: user.founder,
                        online: user.isOnline),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _stat('Posts', user.postsCount),
                          _stat('Followers', user.followersCount),
                          _stat('Following', user.followingCount),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    NameWithBadges.fromUser(user, fontSize: 18),
                    const SizedBox(width: 8),
                    LevelBadge(user.devLevel),
                  ],
                ),
                Text('@${user.username}',
                    style: const TextStyle(color: AppColors.textMuted)),
                if (user.bio.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(user.bio, style: const TextStyle(height: 1.4)),
                ],
                if (user.techStack.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final t in user.techStack)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceAlt,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(t,
                              style: const TextStyle(
                                  fontSize: 12, color: AppColors.accent)),
                        ),
                    ],
                  ),
                ],
                if (user.links.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    children: [
                      for (final entry in user.links.entries)
                        if ((entry.value as String?)?.isNotEmpty ?? false)
                          IconButton(
                            visualDensity: VisualDensity.compact,
                            icon: Icon(_linkIcon(entry.key),
                                size: 20, color: AppColors.textMuted),
                            onPressed: () => _open(entry.value as String),
                          ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                _ActionRow(
                    user: user,
                    isMe: isMe,
                    isFollowing: isFollowing,
                    me: me),
              ],
            ),
          ),
          if (ghUsername.isNotEmpty) _GithubShowcase(username: ghUsername),
          const TabBar(
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textMuted,
            indicatorColor: AppColors.primary,
            tabs: [Tab(text: 'Posts'), Tab(text: 'Ideas')],
          ),
          // Tab content (height-bounded via a fixed-ish region).
          SizedBox(
            height: 600,
            child: TabBarView(
              children: [
                postsAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('$e')),
                  data: (posts) => posts.isEmpty
                      ? const _Empty(text: 'No posts yet.')
                      : ListView(
                          children: posts
                              .map((p) => PostCard(post: p))
                              .toList()),
                ),
                ideasAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('$e')),
                  data: (ideas) {
                    final mine = ideas
                        .where((i) => i.authorUid == user.uid)
                        .toList();
                    return mine.isEmpty
                        ? const _Empty(text: 'No ideas yet.')
                        : ListView(
                            children: mine
                                .map((i) => ListTile(
                                      leading: const Icon(Icons.lightbulb,
                                          color: AppColors.warning),
                                      title: Text(i.description,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis),
                                      subtitle:
                                          Text('${i.invested} invested'),
                                    ))
                                .toList());
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _stat(String label, int value) => Column(
        children: [
          Text('$value',
              style: const TextStyle(
                  fontSize: 18, fontWeight: FontWeight.w700)),
          Text(label,
              style:
                  const TextStyle(fontSize: 12, color: AppColors.textMuted)),
        ],
      );

  IconData _linkIcon(String platform) {
    switch (platform.toLowerCase()) {
      case 'github':
        return Icons.code;
      case 'linkedin':
        return Icons.business_center;
      case 'twitter':
      case 'x':
        return Icons.alternate_email;
      case 'youtube':
        return Icons.play_circle_outline;
      default:
        return Icons.link;
    }
  }

  Future<void> _open(String url) async {
    final uri = Uri.tryParse(url.startsWith('http') ? url : 'https://$url');
    if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class _ActionRow extends ConsumerWidget {
  final AppUser user;
  final bool isMe;
  final bool isFollowing;
  final AppUser? me;
  const _ActionRow(
      {required this.user,
      required this.isMe,
      required this.isFollowing,
      required this.me});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (isMe) {
      return Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => context.push('/edit-profile'),
              icon: const Icon(Icons.edit, size: 16),
              label: const Text('Edit profile'),
              style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.textPrimary,
                  side: const BorderSide(color: AppColors.border)),
            ),
          ),
          const SizedBox(width: 8),
          OutlinedButton(
            onPressed: () => context.push('/settings'),
            style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textPrimary,
                side: const BorderSide(color: AppColors.border)),
            child: const Icon(Icons.settings, size: 18),
          ),
        ],
      );
    }
    final m = me;
    if (m == null) return const SizedBox.shrink();
    return Row(
      children: [
        Expanded(
          child: ElevatedButton(
            onPressed: () async {
              await ref
                  .read(userRepositoryProvider)
                  .setFollow(m.uid, user.uid, !isFollowing);
              if (!isFollowing) {
                ref.read(socialRepositoryProvider).pushNotification(user.uid, {
                  'type': 'follow',
                  'actorUid': m.uid,
                  'actor': m.asAuthor.toMap(),
                  'text': 'started following you',
                }).catchError((_) {});
              }
            },
            style: ElevatedButton.styleFrom(
                backgroundColor:
                    isFollowing ? AppColors.surfaceAlt : AppColors.primary),
            child: Text(isFollowing ? 'Following' : 'Follow'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => context.push('/chat/${user.uid}'),
            icon: const Icon(Icons.chat_bubble_outline, size: 16),
            label: const Text('Message'),
            style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textPrimary,
                side: const BorderSide(color: AppColors.border)),
          ),
        ),
      ],
    );
  }
}

class _GithubShowcase extends ConsumerWidget {
  final String username;
  const _GithubShowcase({required this.username});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reposAsync = ref.watch(githubReposProvider(username));
    return reposAsync.maybeWhen(
      orElse: () => const SizedBox.shrink(),
      data: (repos) {
        if (repos.isEmpty) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: const [
                  Icon(Icons.code, size: 16, color: AppColors.textMuted),
                  SizedBox(width: 6),
                  Text('Featured repos',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ],
              ),
              const SizedBox(height: 8),
              ...repos.map((r) => Card(
                    child: ListTile(
                      title: Text(r.name,
                          style:
                              const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(
                          r.description.isEmpty ? r.language : r.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star,
                              size: 14, color: AppColors.warning),
                          const SizedBox(width: 3),
                          Text('${r.stars}'),
                        ],
                      ),
                      onTap: () async {
                        final uri = Uri.tryParse(r.htmlUrl);
                        if (uri != null) {
                          await launchUrl(uri,
                              mode: LaunchMode.externalApplication);
                        }
                      },
                    ),
                  )),
            ],
          ),
        );
      },
    );
  }
}

class _Empty extends StatelessWidget {
  final String text;
  const _Empty({required this.text});
  @override
  Widget build(BuildContext context) => Center(
      child: Padding(
          padding: const EdgeInsets.all(40),
          child: Text(text,
              style: const TextStyle(color: AppColors.textMuted))));
}
