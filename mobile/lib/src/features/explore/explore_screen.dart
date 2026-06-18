import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/post_repository.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../models/app_user.dart';
import '../../widgets/avatar.dart';
import '../../widgets/badges.dart';

enum _Filter { all, collab, cofounder, beginner, trending }

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});
  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  String _query = '';
  _Filter _filter = _Filter.all;

  bool _matchesQuery(AppUser u) {
    if (_query.isEmpty) return true;
    final q = _query.toLowerCase();
    return u.username.toLowerCase().contains(q) ||
        u.displayName.toLowerCase().contains(q) ||
        u.bio.toLowerCase().contains(q) ||
        u.techStack.any((t) => t.toLowerCase().contains(q));
  }

  bool _matchesFilter(AppUser u) {
    switch (_filter) {
      case _Filter.all:
        return true;
      case _Filter.collab:
        return u.openToCollab;
      case _Filter.cofounder:
        return u.lookingForCofounder;
      case _Filter.beginner:
        return u.devLevel == 'Builder';
      case _Filter.trending:
        return true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final usersAsync = ref.watch(usersProvider);
    final postsAsync = ref.watch(feedProvider);
    final me = ref.watch(currentUserProvider).value;

    // Tally trending hashtags from posts.
    final tagCounts = <String, int>{};
    for (final p in postsAsync.value ?? const []) {
      for (final h in p.hashtags) {
        tagCounts[h] = (tagCounts[h] ?? 0) + 1;
      }
    }
    final trending = tagCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Scaffold(
      appBar: AppBar(title: const Text('Explore')),
      body: usersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (users) {
          var results = users
              .where((u) => u.uid != me?.uid)
              .where(_matchesQuery)
              .where(_matchesFilter)
              .toList();
          if (_filter == _Filter.trending) {
            results.sort((a, b) =>
                (b.followersCount).compareTo(a.followersCount));
          }

          return ListView(
            padding: const EdgeInsets.only(bottom: 90),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                child: TextField(
                  onChanged: (v) => setState(() => _query = v.trim()),
                  decoration: const InputDecoration(
                    hintText: 'Search devs, stacks, #tags',
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: Row(
                  children: [
                    for (final f in _Filter.values)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(_filterLabel(f)),
                          selected: _filter == f,
                          onSelected: (_) => setState(() => _filter = f),
                          selectedColor: AppColors.primary,
                          backgroundColor: AppColors.surfaceAlt,
                          labelStyle: TextStyle(
                              color: _filter == f
                                  ? Colors.white
                                  : AppColors.textPrimary),
                        ),
                      ),
                  ],
                ),
              ),
              if (trending.isNotEmpty && _query.isEmpty) ...[
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: Text('Trending tags',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final e in trending.take(10))
                        Chip(
                          label: Text('${e.key} ${e.value}'),
                          backgroundColor: AppColors.surfaceAlt,
                          labelStyle: const TextStyle(
                              color: AppColors.accent, fontSize: 12),
                          side: BorderSide.none,
                        ),
                    ],
                  ),
                ),
              ],
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Text(
                    _query.isEmpty ? 'Suggested developers' : 'Results',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
              if (results.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(
                      child: Text('No developers found.',
                          style: TextStyle(color: AppColors.textMuted))),
                )
              else
                ...results.map((u) => _UserTile(user: u)),
            ],
          );
        },
      ),
    );
  }

  String _filterLabel(_Filter f) {
    switch (f) {
      case _Filter.all:
        return 'All';
      case _Filter.collab:
        return 'Open to collab';
      case _Filter.cofounder:
        return 'Co-founder';
      case _Filter.beginner:
        return 'Builders';
      case _Filter.trending:
        return 'Trending';
    }
  }
}

class _UserTile extends ConsumerWidget {
  final AppUser user;
  const _UserTile({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(currentUserProvider).value;
    final following = ref.watch(myFollowingProvider).value ?? const {};
    final isFollowing = following.contains(user.uid);

    return ListTile(
      onTap: () => context.push('/profile/${user.username}'),
      leading: Avatar(url: user.avatar, size: 46, online: user.isOnline),
      title: NameWithBadges.fromUser(user),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('@${user.username} · ${user.devLevel}',
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          if (user.techStack.isNotEmpty)
            Text(user.techStack.take(3).join(' · '),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, color: AppColors.accent)),
        ],
      ),
      trailing: me == null || me.uid == user.uid
          ? null
          : OutlinedButton(
              onPressed: () async {
                await ref
                    .read(userRepositoryProvider)
                    .setFollow(me.uid, user.uid, !isFollowing);
                if (!isFollowing) {
                  ref
                      .read(socialRepositoryProvider)
                      .pushNotification(user.uid, {
                    'type': 'follow',
                    'actorUid': me.uid,
                    'actor': me.asAuthor.toMap(),
                    'text': 'started following you',
                  }).catchError((_) {});
                }
              },
              style: OutlinedButton.styleFrom(
                foregroundColor:
                    isFollowing ? AppColors.textMuted : AppColors.primary,
                side: BorderSide(
                    color: isFollowing ? AppColors.border : AppColors.primary),
                padding: const EdgeInsets.symmetric(horizontal: 14),
              ),
              child: Text(isFollowing ? 'Following' : 'Follow'),
            ),
    );
  }
}
