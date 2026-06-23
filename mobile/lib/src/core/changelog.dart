import 'package:shared_preferences/shared_preferences.dart';

/// Stores the last-seen app version so we can show "What's New" on updates.
class ChangelogStore {
  static const _key = 'last_seen_build_number';

  /// Returns the previously recorded build number, or null on first install.
  static Future<int?> getLastSeenBuild() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_key);
  }

  /// Persists the current build number after the user dismisses What's New.
  static Future<void> setLastSeenBuild(int buildNumber) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_key, buildNumber);
  }

  /// Returns true if the user has never opened the app (fresh install) or
  /// the app was just updated to a newer build number.
  static Future<bool> shouldShowChangelog(int currentBuild) async {
    final last = await getLastSeenBuild();
    // First install: last is null → show changelog
    // Update: last < current → show changelog
    return last == null || last < currentBuild;
  }
}

/// Changelog entries — update this list each release.
/// The first entry is always shown to the user.
class Changelog {
  Changelog._();

  static const String currentVersion = '1.0.0';
  static const int currentBuildNumber = 1;

  static const List<ChangelogEntry> entries = [
    ChangelogEntry(
      version: '1.0.0',
      date: 'June 2026',
      items: [
        ChangelogItem(type: ChangelogItemType.newFeature, text: 'In-app AI powered by DeepSeek — analyze posts, score ideas, and generate bios'),
        ChangelogItem(type: ChangelogItemType.newFeature, text: 'Admin AI Copilot — investigate users, moderate content, and manage credits with AI assistance'),
        ChangelogItem(type: ChangelogItemType.newFeature, text: 'Animated splash screen with glowing logo and smooth transitions'),
        ChangelogItem(type: ChangelogItemType.newFeature, text: 'What\'s New changelog — see what changed after every update'),
        ChangelogItem(type: ChangelogItemType.improved, text: 'Firestore permission errors fixed — auth guards prevent premature data reads'),
        ChangelogItem(type: ChangelogItemType.improved, text: 'Direct OpenRouter integration for faster, more reliable AI responses'),
        ChangelogItem(type: ChangelogItemType.fixed, text: 'Startup logo appearing in top-left corner — now centered with animation'),
        ChangelogItem(type: ChangelogItemType.fixed, text: 'Admin panel AI Copilot now works on mobile'),
        ChangelogItem(type: ChangelogItemType.fixed, text: 'Firestore permission-denied errors on cold start'),
      ],
    ),
  ];
}

enum ChangelogItemType { newFeature, improved, fixed }

class ChangelogItem {
  final ChangelogItemType type;
  final String text;
  const ChangelogItem({required this.type, required this.text});

  String get emoji {
    switch (type) {
      case ChangelogItemType.newFeature:
        return '✨';
      case ChangelogItemType.improved:
        return '⚡';
      case ChangelogItemType.fixed:
        return '🐛';
    }
  }

  String get label {
    switch (type) {
      case ChangelogItemType.newFeature:
        return 'NEW';
      case ChangelogItemType.improved:
        return 'IMPROVED';
      case ChangelogItemType.fixed:
        return 'FIXED';
    }
  }
}

class ChangelogEntry {
  final String version;
  final String date;
  final List<ChangelogItem> items;
  const ChangelogEntry({
    required this.version,
    required this.date,
    required this.items,
  });
}
