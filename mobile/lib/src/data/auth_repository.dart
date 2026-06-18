import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../core/constants.dart';
import 'firebase_providers.dart';

String _avatarFor(String seed) =>
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=${Uri.encodeComponent(seed)}&backgroundColor=6c63ff';

String _providerOf(User user) {
  final id = user.providerData.isNotEmpty
      ? user.providerData.first.providerId
      : '';
  if (id.contains('google')) return 'google';
  if (id.contains('github')) return 'github';
  return 'email';
}

class AuthRepository {
  final FirebaseAuth _auth;
  final FirebaseFirestore _db;
  AuthRepository(this._auth, this._db);

  User? get currentUser => _auth.currentUser;

  bool _isAdminEmail(String? email) =>
      email != null && email.toLowerCase() == kAdminEmail.toLowerCase();

  /// Mirrors web defaultProfile(): the users/{uid} doc written on first sign-in.
  Map<String, dynamic> _defaultProfile(User user, Map<String, dynamic> extra) {
    final base = (user.email ?? user.uid).split('@').first;
    return {
      'uid': user.uid,
      'username': extra['username'] ?? base,
      'displayName': extra['displayName'] ?? user.displayName ?? base,
      'email': user.email ?? '',
      'bio': extra['bio'] ?? 'New on DevSocio — building things in public.',
      'avatar': user.photoURL ?? _avatarFor(extra['username'] ?? base),
      'devLevel': extra['devLevel'] ?? 'Builder',
      'techStack': extra['techStack'] ?? ['React'],
      'provider': _providerOf(user),
      'referredBy': extra['referredBy'],
      'credits': 100,
      'followersCount': 0,
      'followingCount': 0,
      'postsCount': 0,
      'openToCollab': true,
      'lookingForCofounder': false,
      'links': <String, dynamic>{},
      'createdAt': FieldValue.serverTimestamp(),
    };
  }

  /// Create the profile doc if absent; re-assert owner flags; stamp last login.
  /// Returns true when a brand-new profile doc was created.
  Future<bool> ensureProfile(User user, {Map<String, dynamic>? extra}) async {
    final fallback = _defaultProfile(user, extra ?? const {});
    final ownerFlags = _isAdminEmail(user.email)
        ? {
            'verified': true,
            'moderator': true,
            'founder': true,
            'banned': false,
          }
        : null;
    if (ownerFlags != null) fallback.addAll(ownerFlags);

    final ref = _db.collection('users').doc(user.uid);
    final snap = await ref.get();
    if (!snap.exists) {
      await ref.set(fallback);
      return true;
    }
    final patch = <String, dynamic>{'lastLoginAt': FieldValue.serverTimestamp()};
    final data = snap.data() ?? {};
    if (data['provider'] == null) patch['provider'] = _providerOf(user);
    if (ownerFlags != null) patch.addAll(ownerFlags);
    await ref.update(patch);
    return false;
  }

  Future<User> emailSignup({
    required String email,
    required String password,
    required String username,
    required String displayName,
    required String devLevel,
    required List<String> techStack,
    String? referredBy,
  }) async {
    final cred = await _auth.createUserWithEmailAndPassword(
        email: email, password: password);
    final user = cred.user!;
    if (displayName.isNotEmpty) await user.updateDisplayName(displayName);
    await ensureProfile(user, extra: {
      'username': username,
      'displayName': displayName,
      'devLevel': devLevel,
      'techStack': techStack,
      'referredBy': referredBy,
    });
    return user;
  }

  Future<User> emailLogin(
      {required String email, required String password}) async {
    final cred = await _auth.signInWithEmailAndPassword(
        email: email, password: password);
    await ensureProfile(cred.user!);
    return cred.user!;
  }

  Future<User> googleLogin({Map<String, dynamic>? extra}) async {
    final googleUser = await GoogleSignIn().signIn();
    if (googleUser == null) {
      throw FirebaseAuthException(
          code: 'popup-closed-by-user', message: 'Sign-in cancelled.');
    }
    final googleAuth = await googleUser.authentication;
    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );
    final cred = await _auth.signInWithCredential(credential);
    await ensureProfile(cred.user!, extra: extra);
    return cred.user!;
  }

  Future<void> resetPassword(String email) =>
      _auth.sendPasswordResetEmail(email: email);

  Future<void> logout() async {
    try {
      await GoogleSignIn().signOut();
    } catch (_) {/* not signed in via Google — ignore */}
    await _auth.signOut();
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository(
      ref.watch(firebaseAuthProvider),
      ref.watch(firestoreProvider),
    ));

/// Friendly messages for FirebaseAuth error codes (mirrors authErrorMessage).
String authErrorMessage(Object err) {
  if (err is FirebaseAuthException) {
    const map = {
      'invalid-email': 'That email looks invalid.',
      'email-already-in-use': 'An account already exists with that email.',
      'weak-password': 'Password should be at least 6 characters.',
      'invalid-credential': 'Incorrect email or password.',
      'user-not-found': 'No account found with that email.',
      'wrong-password': 'Incorrect password.',
      'popup-closed-by-user': 'Sign-in was cancelled.',
      'operation-not-allowed': 'This sign-in method isn\'t enabled yet.',
      'too-many-requests': 'Too many attempts — try again later.',
      'network-request-failed': 'Network error — check your connection.',
    };
    return map[err.code] ?? err.message ?? 'Something went wrong.';
  }
  return 'Something went wrong. Please try again.';
}
