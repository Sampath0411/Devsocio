import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../core/constants.dart';
import '../core/theme.dart';
import '../data/ai_client.dart';
import '../data/post_repository.dart';
import '../data/social_repository.dart';
import '../data/user_repository.dart';
import '../models/post.dart';
import '../models/app_user.dart';
import 'app_image.dart';
import 'avatar.dart';
import 'link_preview_card.dart';
import 'photo_viewer.dart';
import 'ui.dart';

class PostCard extends ConsumerStatefulWidget {
  final Post post;
  final bool showOpenButton;
  const PostCard({super.key, required this.post, this.showOpenButton = true});

  @override
  ConsumerState<PostCard> createState() => _PostCardState();
}

class _PostCardState extends ConsumerState<PostCard>
    with SingleTickerProviderStateMixin {
  String? _aiResult;
  bool _aiLoading = false;

  // Like animation
  late AnimationController _likeController;
  late Animation<double> _likeScale;
  late Animation<double> _likeRotation;

  Post get post => widget.post;

  @override
  void initState() {
    super.initState();
    _likeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _likeScale = Tween<double>(begin: 1.0, end: 1.4).animate(
      CurvedAnimation(parent: _likeController, curve: Curves.easeInOut),
    );
    _likeRotation = Tween<double>(begin: 0, end: 0.15).animate(
      CurvedAnimation(parent: _likeController, curve: Curves.elasticOut),
    );
  }

  @override
  void dispose() {
    _likeController.dispose();
    super.dispose();
  }

  void _share(BuildContext context) {
    final shareText = '${post.type}: ${post.content.length > 200 ? '${post.content.substring(0, 200)}…' : post.content}\n\nShared from DevSocio';
    final link = 'https://devsocio.app/post/${post.postId}';
    SharePlus.instance.share(
      ShareParams(text: '$shareText\n$link'),
    );
  }

  Future<void> _toggleLike(AppUser me, bool currentlyLiked) async {
    final repo = ref.read(postRepositoryProvider);

    // Animate
    _likeController.forward().then((_) => _likeController.reverse());

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
      if (mounted) showToast(context, 'AI is unavailable right now.', error: true);
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
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.surfaceCard,
              AppColors.surface,
            ],
          ),
        ),
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
                        ref.read(socialRepositoryProvider)
                            .pushNotification(post.authorUid, {
                          'type': 'follow',
                          'actorUid': me.uid,
                          'actor': me.asAuthor.toMap(),
                          'text': 'started following you',
                        }).catchError((_) {});
                      },
                      child: const Text('Follow'),
                    ),                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_horiz, color: AppColors.textMuted),
                    color: AppColors.surfaceAlt,
                    onSelected: (v) {
                      if (v == 'report' && me != null) _report(me);
                      if (v == 'delete') _delete();
                      if (v == 'copy') {
                        Clipboard.setData(ClipboardData(text: post.content));
                        showToast(context, 'Copied to clipboard.');
                      }
                      if (v == 'share') _share(context);
                    },
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: 'share', child: ListTile(
                        leading: Icon(Icons.share, size: 20),
                        title: Text('Share'),
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                      )),
                      const PopupMenuItem(value: 'copy', child: ListTile(
                        leading: Icon(Icons.copy, size: 20),
                        title: Text('Copy text'),
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                      )),
                      if (me != null && !isMine)
                        const PopupMenuItem(value: 'report', child: ListTile(
                          leading: Icon(Icons.flag_outlined, size: 20),
                          title: Text('Report'),
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                        )),
                      if (canModerate)
                        const PopupMenuItem(
                            value: 'delete',
                            child: ListTile(
                              leading: Icon(Icons.delete_outline, size: 20, color: AppColors.danger),
                              title: Text('Delete', style: TextStyle(color: AppColors.danger)),
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                            )),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),
              // Type pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      pt.tint.withValues(alpha: 0.2),
                      pt.tint.withValues(alpha: 0.05),
                    ],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: pt.tint.withValues(alpha: 0.3),
                  ),
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
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    post.type == 'Code Snippet'
                        ? Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  const Color(0xFF0D0D14),
                                  const Color(0xFF0A0A12),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: AppColors.border.withValues(alpha: 0.6),
                              ),
                            ),
                            child: Text(post.content, style: AppTheme.mono),
                          )
                        : Text(post.content,
                            style: const TextStyle(fontSize: 15, height: 1.4)),
                    // Link preview for URLs in content
                    LinkPreviewCard(text: post.content),
                  ],
                )
              else
                LinkPreviewCard(text: post.content),
              // Quoted repost
              if (post.repostOf != null) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
                    color: AppColors.surfaceAlt.withValues(alpha: 0.3),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.repeat, size: 12, color: AppColors.textMuted),
                          const SizedBox(width: 4),
                          Text('@${post.repostOf!.author?.username ?? 'unknown'}',
                              style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textMuted)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(post.repostOf!.content,
                          maxLines: 4, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              ],
              // Image (tap to view full-screen)
              if (post.imageUrl != null && post.imageUrl!.isNotEmpty) ...[
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: () => openPhoto(context, post.imageUrl!),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SmartImage(
                      url: post.imageUrl,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: 200,
                      backgroundColor: AppColors.surfaceAlt,
                    ),
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
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primary.withValues(alpha: 0.1),
                        AppColors.accent.withValues(alpha: 0.05),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.auto_awesome,
                          size: 16, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_aiResult!,
                          style: const TextStyle(fontSize: 13))),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 6),
              // Actions row
              Row(
                children: [
                  // Like button with animation
                  AnimatedBuilder(
                    animation: _likeController,
                    builder: (_, child) => Transform(
                      alignment: Alignment.center,
                      transform: Matrix4.diagonal3Values(
                          _likeScale.value, _likeScale.value, 1.0)
                        ..rotateZ(_likeRotation.value),
                      child: child,
                    ),
                    child: _ActionButton(
                      icon: liked ? Icons.favorite : Icons.favorite_border,
                      color: liked ? AppColors.danger : AppColors.textMuted,
                      label: '${post.likes}',
                      onTap: me == null ? null : () => _toggleLike(me, liked),
                    ),
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
                  // Save/Bookmark
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      color: saved
                          ? AppColors.warning.withValues(alpha: 0.1)
                          : Colors.transparent,
                    ),
                    child: _ActionButton(
                      icon: saved ? Icons.bookmark : Icons.bookmark_border,
                      color: saved ? AppColors.warning : AppColors.textMuted,
                      onTap: me == null
                          ? null
                          : () => ref
                              .read(userRepositoryProvider)
                              .setSave(me.uid, post.postId, !saved),
                    ),
                  ),
                ],
              ),
            ],
          ),
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
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        splashColor: color.withValues(alpha: 0.15),
        highlightColor: color.withValues(alpha: 0.08),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            children: [
              Icon(icon, size: 20, color: color),
              if (label != null) ...[
                const SizedBox(width: 5),
                Text(label!, style: TextStyle(color: color, fontSize: 13)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
