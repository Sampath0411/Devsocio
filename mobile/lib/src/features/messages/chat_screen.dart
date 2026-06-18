import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/firebase_providers.dart';
import '../../data/message_repository.dart';
import '../../data/user_repository.dart';
import '../../models/app_user.dart';
import '../../widgets/avatar.dart';
import '../../widgets/ui.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String otherUid;
  const ChatScreen({super.key, required this.otherUid});
  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  Timer? _typingTimer;

  // Use the Firebase Auth uid (available immediately after login) as identity —
  // the Firestore profile stream may not have emitted yet, which would produce
  // a wrong conversation id and get message writes rejected by the rules.
  String get _myUid => ref.read(firebaseAuthProvider).currentUser?.uid ?? '';
  String get _cid => convoId(_myUid, widget.otherUid);

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    _typingTimer?.cancel();
    if (_myUid.isNotEmpty) {
      ref.read(messageRepositoryProvider).setTyping(_cid, _myUid, false);
    }
    super.dispose();
  }

  void _onChanged(String _) {
    if (_myUid.isEmpty) return;
    final cid = _cid;
    ref.read(messageRepositoryProvider).setTyping(cid, _myUid, true);
    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(seconds: 3),
        () => ref.read(messageRepositoryProvider).setTyping(cid, _myUid, false));
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    if (_myUid.isEmpty) {
      showToast(context, 'Still signing in — try again in a moment.',
          error: true);
      return;
    }
    _input.clear();
    try {
      await ref
          .read(messageRepositoryProvider)
          .sendMessage(_myUid, widget.otherUid, text);
      ref.read(messageRepositoryProvider).setTyping(_cid, _myUid, false);
    } catch (e) {
      if (mounted) {
        _input.text = text;
        showToast(context, 'Could not send: $e', error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final otherStream =
        ref.watch(userRepositoryProvider).watchProfile(widget.otherUid);

    return StreamBuilder<AppUser?>(
      stream: otherStream,
      builder: (context, snap) {
        final other = snap.data;
        return Scaffold(
          appBar: AppBar(
            titleSpacing: 0,
            title: Row(
              children: [
                Avatar(
                    url: other?.avatar ?? '',
                    size: 34,
                    online: other?.isOnline ?? false),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: other == null
                        ? null
                        : () => context.push('/profile/${other.username}'),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(other?.displayName ?? '...',
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                        Text(other?.isOnline ?? false ? 'Online' : 'Offline',
                            style: TextStyle(
                                fontSize: 11,
                                color: (other?.isOnline ?? false)
                                    ? AppColors.success
                                    : AppColors.textMuted)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          body: Column(
            children: [
              Expanded(child: _MessageList(cid: _cid, myUid: _myUid)),
              _TypingIndicator(cid: _cid, otherUid: widget.otherUid),
              _CollabBanner(cid: _cid, myUid: _myUid),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _input,
                          onChanged: _onChanged,
                          minLines: 1,
                          maxLines: 4,
                          decoration:
                              const InputDecoration(hintText: 'Message...'),
                          onSubmitted: (_) => _send(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      CircleAvatar(
                        backgroundColor: AppColors.primary,
                        child: IconButton(
                          icon: const Icon(Icons.send, color: Colors.white),
                          onPressed: _send,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _MessageList extends ConsumerWidget {
  final String cid;
  final String myUid;
  const _MessageList({required this.cid, required this.myUid});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final thread = ref.watch(threadProvider(cid));
    return thread.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (messages) {
        if (messages.isEmpty) {
          return const Center(
              child: Text('Say hi 👋',
                  style: TextStyle(color: AppColors.textMuted)));
        }
        return ListView.builder(
          reverse: true,
          padding: const EdgeInsets.all(12),
          itemCount: messages.length,
          itemBuilder: (_, i) {
            final m = messages[messages.length - 1 - i];
            final mine = m.from == myUid;
            return Align(
              alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.72),
                margin: const EdgeInsets.symmetric(vertical: 3),
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: mine ? AppColors.primary : AppColors.surfaceAlt,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(m.text,
                    style: TextStyle(
                        color:
                            mine ? Colors.white : AppColors.textPrimary)),
              ),
            );
          },
        );
      },
    );
  }
}

class _TypingIndicator extends ConsumerWidget {
  final String cid;
  final String otherUid;
  const _TypingIndicator({required this.cid, required this.otherUid});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final convo = ref.watch(conversationProvider(cid)).value;
    if (convo == null || !convo.isTyping(otherUid)) {
      return const SizedBox.shrink();
    }
    return const Padding(
      padding: EdgeInsets.only(left: 16, bottom: 4),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text('typing…',
            style: TextStyle(
                color: AppColors.textMuted,
                fontStyle: FontStyle.italic,
                fontSize: 12)),
      ),
    );
  }
}

/// Shows an Accept button on a pending collab conversation.
class _CollabBanner extends ConsumerWidget {
  final String cid;
  final String myUid;
  const _CollabBanner({required this.cid, required this.myUid});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final convo = ref.watch(conversationProvider(cid)).value;
    if (convo == null || !convo.isCollab || convo.collabAccepted) {
      return const SizedBox.shrink();
    }
    // Only the recipient (not the initiator) accepts.
    final iAmInitiator = convo.lastFrom == myUid;
    if (iAmInitiator) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        color: AppColors.surfaceAlt,
        child: const Text('Collab request sent — awaiting response.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
      );
    }
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      color: AppColors.success.withValues(alpha: 0.15),
      child: Row(
        children: [
          const Icon(Icons.handshake, color: AppColors.success, size: 18),
          const SizedBox(width: 8),
          const Expanded(child: Text('Collab request')),
          ElevatedButton(
            onPressed: () =>
                ref.read(messageRepositoryProvider).acceptCollab(cid),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                padding: const EdgeInsets.symmetric(horizontal: 16)),
            child: const Text('Accept'),
          ),
        ],
      ),
    );
  }
}
