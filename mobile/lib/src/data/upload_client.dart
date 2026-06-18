import 'dart:convert';
import 'dart:typed_data';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../core/env.dart';
import 'firebase_providers.dart';

/// Uploads images for avatars and posts. Prefers Firebase Storage (same
/// project, no extra config). Falls back to Cloudinary if configured.
class UploadClient {
  final FirebaseAuth _auth;
  UploadClient(this._auth);

  /// Upload works via Firebase Storage whenever the user is signed in.
  bool get enabled => _auth.currentUser != null;

  Future<String> uploadBytes(Uint8List bytes, String filename,
      {String folder = 'uploads'}) async {
    // 1) Cloudinary (only if this build configured it) — matches the web app.
    if (Env.cloudinaryEnabled) {
      try {
        return await _cloudinary(bytes, filename);
      } catch (_) {/* fall through to Firebase Storage */}
    }
    // 2) Firebase Storage (default).
    final uid = _auth.currentUser?.uid ?? 'anon';
    final ext = filename.contains('.')
        ? filename.split('.').last.toLowerCase()
        : 'jpg';
    final ref = FirebaseStorage.instance
        .ref()
        .child('$folder/$uid/${DateTime.now().millisecondsSinceEpoch}.$ext');
    final task = await ref.putData(
      bytes,
      SettableMetadata(contentType: 'image/${ext == 'jpg' ? 'jpeg' : ext}'),
    );
    return task.ref.getDownloadURL();
  }

  Future<String> _cloudinary(Uint8List bytes, String filename) async {
    final uri = Uri.parse(
        'https://api.cloudinary.com/v1_1/${Env.cloudinaryCloud}/image/upload');
    final req = http.MultipartRequest('POST', uri)
      ..fields['upload_preset'] = Env.cloudinaryPreset
      ..files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
    final res = await http.Response.fromStream(await req.send());
    if (res.statusCode != 200) {
      throw Exception('Cloudinary upload failed (${res.statusCode})');
    }
    return (jsonDecode(res.body) as Map<String, dynamic>)['secure_url'] as String;
  }
}

final uploadClientProvider =
    Provider<UploadClient>((ref) => UploadClient(ref.watch(firebaseAuthProvider)));
