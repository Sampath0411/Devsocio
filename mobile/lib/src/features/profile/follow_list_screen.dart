import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../models/app_user.dart';
import '../../widgets/avatar.dart';
import '../../widgets/badges.dart';

/// Loads the followers or following users for a given uid.
final _followListProvider =
    FutureProvider.family<List<AppUser>, ({String uid, bool followers})>(
        (ref, args) async {
  final repo = ref.watch(userRepositoryProvider);
  final uids = args.followers
      ? await repo.followerUids(args.uid)
      : await repo.followingUids(args.uid);
  return repo.usersByUids(uids);
});

class FollowListScreen extends ConsumerWidget {
  final String uid;
  final bool followers;
  const FollowListScreen({super.key, required this.uid, required this.followers});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listAsync =
        ref.watch(_followListProvider((uid: uid, followers: followers)));
    return Scaffold(
      appBar: AppBar(title: Text(followers ? 'Followers' : 'Following')),
      body: listAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (users) {
          if (users.isEmpty) {
            return Center(
              child: Text(followers ? 'No followers yet.' : 'Not following anyone yet.',
                  style: const TextStyle(color: AppColors.textMuted)),
            );
          }
          return ListView.builder(
            itemCount: users.length,
            itemBuilder: (_, i) => _Tile(user: users[i]),
          );
        },
      ),
    );
  }
}

class _Tile extends ConsumerWidget {
  final AppUser user;
  const _Tile({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(currentUserProvider).value;
    final following = ref.watch(myFollowingProvider).value ?? const {};
    final isFollowing = following.contains(user.uid);
    final isMe = me?.uid == user.uid;

    return ListTile(
      onTap: () => context.push('/profile/${user.username}'),
      leading: Avatar(url: user.avatar, size: 44, online: user.isOnline),
      title: NameWithBadges.fromUser(user),
      subtitle: Text('@${user.username}',
          style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
      trailing: (me == null || isMe)
          ? null
          : OutlinedButton(
              onPressed: () async {
                await ref
                    .read(userRepositoryProvider)
                    .setFollow(me.uid, user.uid, !isFollowing);
                if (!isFollowing) {
                  ref.read(socialRepositoryProvider).pushNotification(user.uid, {
                    'type': 'follow',
                    'actorUid': me.uid,
                    'actor': me.asAuthor.toMap(),
                    'text': 'started following you',
                  }).catchError((_) {});
                }
              },
              child: Text(isFollowing ? 'Following' : 'Follow'),
            ),
    );
  }
}
