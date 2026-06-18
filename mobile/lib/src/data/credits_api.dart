import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../core/env.dart';
import 'firebase_providers.dart';

/// Client for the server-trusted credit endpoint (Vercel /api/credits).
/// All credit EARNING goes through here — never mutated client-side — exactly
/// like the web app. Each call sends the Firebase ID token for verification.
class CreditsApi {
  final FirebaseAuth _auth;
  CreditsApi(this._auth);

  Future<Map<String, dynamic>> _post(Map<String, dynamic> body) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('Not signed in');
    final token = await user.getIdToken();
    final res = await http.post(
      Uri.parse(Env.creditsUrl),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );
    if (res.statusCode != 200) {
      throw Exception('Credit request failed (${res.statusCode})');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> dailyLogin() => _post({'action': 'daily_login'});
  Future<Map<String, dynamic>> profileComplete() =>
      _post({'action': 'profile_complete'});
  Future<Map<String, dynamic>> referralSignup() =>
      _post({'action': 'referral_signup'});
  Future<Map<String, dynamic>> postReward() => _post({'action': 'post_reward'});
  Future<Map<String, dynamic>> post10Likes(String postId) =>
      _post({'action': 'post_10_likes', 'postId': postId});
  Future<Map<String, dynamic>> post50Likes(String postId) =>
      _post({'action': 'post_50_likes', 'postId': postId});

  /// Best-effort wrapper — credit endpoints are non-critical, never block UX.
  Future<Map<String, dynamic>?> tryCall(
      Future<Map<String, dynamic>> Function() fn) async {
    try {
      return await fn();
    } catch (_) {
      return null;
    }
  }
}

final creditsApiProvider =
    Provider<CreditsApi>((ref) => CreditsApi(ref.watch(firebaseAuthProvider)));
