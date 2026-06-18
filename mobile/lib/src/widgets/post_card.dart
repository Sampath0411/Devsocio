import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../core/constants.dart';
import '../core/theme.dart';
import '../data/ai_client.dart';
import '../data/post_repository.dart';
import '../data/social_repository.dart';
import '../data/user_repository.dart';
import '../models/post.dart';
import '../models/app_user.dart';
import 'avatar.dart';
import 'ui.dart';

class PostCard extends ConsumerStatefulWidget {
  final Post post;
  final bool showOpenButton;
  const PostCard({super.key, required this.post, this.showOpenButton = true});

  @override
  ConsumerState<PostCard> createState() => _PostCardState();
}

class _PostCardState extends ConsumerState<PostCard> {
  String? _aiResult;
  bool _aiLoading = false;

  Post get post => widget.post;

  Future<void> _toggleLike(AppUser me, bool currentlyLiked) async {
    final repo = ref.read(postRepositoryProvider);
    await repo.setLike(post.postId, me.uid, !currentlyLiked);
    if (!currentlyLiked && post.authorUid != me.uid) {
      ref.read(socialRepositoryProvider).pushNotification(post.authorUid, {
        'type': 'like',
        'actorUid': me.uid,
        'actor': me.asAuthor.toMap(),
        'text': 'liked your post',
        'postId': post.postId,
      }).catchError((_) {});
    }
  }

  Future<void> _analyze() async {
    setState(() => _aiLoading = true);
    try {
      final result =
          await ref.read(aiClientProvider).analyzePost(post.type, post.content);
      if (mounted) setState(() => _aiResult = result);
    } catch (_) {
      if (mounted) {
        showToast(context, 'AI is unavailable right now.', error: true);
      }
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  Future<void> _report(AppUser me) async {
    await ref.read(socialRepositoryProvider).reportContent({
      'reporterUid': me.uid,
      'type': 'post',
      'targetId': post.postId,
      'targetAuthorUid': post.authorUid,
      'reason': 'reported',
      'description': '',
    });
    if (mounted) showToast(context, 'Report submitted. Thanks.');
  }

  Future<void> _delete() async {
    await ref.read(postRepositoryProvider).deletePost(post.postId);
    if (mounted) showToast(context, 'Post deleted.');
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(currentUserProvider).value;
    final likes = ref.watch(myLikesProvider).value ?? const {};
    final saves = ref.watch(mySavesProvider).value ?? const {};
    final following = ref.watch(myFollowingProvider).value ?? const {};

    final liked = likes.contains(post.postId);
    final saved = saves.contains(post.postId);
    final isFollowing = following.contains(post.authorUid);
    final isMine = me?.uid == post.authorUid;
    final canModerate = isMine || (me?.isAdmin ?? false);
    final pt = postTypeFor(post.type);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: avatar, name, type, menu
            Row(
              children: [
                GestureDetector(
                  onTap: () => context.push('/profile/${post.author.username}'),
                  child: Avatar(url: post.author.avatar, size: 42),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(post.author.displayName,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 14)),
                      Row(
                        children: [
                          Text('@${post.author.username}',
                              style: const TextStyle(
                                  color: AppColors.textMuted, fontSize: 12)),
                          if (post.createdAtDate != null) ...[
                            const Text(' · ',
                                style: TextStyle(color: AppColors.textMuted)),
                            Text(timeago.format(post.createdAtDate!),
                                style: const TextStyle(
                                    color: AppColors.textMuted, fontSize: 12)),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                if (me != null && !isMine && !isFollowing)
                  TextButton(
                    onPressed: () async {
                      await ref
                          .read(userRepositoryProvider)
                          .setFollow(me.uid, post.authorUid, true);
                      ref
                          .read(socialRepositoryProvider)
                          .pushNotification(post.authorUid, {
                        'type': 'follow',
                        'actorUid': me.uid,
                        'actor': me.asAuthor.toMap(),
                        'text': 'started following you',
                      }).catchError((_) {});
                    },
                    child: const Text('Follow'),
                  ),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_horiz, color: AppColors.textMuted),
                  color: AppColors.surfaceAlt,
                  onSelected: (v) {
                    if (v == 'report' && me != null) _report(me);
                    if (v == 'delete') _delete();
                    if (v == 'copy') {
                      Clipboard.setData(
                          ClipboardData(text: post.content));
                      showToast(context, 'Copied to clipboard.');
                    }
                  },
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: 'copy', child: Text('Copy text')),
                    if (me != null && !isMine)
                      const PopupMenuItem(
                          value: 'report', child: Text('Report')),
                    if (canModerate)
                      const PopupMenuItem(
                          value: 'delete',
                          child: Text('Delete',
                              style: TextStyle(color: AppColors.danger))),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Type pill
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: pt.tint.withValues(alpha: 0.13),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(pt.icon, size: 14, color: pt.tint),
                  const SizedBox(width: 6),
                  Text(post.type,
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: pt.tint)),
                ],
              ),
            ),
            const SizedBox(height: 10),
            // Content
            if (post.content.isNotEmpty)
              post.type == 'Code Snippet'
                  ? Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0D0D14),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(post.content, style: AppTheme.mono),
                    )
                  : Text(post.content,
                      style: const TextStyle(fontSize: 15, height: 1.4)),
            // Quoted repost
            if (post.repostOf != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('@${post.repostOf!.author?.username ?? 'unknown'}',
                        style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textMuted)),
                    const SizedBox(height: 4),
                    Text(post.repostOf!.content,
                        maxLines: 4, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            ],
            // Image
            if (post.imageUrl != null && post.imageUrl!.isNotEmpty) ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: CachedNetworkImage(
                  imageUrl: post.imageUrl!,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  placeholder: (_, __) => Container(
                      height: 180, color: AppColors.surfaceAlt),
                  errorWidget: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ],
            // Hashtags
            if (post.hashtags.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                children: [
                  for (final h in post.hashtags)
                    Text(h,
                        style: const TextStyle(
                            color: AppColors.accent, fontSize: 13)),
                ],
              ),
            ],
            // AI result
            if (_aiResult != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.auto_awesome,
                        size: 16, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Expanded(
                        child: Text(_aiResult!,
                            style: const TextStyle(fontSize: 13))),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 6),
            // Actions
            Row(
              children: [
                _ActionButton(
                  icon: liked ? Icons.favorite : Icons.favorite_border,
                  color: liked ? AppColors.danger : AppColors.textMuted,
                  label: '${post.likes}',
                  onTap: me == null ? null : () => _toggleLike(me, liked),
                ),
                _ActionButton(
                  icon: Icons.mode_comment_outlined,
                  label: '${post.commentsCount}',
                  onTap: () => context.push('/post/${post.postId}'),
                ),
                _ActionButton(
                  icon: _aiLoading
                      ? Icons.hourglass_empty
                      : Icons.auto_awesome_outlined,
                  label: 'AI',
                  color: AppColors.primary,
                  onTap: _aiLoading ? null : _analyze,
                ),
                const Spacer(),
                _ActionButton(
                  icon: saved ? Icons.bookmark : Icons.bookmark_border,
                  color: saved ? AppColors.warning : AppColors.textMuted,
                  onTap: me == null
                      ? null
                      : () => ref
                          .read(userRepositoryProvider)
                          .setSave(me.uid, post.postId, !saved),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String? label;
  final Color color;
  final VoidCallback? onTap;
  const _ActionButton({
    required this.icon,
    this.label,
    this.color = AppColors.textMuted,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          children: [
            Icon(icon, size: 20, color: color),
            if (label != null) ...[
              const SizedBox(width: 5),
              Text(label!,
                  style: TextStyle(color: color, fontSize: 13)),
            ],
          ],
        ),
      ),
    );
  }
}
