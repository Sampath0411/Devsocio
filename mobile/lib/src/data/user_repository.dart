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

  // --- Follows ---
  Future<void> setFollow(String me, String target, bool following) async {
    final edge = _users.doc(me).collection('following').doc(target);
    if (following) {
      await edge.set({'uid': target, 'createdAt': FieldValue.serverTimestamp()});
      await _users.doc(me).update({'followingCount': FieldValue.increment(1)});
      await _users.doc(target).update({'followersCount': FieldValue.increment(1)});
    } else {
      await edge.delete();
      await _users.doc(me).update({'followingCount': FieldValue.increment(-1)});
      await _users.doc(target).update({'followersCount': FieldValue.increment(-1)});
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
