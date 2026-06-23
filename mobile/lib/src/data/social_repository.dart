import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/app_notification.dart';
import '../models/idea.dart';
import '../models/story.dart';
import 'firebase_providers.dart';

const _dayMs = 24 * 60 * 60 * 1000;

class SocialRepository {
  final FirebaseFirestore _db;
  SocialRepository(this._db);

  // ---------------- Notifications ----------------
  Stream<List<AppNotification>> watchNotifications(String uid) => _db
      .collection('users')
      .doc(uid)
      .collection('notifications')
      .orderBy('createdAt', descending: true)
      .limit(50)
      .snapshots()
      .map((s) =>
          s.docs.map((d) => AppNotification.fromMap(d.id, d.data())).toList());

  Stream<int> watchUnreadCount(String uid) => _db
      .collection('users')
      .doc(uid)
      .collection('notifications')
      .where('read', isEqualTo: false)
      .snapshots()
      .map((s) => s.size);

  Future<void> pushNotification(
      String targetUid, Map<String, dynamic> notif) async {
    if (targetUid.isEmpty) return;
    await _db
        .collection('users')
        .doc(targetUid)
        .collection('notifications')
        .add({
      'read': false,
      ...notif,
      'createdAt': FieldValue.serverTimestamp(),
    }).then((_) {}).catchError((_) {});
  }

  Future<void> markAllRead(String uid, List<AppNotification> items) async {
    final unread = items.where((n) => !n.read).toList();
    if (unread.isEmpty) return;
    final batch = _db.batch();
    for (final n in unread) {
      batch.update(
          _db
              .collection('users')
              .doc(uid)
              .collection('notifications')
              .doc(n.id),
          {'read': true});
    }
    await batch.commit().catchError((_) {});
  }

  // ---------------- Ideas ----------------
  Stream<List<Idea>> watchIdeas() => _db
      .collection('ideas')
      .orderBy('createdAt', descending: true)
      .limit(50)
      .snapshots()
      .map((s) => s.docs.map((d) => Idea.fromMap(d.id, d.data())).toList());

  Future<String> createIdea(Map<String, dynamic> idea) async {
    final ref = await _db.collection('ideas').add({
      'invested': 0,
      'comments': 0,
      ...idea,
      'createdAt': FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  Future<void> deleteIdea(String ideaId) =>
      _db.collection('ideas').doc(ideaId).delete();

  Future<void> investInIdea(String ideaId, int amount) => _db
      .collection('ideas')
      .doc(ideaId)
      .update({'invested': FieldValue.increment(amount)});

  // ---------------- Stories ----------------
  Future<String> createStory(Map<String, dynamic> story) async {
    final ref = await _db.collection('stories').add({
      ...story,
      'reactions': <String, dynamic>{},
      'createdAt': FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  /// Live stories from the last 24h (filtered client-side, no index needed).
  Stream<List<Story>> watchStories() => _db
      .collection('stories')
      .orderBy('createdAt', descending: true)
      .limit(100)
      .snapshots()
      .map((s) {
        final cutoff = DateTime.now().millisecondsSinceEpoch - _dayMs;
        return s.docs
            .map((d) => Story.fromMap(d.id, d.data()))
            .where((st) =>
                (st.createdAtDate?.millisecondsSinceEpoch ??
                    DateTime.now().millisecondsSinceEpoch) >=
                cutoff)
            .toList();
      });

  Future<void> reactToStory(String storyId, String emoji, String uid) => _db
      .collection('stories')
      .doc(storyId)
      .update({'reactions.$uid': emoji});

  Future<void> markStoryViewed(String storyId, String uid) => _db
      .collection('stories')
      .doc(storyId)
      .update({'viewers': FieldValue.arrayUnion([uid])}).catchError((_) {});

  // ---------------- Reports & moderation ----------------
  Future<void> reportContent(Map<String, dynamic> report) =>
      _db.collection('reports').add({
        'status': 'pending',
        ...report,
        'createdAt': FieldValue.serverTimestamp(),
      });

  Stream<List<Report>> watchReports() => _db
      .collection('reports')
      .orderBy('createdAt', descending: true)
      .limit(100)
      .snapshots()
      .map((s) => s.docs.map((d) => Report.fromMap(d.id, d.data())).toList());

  Future<void> resolveReport(String reportId, String status) =>
      _db.collection('reports').doc(reportId).update({'status': status});

  // ---------------- Errors & digest (admin) ----------------
  Stream<List<AppError>> watchErrors({int max = 100}) => _db
      .collection('errors')
      .orderBy('createdAt', descending: true)
      .limit(max)
      .snapshots()
      .map((s) => s.docs.map((d) => AppError.fromMap(d.id, d.data())).toList());

  Future<void> resolveError(String errorId) =>
      _db.collection('errors').doc(errorId).update({'status': 'resolved'});

  Future<void> logError(Map<String, dynamic> entry) =>
      _db.collection('errors').add({
        'status': 'open',
        ...entry,
        'createdAt': FieldValue.serverTimestamp(),
      }).then((_) {}).catchError((_) {});

  Stream<Map<String, dynamic>?> watchAdminDigest() => _db
      .collection('admin_digests')
      .doc('latest')
      .snapshots()
      .map((d) => d.exists ? d.data() : null);

  // ---------------- Credit log ----------------
  Stream<List<CreditTx>> watchCreditLog(String uid) => _db
      .collection('users')
      .doc(uid)
      .collection('credits_log')
      .orderBy('createdAt', descending: true)
      .limit(50)
      .snapshots()
      .map((s) => s.docs.map((d) => CreditTx.fromMap(d.id, d.data())).toList());
}

final socialRepositoryProvider = Provider<SocialRepository>(
    (ref) => SocialRepository(ref.watch(firestoreProvider)));

final notificationsProvider = StreamProvider<List<AppNotification>>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return Stream.value(const []);
  return ref.watch(socialRepositoryProvider).watchNotifications(auth.uid);
});

final unreadCountProvider = StreamProvider<int>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return Stream.value(0);
  return ref.watch(socialRepositoryProvider).watchUnreadCount(auth.uid);
});

final ideasProvider = StreamProvider<List<Idea>>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return Stream.value(const []);
  return ref.watch(socialRepositoryProvider).watchIdeas();
});

final storiesProvider = StreamProvider<List<Story>>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return Stream.value(const []);
  return ref.watch(socialRepositoryProvider).watchStories();
});

final creditLogProvider = StreamProvider<List<CreditTx>>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return Stream.value(const []);
  return ref.watch(socialRepositoryProvider).watchCreditLog(auth.uid);
});
