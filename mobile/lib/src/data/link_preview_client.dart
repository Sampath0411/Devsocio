import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

/// Parsed Open Graph metadata from a URL.
class LinkPreviewData {
  final String url;
  final String? title;
  final String? description;
  final String? imageUrl;
  final String? siteName;

  const LinkPreviewData({
    required this.url,
    this.title,
    this.description,
    this.imageUrl,
    this.siteName,
  });

  bool get hasData => title != null || description != null || imageUrl != null;
}

/// Client that fetches a URL and extracts Open Graph meta tags.
/// Results are cached in-memory to avoid re-fetching.
class LinkPreviewClient {
  final _cache = <String, LinkPreviewData>{};
  final _pending = <String, Future<LinkPreviewData>>{};

  static const _userAgent =
      'Mozilla/5.0 (compatible; DevSocioBot/1.0; +https://devsocio.app)';

  Future<LinkPreviewData> fetch(String url) async {
    final clean = _cleanUrl(url);
    if (clean == null) {
      return LinkPreviewData(url: url);
    }

    final cached = _cache[clean];
    if (cached != null) return cached;

    if (_pending.containsKey(clean)) return _pending[clean]!;

    final future = _doFetch(clean);
    _pending[clean] = future;
    try {
      final result = await future;
      _cache[clean] = result;
      return result;
    } finally {
      _pending.remove(clean);
    }
  }

  Future<LinkPreviewData> _doFetch(String url) async {
    try {
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'User-Agent': _userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode != 200) {
        return LinkPreviewData(url: url);
      }

      final body = response.body;
      final title = _extractMeta(body, 'og:title') ??
          _extractMeta(body, 'twitter:title') ??
          _extractTitle(body);
      final description = _extractMeta(body, 'og:description') ??
          _extractMeta(body, 'twitter:description') ??
          _extractMetaDesc(body);
      final imageUrl = _resolveUrl(
        _extractMeta(body, 'og:image') ??
            _extractMeta(body, 'twitter:image'),
        url,
      );
      final siteName = _extractMeta(body, 'og:site_name');

      return LinkPreviewData(
        url: url,
        title: title,
        description: description,
        imageUrl: imageUrl,
        siteName: siteName,
      );
    } catch (_) {
      return LinkPreviewData(url: url);
    }
  }

  /// Extract a meta tag by property or name.
  /// Uses triple-quoted raw strings to safely include both quote types.
  String? _extractMeta(String html, String property) {
    final escaped = RegExp.escape(property);
    // Pattern: <meta ... property/name="..." ... content="..." ...>
    final pattern1 = RegExp(
      r'''<meta\s[^>]*?(?:property|name)=["']''' +
          escaped +
          r'''["']\s[^>]*?content=["']([^"']+)["']''',
      caseSensitive: false,
      dotAll: true,
    );
    final match1 = pattern1.firstMatch(html);
    if (match1 != null) return _decodeEntities(match1.group(1)!);

    // Pattern: <meta ... content="..." ... property/name="..." ...>
    final pattern2 = RegExp(
      r'''<meta\s[^>]*?content=["']([^"']+)["']\s[^>]*?(?:property|name)=["']''' +
          escaped +
          r'''["']''',
      caseSensitive: false,
      dotAll: true,
    );
    final match2 = pattern2.firstMatch(html);
    if (match2 != null) return _decodeEntities(match2.group(1)!);

    return null;
  }

  String? _extractTitle(String html) {
    final match =
        RegExp(r'''<title[^>]*>([^<]+)</title>''',
            caseSensitive: false, dotAll: true)
            .firstMatch(html);
    if (match != null) return _decodeEntities(match.group(1)!);
    return null;
  }

  String? _extractMetaDesc(String html) {
    final match = RegExp(
      r'''<meta\s[^>]*?name=["']description["'][^>]*?content=["']([^"']+)["']''',
      caseSensitive: false,
      dotAll: true,
    ).firstMatch(html);
    return match != null ? _decodeEntities(match.group(1)!) : null;
  }

  /// Resolve a potentially relative image URL against the page URL.
  String? _resolveUrl(String? imageUrl, String pageUrl) {
    if (imageUrl == null || imageUrl.isEmpty) return null;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    final uri = Uri.tryParse(pageUrl);
    if (uri == null) return imageUrl;
    final resolved = uri.resolve(imageUrl);
    return resolved.toString();
  }

  /// Basic HTML entity decoding.
  String _decodeEntities(String text) {
    return text
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&#x27;', "'")
        .replaceAll('&#x2F;', '/');
  }

  /// Normalize a URL: ensure it has a scheme, remove trailing junk.
  String? _cleanUrl(String url) {
    var clean = url.trim();
    if (clean.isEmpty) return null;
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://$clean';
    }
    final uri = Uri.tryParse(clean);
    if (uri == null || !uri.host.contains('.')) return null;
    return uri.toString();
  }
}

final linkPreviewClientProvider =
    Provider<LinkPreviewClient>((ref) => LinkPreviewClient());
