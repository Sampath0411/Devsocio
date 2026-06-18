import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../core/env.dart';

/// Calls the server-side AI proxy (Vercel /api/ai). The OpenRouter key stays on
/// the server — the mobile client never holds it (mirrors src/lib/ai.js prod path).
class AiClient {
  Future<String> _chat(List<Map<String, String>> messages,
      {double temperature = 0.7, int maxTokens = 500}) async {
    final res = await http.post(
      Uri.parse(Env.aiUrl),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'messages': messages,
        'temperature': temperature,
        'maxTokens': maxTokens,
      }),
    );
    if (res.statusCode != 200) {
      throw Exception('AI request failed (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final text = data['text'] as String?;
    if (text == null || text.isEmpty) throw Exception('Empty AI response');
    return text;
  }

  static const _postDirective = {
    'Code Snippet':
        'Explain in ONE sentence what this code does and why it is useful.',
    'Project Showcase':
        'Rate the project concept out of 10 and give ONE concrete next step.',
    'Idea Post': 'Give a market score out of 10, then ONE strength and ONE risk.',
    'Dev Meme': 'Rate the humor out of 10 in ONE witty line.',
    'Question / Help': 'Give ONE concise first-pass answer or debugging direction.',
    'Opinion / Take': 'Offer ONE thoughtful counter-argument.',
  };

  Future<String> analyzePost(String type, String content) {
    final directive =
        _postDirective[type] ?? 'Give one short, useful insight.';
    return _chat([
      {
        'role': 'system',
        'content':
            'You are DevSocio AI, a sharp, friendly assistant for developers. '
                'Reply with a single short line (max 30 words). No preamble, no markdown.',
      },
      {
        'role': 'user',
        'content': 'Post type: $type\n$directive\n\nPost:\n"""$content"""',
      },
    ], temperature: 0.6, maxTokens: 120);
  }

  Future<IdeaScore> scoreIdea(String text) async {
    final raw = await _chat([
      {
        'role': 'system',
        'content':
            'You are DevSocio AI, a startup analyst. Score the idea and respond ONLY with '
                'minified JSON of shape: {"score":number 0-10 one decimal,"strengths":[3 short strings],'
                '"weaknesses":[3 short strings],"competitors":[2-3 real product names]}. No prose.',
      },
      {'role': 'user', 'content': 'Idea:\n"""$text"""'},
    ], temperature: 0.5, maxTokens: 400);
    final obj = _extractJson(raw);
    return IdeaScore(
      score: ((obj['score'] as num?)?.toDouble() ?? 0).clamp(0, 10).toDouble(),
      strengths: List<String>.from((obj['strengths'] ?? const []) as List)
          .take(3)
          .toList(),
      weaknesses: List<String>.from((obj['weaknesses'] ?? const []) as List)
          .take(3)
          .toList(),
      competitors: List<String>.from((obj['competitors'] ?? const []) as List)
          .take(3)
          .toList(),
    );
  }

  Future<String> generateBio({
    required List<String> techStack,
    required String devLevel,
    required bool lookingForCofounder,
  }) async {
    final text = await _chat([
      {
        'role': 'system',
        'content':
            'You write punchy developer bios for a dev social network. '
                'Max 160 characters, first person, no hashtags, no quotes, one line.',
      },
      {
        'role': 'user',
        'content':
            'Level: $devLevel. Stack: ${techStack.isEmpty ? 'generalist' : techStack.join(', ')}. '
                '${lookingForCofounder ? 'Looking for a co-founder.' : 'Open to collaborations.'}',
      },
    ], temperature: 0.9, maxTokens: 90);
    final cleaned = text.replaceAll(RegExp(r'''^["']|["']$'''), '');
    return cleaned.length > 160 ? cleaned.substring(0, 160) : cleaned;
  }

  Map<String, dynamic> _extractJson(String text) {
    final fenced =
        RegExp(r'```(?:json)?\s*([\s\S]*?)```', caseSensitive: false)
            .firstMatch(text);
    final candidate = (fenced != null ? fenced.group(1)! : text).trim();
    final start = candidate.indexOf(RegExp(r'[\[{]'));
    if (start == -1) throw Exception('No JSON found in model output');
    return jsonDecode(candidate.substring(start)) as Map<String, dynamic>;
  }
}

class IdeaScore {
  final double score;
  final List<String> strengths;
  final List<String> weaknesses;
  final List<String> competitors;
  const IdeaScore({
    required this.score,
    required this.strengths,
    required this.weaknesses,
    required this.competitors,
  });
}

final aiClientProvider = Provider<AiClient>((ref) => AiClient());
