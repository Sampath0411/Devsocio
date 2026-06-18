import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

class GithubRepo {
  final String name;
  final String description;
  final int stars;
  final String language;
  final String htmlUrl;
  const GithubRepo({
    required this.name,
    required this.description,
    required this.stars,
    required this.language,
    required this.htmlUrl,
  });

  factory GithubRepo.fromMap(Map<String, dynamic> m) => GithubRepo(
        name: (m['name'] ?? '') as String,
        description: (m['description'] ?? '') as String? ?? '',
        stars: ((m['stargazers_count'] ?? 0) as num).toInt(),
        language: (m['language'] ?? '') as String? ?? '',
        htmlUrl: (m['html_url'] ?? '') as String,
      );
}

/// GitHub public API (unauthenticated, 60 req/hr/IP). Mirrors src/lib/github.js.
class GithubClient {
  final _cache = <String, List<GithubRepo>>{};

  Future<List<GithubRepo>> topRepos(String username, {int limit = 6}) async {
    if (username.isEmpty) return [];
    if (_cache.containsKey(username)) return _cache[username]!;
    final res = await http.get(Uri.parse(
        'https://api.github.com/users/$username/repos?sort=updated&per_page=100'));
    if (res.statusCode != 200) return [];
    final list = (jsonDecode(res.body) as List)
        .map((e) => GithubRepo.fromMap(e as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => b.stars.compareTo(a.stars));
    final top = list.take(limit).toList();
    _cache[username] = top;
    return top;
  }
}

final githubClientProvider = Provider<GithubClient>((ref) => GithubClient());

final githubReposProvider =
    FutureProvider.family<List<GithubRepo>, String>((ref, username) =>
        ref.watch(githubClientProvider).topRepos(username));
