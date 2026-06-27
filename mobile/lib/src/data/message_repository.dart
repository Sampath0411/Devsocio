import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/app_user.dart';
import '../models/conversation.dart';
import 'firebase_providers.dart';
import 'social_repository.dart';

String convoId(String a, String b) => ([a, b]..sort()).join('__');

class MessageRepository {
  final FirebaseFirestore _db;
  final SocialRepository _social;
  MessageRepository(this._db, this._social);

  CollectionReference<Map<String, dynamic>> get _convos =>
      _db.collection('conversations');

  Stream<List<Conversation>> watchConversations(String uid) => _convos
      .where('members', arrayContains: uid)
      .snapshots()
      .map((s) {
        final list = s.docs
            .map((d) => Conversation.fromMap(d.id, d.data()))
            .where((c) => c.last.isNotEmpty)
            .toList();
        list.sort((a, b) => (b.updatedAtDate ?? DateTime(0))
            .compareTo(a.updatedAtDate ?? DateTime(0)));
        return list;
      })
      .handleError((_) {});

  Stream<Conversation?> watchConversation(String cid) {
    return _convos
        .doc(cid)
        .snapshots()
        .map((d) => d.exists ? Conversation.fromMap(d.id, d.data()!) : null)
      .handleError((_) {});
}

  Stream<List<Message>> watchThread(String cid) async* {
    yield <Message>[];
    yield* _convos
        .doc(cid)
        .collection('messages')
        .orderBy('createdAt')
        .limit(100)
        .snapshots()
        .map((s) => s.docs.map((d) => Message.fromMap(d.id, d.data())).toList())
        .handleError((_) {});
  }

  Future<void> ensureConversation(String meUid, String otherUid) async {
    final cid = convoId(meUid, otherUid);
    await _convos.doc(cid).set({
      'members': [meUid, otherUid],
    }, SetOptions(merge: true)).catchError((_) {});
  }

  Future<void> markRead(String meUid, String otherUid) {
    final cid = convoId(meUid, otherUid);
    return _convos.doc(cid).set({
      'members': [meUid, otherUid],
      'read': {meUid: FieldValue.serverTimestamp()},
    }, SetOptions(merge: true)).catchError((_) {});
  }

  Future<void> setTyping(String meUid, String otherUid, bool isTyping) {
    final cid = convoId(meUid, otherUid);
    return _convos.doc(cid).set({
      'members': [meUid, otherUid],
      'typing': {
        meUid: isTyping ? DateTime.now().millisecondsSinceEpoch : 0
      },
    }, SetOptions(merge: true)).catchError((_) {});
  }

  /// Send a message with optional replyTo metadata.
  Future<String> sendMessage(
    String meUid, String otherUid, String text, {
    Map<String, dynamic> meta = const {},
    Map<String, dynamic>? replyTo,
  }) async {
    final cid = convoId(meUid, otherUid);
    await _convos.doc(cid).set({
      'members': [meUid, otherUid],
      'last': text,
      'lastFrom': meUid,
      'updatedAt': FieldValue.serverTimestamp(),
      ...meta,
    }, SetOptions(merge: true));
    final msgData = <String, dynamic>{
      'from': meUid,
      'text': text,
      'deleted': false,
      'reactions': {},
      'createdAt': FieldValue.serverTimestamp(),
    };
    if (replyTo != null) {
      msgData['replyTo'] = replyTo;
    }
    await _convos.doc(cid).collection('messages').add(msgData);
    return cid;
  }

  /// React to a message with an emoji.
  Future<void> reactToMessage(
      String cid, String messageId, String uid, String emoji) async {
    final msgRef =
        _convos.doc(cid).collection('messages').doc(messageId);
    // Toggle: if same emoji already set, remove it
    final snap = await msgRef.get();
    final reactions =
        Map<String, dynamic>.from((snap.data()?['reactions'] ?? {}) as Map);
    if (reactions[uid] == emoji) {
      reactions.remove(uid);
    } else {
      reactions[uid] = emoji;
    }
    await msgRef.update({'reactions': reactions}).catchError((_) {});
  }

  /// Unsend a message (mark as deleted).
  Future<void> unsendMessage(String cid, String messageId) async {
    await _convos
        .doc(cid)
        .collection('messages')
        .doc(messageId)
        .update({'deleted': true, 'text': ''}).catchError((_) {});
  }

  /// Delete the entire conversation for the current user.
  Future<void> deleteConversation(String cid) async {
    // Delete all messages in the conversation
    final msgs = await _convos.doc(cid).collection('messages').get();
    final batch = _db.batch();
    for (final d in msgs.docs) {
      batch.delete(d.reference);
    }
    batch.delete(_convos.doc(cid));
    await batch.commit().catchError((_) {});
  }

  /// Forward a message to another user.
  Future<String> forwardMessage(
      AppUser me, String targetUid, String text) async {
    final cid = convoId(me.uid, targetUid);
    final forwardedText = '➡️ $text';
    await _convos.doc(cid).set({
      'members': [me.uid, targetUid],
      'last': forwardedText,
      'lastFrom': me.uid,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
    await _convos.doc(cid).collection('messages').add({
      'from': me.uid,
      'text': forwardedText,
      'deleted': false,
      'reactions': {},
      'createdAt': FieldValue.serverTimestamp(),
    });
    return cid;
  }

  /// Structured collab request.
  Future<String?> requestCollab(AppUser me, AppUser target,
      {String context = ''}) async {
    if (me.uid == target.uid) return null;
    final text = context.isNotEmpty
        ? 'wants to collab on "$context"'
        : 'wants to collab with you';
    final cid =
        await sendMessage(me.uid, target.uid, text, meta: {'isCollab': true});
    await _social.pushNotification(target.uid, {
      'type': 'collab',
      'actorUid': me.uid,
      'actor': me.asAuthor.toMap(),
      'text': 'sent you a collab request',
      'convoId': cid,
    }).catchError((_) {});
    return cid;
  }

  Future<void> acceptCollab(String cid) =>
      _convos.doc(cid).update({'collabAccepted': true}).catchError((_) {});
}

final messageRepositoryProvider = Provider<MessageRepository>((ref) =>
    MessageRepository(
        ref.watch(firestoreProvider), ref.watch(socialRepositoryProvider)));

final conversationsProvider = StreamProvider<List<Conversation>>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return Stream.value(const []);
  return ref.watch(messageRepositoryProvider).watchConversations(auth.uid);
});

final conversationProvider =
    StreamProvider.family<Conversation?, String>((ref, cid) =>
        ref.watch(messageRepositoryProvider).watchConversation(cid));

final threadProvider = StreamProvider.family<List<Message>, String>(
    (ref, cid) => ref.watch(messageRepositoryProvider).watchThread(cid));
