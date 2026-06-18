import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/theme.dart';
import '../../data/post_repository.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../models/post.dart';
import '../../widgets/avatar.dart';
import '../../widgets/post_card.dart';

class PostDetailScreen extends ConsumerStatefulWidget {
  final String postId;
  const PostDetailScreen({super.key, required this.postId});
  @override
  ConsumerState<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends ConsumerState<PostDetailScreen> {
  final _comment = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _send(Post post) async {
    final me = ref.read(currentUserProvider).value;
    final text = _comment.text.trim();
    if (me == null || text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref.read(postRepositoryProvider).addComment(post.postId, {
        'authorUid': me.uid,
        'author': me.asAuthor.toMap(),
        'content': text,
      });
      _comment.clear();
      final social = ref.read(socialRepositoryProvider);
      // Notify post author.
      if (post.authorUid != me.uid) {
        social.pushNotification(post.authorUid, {
          'type': 'comment',
          'actorUid': me.uid,
          'actor': me.asAuthor.toMap(),
          'text': 'commented on your post',
          'postId': post.postId,
        }).catchError((_) {});
      }
      // Notify @mentions.
      final users = ref.read(usersProvider).value ?? const [];
      for (final handle in parseMentions(text)) {
        final hit = users.where((u) => u.username.toLowerCase() == handle);
        if (hit.isNotEmpty && hit.first.uid != me.uid) {
          social.pushNotification(hit.first.uid, {
            'type': 'mention',
            'actorUid': me.uid,
            'actor': me.asAuthor.toMap(),
            'text': 'mentioned you in a comment',
            'postId': post.postId,
          }).catchError((_) {});
        }
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final postAsync = ref.watch(postProvider(widget.postId));
    final commentsAsync = ref.watch(commentsProvider(widget.postId));
    final me = ref.watch(currentUserProvider).value;

    return Scaffold(
      appBar: AppBar(title: const Text('Post')),
      body: postAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (post) {
          if (post == null) {
            return const Center(
                child: Text('This post no longer exists.',
                    style: TextStyle(color: AppColors.textMuted)));
          }
          return Column(
            children: [
              Expanded(
                child: ListView(
                  children: [
                    PostCard(post: post, showOpenButton: false),
                    const Divider(color: AppColors.border),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                      child: Text('Comments',
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 15)),
                    ),
                    commentsAsync.when(
                      loading: () => const Padding(
                          padding: EdgeInsets.all(20),
                          child: Center(child: CircularProgressIndicator())),
                      error: (e, _) => const SizedBox.shrink(),
                      data: (comments) {
                        if (comments.isEmpty) {
                          return const Padding(
                            padding: EdgeInsets.all(24),
                            child: Center(
                                child: Text('No comments yet — start the thread.',
                                    style: TextStyle(color: AppColors.textMuted))),
                          );
                        }
                        return Column(
                          children: [
                            for (final c in comments)
                              _CommentTile(postId: post.postId, comment: c),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
              if (me != null)
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _comment,
                            minLines: 1,
                            maxLines: 4,
                            decoration: const InputDecoration(
                                hintText: 'Add a comment... @mention someone'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: _sending
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.send, color: AppColors.primary),
                          onPressed: _sending ? null : () => _send(post),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _CommentTile extends ConsumerWidget {
  final String postId;
  final dynamic comment;
  const _CommentTile({required this.postId, required this.comment});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(currentUserProvider).value;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => context.push('/profile/${comment.author.username}'),
            child: Avatar(url: comment.author.avatar, size: 34),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(comment.author.displayName,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13)),
                    const SizedBox(width: 6),
                    if (comment.createdAtDate != null)
                      Text(timeago.format(comment.createdAtDate!),
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 11)),
                  ],
                ),
                const SizedBox(height: 2),
                Text(comment.content),
              ],
            ),
          ),
          GestureDetector(
            onTap: me == null
                ? null
                : () => ref.read(postRepositoryProvider).setCommentLike(
                    postId, comment.id, me.uid, true),
            child: Column(
              children: [
                const Icon(Icons.favorite_border,
                    size: 16, color: AppColors.textMuted),
                Text('${comment.likesCount}',
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
