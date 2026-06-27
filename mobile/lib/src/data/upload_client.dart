import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Stores images IN Firestore as compressed base64 `data:` URIs — no Firebase
/// Storage (needs the paid Blaze plan) and no third-party host. Callers must
/// pre-shrink with image_picker (maxWidth + imageQuality); this guards the size
/// so a document never exceeds Firestore's ~1 MB limit.
///
/// The resulting `data:image/...;base64,...` string is saved into the same
/// `avatar` / `imageUrl` fields the web app uses — browsers and AppImage both
/// render data URIs natively, so images stay in sync across web and mobile.
class UploadClient {
  bool get enabled => true; // always available (stored in Firestore)

  /// Max base64 length. Kept well under Firestore's 1,048,576-byte doc cap so
  /// there's room for the rest of the document's fields.
  static const _maxB64 = 900 * 1024;

  Future<String> uploadBytes(Uint8List bytes, String filename) async {
    final ext = filename.contains('.')
        ? filename.split('.').last.toLowerCase()
        : 'jpg';
    final mime = 'image/${ext == 'jpg' ? 'jpeg' : ext}';
    final b64 = base64Encode(bytes);
    if (b64.length > _maxB64) {
      throw Exception(
          'Image is too large to store. Pick a smaller or lower-resolution photo.');
    }
    return 'data:$mime;base64,$b64';
  }
}

final uploadClientProvider = Provider<UploadClient>((ref) => UploadClient());
