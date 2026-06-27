import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/theme.dart';
import '../../data/message_repository.dart';
import '../../data/user_repository.dart';
import '../../models/app_user.dart';
import '../../models/conversation.dart';
import '../../widgets/avatar.dart';
import '../../widgets/ui.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});
  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  Future<void> _deleteConvo(Conversation convo) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Delete conversation?'),
        content: const Text(
            'This will permanently delete this conversation and all its messages.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirm == true && context.mounted) {
      await ref
          .read(messageRepositoryProvider)
          .deleteConversation(convo.id);
      if (mounted) showToast(context, 'Conversation deleted.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(currentUserProvider).value;
    final convosAsync = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: AppColors.gradientMessages,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.chat_bubble_outline,
                  color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Messages'),
          ],
        ),
      ),
      body: me == null
          ? const SizedBox.shrink()
          : convosAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (convos) {
                if (convos.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(40),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              gradient: AppColors.gradientMessages,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.messagesPrimary
                                      .withValues(alpha: 0.3),
                                  blurRadius: 20,
                                  spreadRadius: 5,
                                ),
                              ],
                            ),
                            child: const Icon(Icons.forum_outlined,
                                color: Colors.white, size: 40),
                          ),
                          const SizedBox(height: 16),
                          const Text('No conversations yet',
                              style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          const Text(
                              'Message a developer from their profile to start chatting.',
                              textAlign: TextAlign.center,
                              style:
                                  TextStyle(color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                  );
                }
                return ListView.builder(
                  itemCount: convos.length,
                  itemBuilder: (_, i) =>
                      _ConvoTile(convo: convos[i], me: me, onDelete: _deleteConvo),
                );
              },
            ),
    );
  }
}

class _ConvoTile extends ConsumerWidget {
  final Conversation convo;
  final AppUser me;
  final void Function(Conversation) onDelete;
  const _ConvoTile(
      {required this.convo, required this.me, required this.onDelete});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final otherUid = convo.otherUid(me.uid);
    final otherAsync =
        ref.watch(userRepositoryProvider).watchProfile(otherUid);

    return StreamBuilder<AppUser?>(
      stream: otherAsync,
      builder: (context, snap) {
        final other = snap.data;
        final unread = convo.readAt(me.uid) == null ||
            (convo.updatedAtDate != null &&
                convo.readAt(me.uid) != null &&
                convo.updatedAtDate!.isAfter(convo.readAt(me.uid)!));

        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: unread
                  ? Border.all(
                      color: AppColors.messagesPrimary
                          .withValues(alpha: 0.3))
                  : null,
            ),
            child: ListTile(
              onTap: () => context.push('/chat/$otherUid'),
              onLongPress: () => onDelete(convo),
              leading: Avatar(
                  url: other?.avatar ?? '',
                  size: 48,
                  online: other?.isOnline ?? false),
              title: Row(
                children: [
                  Flexible(
                    child: Text(other?.displayName ?? '...',
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontWeight: unread
                                ? FontWeight.w700
                                : FontWeight.w600,
                            color: unread
                                ? AppColors.messagesPrimary
                                : AppColors.textPrimary)),
                  ),
                  if (convo.isCollab) ...[
                    const SizedBox(width: 6),
                    const Icon(Icons.handshake,
                        size: 14, color: AppColors.success),
                  ],
                ],
              ),
              subtitle: Text(
                '${convo.lastFrom == me.uid ? 'You: ' : ''}${convo.last}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.textMuted),
              ),
              trailing: convo.updatedAtDate == null
                  ? null
                  : Text(
                      timeago.format(convo.updatedAtDate!,
                          locale: 'en_short'),
                      style: const TextStyle(
                          fontSize: 11, color: AppColors.textMuted)),
            ),
          ),
        );
      },
    );
  }
}
