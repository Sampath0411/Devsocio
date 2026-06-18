import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/app_user.dart';
import 'firebase_providers.dart';

class UserRepository {
  final FirebaseFirestore _db;
  UserRepository(this._db);

  CollectionReference<Map<String, dynamic>> get _users =>
      _db.collection('users');

  Stream<AppUser?> watchProfile(String uid) =>
      _users.doc(uid).snapshots().map((s) =>
          s.exists ? AppUser.fromMap({'uid': uid, ...?s.data()}) : null);

  Stream<List<AppUser>> watchUsers({int max = 200}) =>
      _users.limit(max).snapshots().map((s) =>
          s.docs.map((d) => AppUser.fromMap({'uid': d.id, ...d.data()})).toList());

  Future<AppUser?> fetchByUsername(String username) async {
    final snap =
        await _users.where('username', isEqualTo: username).limit(1).get();
    if (snap.docs.isEmpty) return null;
    final d = snap.docs.first;
    return AppUser.fromMap({'uid': d.id, ...d.data()});
  }

  Future<AppUser?> fetchByUid(String uid) async {
    final d = await _users.doc(uid).get();
    return d.exists ? AppUser.fromMap({'uid': uid, ...?d.data()}) : null;
  }

  Future<void> updateProfile(String uid, Map<String, dynamic> fields) =>
      _users.doc(uid).update(fields);

  Future<void> changeCredits(String uid, int delta) =>
      _users.doc(uid).update({'credits': FieldValue.increment(delta)});

  Future<void> setCredits(String uid, int value) =>
      _users.doc(uid).update({'credits': value < 0 ? 0 : value});

  Future<void> setFlag(String uid, String field, dynamic value) =>
      _users.doc(uid).update({field: value});

  Future<void> touchPresence(String uid) =>
      _users.doc(uid).update({'lastActiveAt': FieldValue.serverTimestamp()});

  Future<void> markOnboardingDone(String uid) =>
      _users.doc(uid).update({'onboardingDone': true});

  /// One-shot repair: reset any negative denormalised counters to 0.
  /// (Fixes accounts whose postsCount went negative before the clamp fix.)
  Future<void> healCounters(String uid) async {
    final snap = await _users.doc(uid).get();
    final d = snap.data();
    if (d == null) return;
    final fix = <String, dynamic>{};
    for (final f in ['postsCount', 'followersCount', 'followingCount', 'credits']) {
      final v = (d[f] ?? 0) as num;
      if (v < 0) fix[f] = 0;
    }
    if (fix.isNotEmpty) await _users.doc(uid).update(fix).catchError((_) {});
  }

  // --- Followers / following lists ---
  Future<List<String>> followingUids(String uid) async {
    final snap = await _users.doc(uid).collection('following').get();
    return snap.docs.map((d) => d.id).toList();
  }

  Future<List<String>> followerUids(String uid) async {
    final snap = await _db
        .collectionGroup('following')
        .where('uid', isEqualTo: uid)
        .get();
    return snap.docs
        .map((d) => d.reference.parent.parent?.id)
        .whereType<String>()
        .toList();
  }

  Future<List<AppUser>> usersByUids(List<String> uids) async {
    final out = <AppUser>[];
    for (final uid in uids) {
      final u = await fetchByUid(uid);
      if (u != null) out.add(u);
    }
    return out;
  }

  // --- Follows ---
  Future<void> _decrClamped(String uid, String field) =>
      _db.runTransaction((tx) async {
        final ref = _users.doc(uid);
        final snap = await tx.get(ref);
        final current = ((snap.data()?[field] ?? 0) as num).toInt();
        tx.update(ref, {field: current > 0 ? current - 1 : 0});
      }).catchError((_) {});

  Future<void> setFollow(String me, String target, bool following) async {
    final edge = _users.doc(me).collection('following').doc(target);
    if (following) {
      await edge.set({'uid': target, 'createdAt': FieldValue.serverTimestamp()});
      await _users.doc(me).update({'followingCount': FieldValue.increment(1)});
      await _users.doc(target).update({'followersCount': FieldValue.increment(1)});
    } else {
      await edge.delete();
      // Clamp at 0 so counters never go negative.
      await _decrClamped(me, 'followingCount');
      await _decrClamped(target, 'followersCount');
    }
  }

  Stream<Set<String>> watchMyFollowing(String uid) => _users
      .doc(uid)
      .collection('following')
      .snapshots()
      .map((s) => s.docs.map((d) => d.id).toSet());

  // --- Saves ---
  Future<void> setSave(String uid, String postId, bool saved) async {
    final ref = _users.doc(uid).collection('saves').doc(postId);
    if (saved) {
      await ref.set({'postId': postId, 'createdAt': FieldValue.serverTimestamp()});
    } else {
      await ref.delete();
    }
  }

  Stream<Set<String>> watchMySaves(String uid) => _users
      .doc(uid)
      .collection('saves')
      .snapshots()
      .map((s) => s.docs.map((d) => d.id).toSet());
}

final userRepositoryProvider = Provider<UserRepository>(
    (ref) => UserRepository(ref.watch(firestoreProvider)));

/// The signed-in user's live Firestore profile (null when signed out / no doc).
final currentUserProvider = StreamProvider<AppUser?>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return Stream.value(null);
  return ref.watch(userRepositoryProvider).watchProfile(auth.uid);
});

/// All users (Explore, leaderboard, admin, suggestions).
final usersProvider = StreamProvider<List<AppUser>>(
    (ref) => ref.watch(userRepositoryProvider).watchUsers());

final myFollowingProvider = StreamProvider<Set<String>>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return Stream.value(const {});
  return ref.watch(userRepositoryProvider).watchMyFollowing(auth.uid);
});

final mySavesProvider = StreamProvider<Set<String>>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return Stream.value(const {});
  return ref.watch(userRepositoryProvider).watchMySaves(auth.uid);
});
