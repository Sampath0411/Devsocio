import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../core/env.dart';

/// Cloudinary unsigned upload (mirrors src/lib/upload.js). When Cloudinary is
/// not configured, callers fall back to pasting an image URL.
class UploadClient {
  bool get enabled => Env.cloudinaryEnabled;

  Future<String> uploadBytes(List<int> bytes, String filename) async {
    if (!enabled) {
      throw Exception('Cloudinary not configured — paste an image URL instead.');
    }
    final uri = Uri.parse(
        'https://api.cloudinary.com/v1_1/${Env.cloudinaryCloud}/image/upload');
    final req = http.MultipartRequest('POST', uri)
      ..fields['upload_preset'] = Env.cloudinaryPreset
      ..files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
    final streamed = await req.send();
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode != 200) {
      throw Exception('Upload failed (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final url = data['secure_url'] as String?;
    if (url == null) throw Exception('No URL returned from Cloudinary');
    return url;
  }
}

final uploadClientProvider = Provider<UploadClient>((ref) => UploadClient());
