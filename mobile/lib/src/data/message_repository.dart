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
        final list =
            s.docs.map((d) => Conversation.fromMap(d.id, d.data())).toList();
        list.sort((a, b) => (b.updatedAtDate ?? DateTime(0))
            .compareTo(a.updatedAtDate ?? DateTime(0)));
        return list;
      });

  Stream<Conversation?> watchConversation(String cid) => _convos
      .doc(cid)
      .snapshots()
      .map((d) => d.exists ? Conversation.fromMap(d.id, d.data()!) : null);

  Stream<List<Message>> watchThread(String cid) => _convos
      .doc(cid)
      .collection('messages')
      .orderBy('createdAt')
      .limit(100)
      .snapshots()
      .map((s) => s.docs.map((d) => Message.fromMap(d.id, d.data())).toList());

  Future<void> setTyping(String cid, String uid, bool isTyping) => _convos
      .doc(cid)
      .update({'typing.$uid': isTyping ? DateTime.now().millisecondsSinceEpoch : 0})
      .catchError((_) {});

  Future<String> sendMessage(String meUid, String otherUid, String text,
      {Map<String, dynamic> meta = const {}}) async {
    final cid = convoId(meUid, otherUid);
    await _convos.doc(cid).set({
      'members': [meUid, otherUid],
      'last': text,
      'lastFrom': meUid,
      'updatedAt': FieldValue.serverTimestamp(),
      ...meta,
    }, SetOptions(merge: true));
    await _convos.doc(cid).collection('messages').add({
      'from': meUid,
      'text': text,
      'createdAt': FieldValue.serverTimestamp(),
    });
    return cid;
  }

  /// Structured collab request — opens a collab convo + notifies the target.
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
