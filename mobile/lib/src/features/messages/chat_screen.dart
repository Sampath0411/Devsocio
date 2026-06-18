import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

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
  Timer? _typingTimer;
  bool _ensured = false;

  // Auth uid is available immediately (unlike the Firestore profile stream),
  // so the conversation id is always correct.
  String get _myUid => ref.read(firebaseAuthProvider).currentUser?.uid ?? '';
  String get _cid => convoId(_myUid, widget.otherUid);

  @override
  void initState() {
    super.initState();
    // Create the conversation doc so reads succeed under the rules, then mark
    // it read by me.
    WidgetsBinding.instance.addPostFrameCallback((_) => _ensure());
  }

  Future<void> _ensure() async {
    if (_ensured || _myUid.isEmpty) return;
    _ensured = true;
    final repo = ref.read(messageRepositoryProvider);
    await repo.ensureConversation(_myUid, widget.otherUid);
    await repo.markRead(_cid, _myUid);
  }

  @override
  void dispose() {
    _input.dispose();
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
    // Mark read whenever the thread changes while this screen is open.
    ref.listen(threadProvider(_cid), (_, __) {
      if (_myUid.isNotEmpty) {
        ref.read(messageRepositoryProvider).markRead(_cid, _myUid);
      }
    });

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
                    size: 36,
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
                        Text(
                            (other?.isOnline ?? false) ? 'Active now' : 'Offline',
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
              Expanded(
                  child: _MessageList(
                      cid: _cid, myUid: _myUid, otherUid: widget.otherUid)),
              _TypingIndicator(cid: _cid, otherUid: widget.otherUid),
              _CollabBanner(cid: _cid, myUid: _myUid),
              _Composer(controller: _input, onChanged: _onChanged, onSend: _send),
            ],
          ),
        );
      },
    );
  }
}

class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onSend;
  const _Composer(
      {required this.controller, required this.onChanged, required this.onSend});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                onChanged: onChanged,
                minLines: 1,
                maxLines: 5,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: 'Message...',
                  filled: true,
                  fillColor: AppColors.surfaceAlt,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                ),
                onSubmitted: (_) => onSend(),
              ),
            ),
            const SizedBox(width: 6),
            Material(
              color: AppColors.primary,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onSend,
                child: const Padding(
                  padding: EdgeInsets.all(10),
                  child: Icon(Icons.send, color: Colors.white, size: 22),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageList extends ConsumerWidget {
  final String cid;
  final String myUid;
  final String otherUid;
  const _MessageList(
      {required this.cid, required this.myUid, required this.otherUid});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final thread = ref.watch(threadProvider(cid));
    final convo = ref.watch(conversationProvider(cid)).value;
    final messages = thread.value ?? const [];

    if (messages.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 120),
          Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text('Say hi 👋',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 16)),
            ),
          ),
        ],
      );
    }

    // Index of the last message I sent (for the "Seen" receipt placement).
    int lastMineIdx = -1;
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].from == myUid) lastMineIdx = i;
    }
    final otherReadAt = convo?.readAt(otherUid);
    final lastMine = lastMineIdx >= 0 ? messages[lastMineIdx] : null;
    final seen = lastMine != null &&
        otherReadAt != null &&
        lastMine.createdAtDate != null &&
        !otherReadAt.isBefore(lastMine.createdAtDate!);

    return ListView.builder(
      reverse: true,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
      itemCount: messages.length,
      itemBuilder: (_, i) {
        final idx = messages.length - 1 - i;
        final m = messages[idx];
        final mine = m.from == myUid;
        final showSeen = mine && idx == lastMineIdx && seen;
        return Column(
          crossAxisAlignment:
              mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Container(
              constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.74),
              margin: const EdgeInsets.symmetric(vertical: 2),
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: mine ? AppColors.primary : AppColors.surfaceAlt,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(mine ? 18 : 4),
                  bottomRight: Radius.circular(mine ? 4 : 18),
                ),
              ),
              child: Text(m.text,
                  style: TextStyle(
                      color: mine ? Colors.white : AppColors.textPrimary,
                      height: 1.3)),
            ),
            if (showSeen)
              Padding(
                padding: const EdgeInsets.only(right: 4, top: 2, bottom: 4),
                child: Text(
                  m.createdAtDate == null
                      ? 'Seen'
                      : 'Seen ${timeago.format(m.createdAtDate!)}',
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textMuted),
                ),
              ),
          ],
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
    return Container(
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.only(left: 18, bottom: 6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(18),
        ),
        child: const Text('typing…',
            style: TextStyle(
                color: AppColors.textMuted,
                fontStyle: FontStyle.italic,
                fontSize: 13)),
      ),
    );
  }
}

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
