import 'timestamp_util.dart';

/// Lightweight author snapshot embedded in posts/comments/ideas/stories.
class AuthorRef {
  final String uid;
  final String username;
  final String displayName;
  final String avatar;

  const AuthorRef({
    required this.uid,
    required this.username,
    required this.displayName,
    required this.avatar,
  });

  factory AuthorRef.fromMap(Map<String, dynamic>? m) {
    m ??= const {};
    return AuthorRef(
      uid: (m['uid'] ?? '') as String,
      username: (m['username'] ?? '') as String,
      displayName: (m['displayName'] ?? '') as String,
      avatar: (m['avatar'] ?? '') as String,
    );
  }

  Map<String, dynamic> toMap() => {
        'uid': uid,
        'username': username,
        'displayName': displayName,
        'avatar': avatar,
      };
}

/// users/{uid} — full profile doc.
class AppUser {
  final String uid;
  final String username;
  final String displayName;
  final String email;
  final String bio;
  final String avatar;
  final String devLevel;
  final List<String> techStack;
  final bool openToCollab;
  final bool lookingForCofounder;
  final Map<String, dynamic> links;
  final int credits;
  final int followersCount;
  final int followingCount;
  final int postsCount;
  final bool verified;
  final bool moderator;
  final bool banned;
  final bool founder;
  final String provider;
  final String? referredBy;
  final int loginStreak;
  final int longestStreak;
  final bool onboardingDone;
  final dynamic lastActiveAt;
  final Map<String, dynamic> raw;

  const AppUser({
    required this.uid,
    required this.username,
    required this.displayName,
    required this.email,
    required this.bio,
    required this.avatar,
    required this.devLevel,
    required this.techStack,
    required this.openToCollab,
    required this.lookingForCofounder,
    required this.links,
    required this.credits,
    required this.followersCount,
    required this.followingCount,
    required this.postsCount,
    required this.verified,
    required this.moderator,
    required this.banned,
    required this.founder,
    required this.provider,
    required this.referredBy,
    required this.loginStreak,
    required this.longestStreak,
    required this.onboardingDone,
    required this.lastActiveAt,
    required this.raw,
  });

  bool get isOnline => isOnlineFrom(lastActiveAt);
  bool get isAdmin =>
      founder || email.toLowerCase() == 'sampathlox@gmail.com';

  AuthorRef get asAuthor => AuthorRef(
        uid: uid,
        username: username,
        displayName: displayName,
        avatar: avatar,
      );

  factory AppUser.fromMap(Map<String, dynamic> m) {
    return AppUser(
      uid: (m['uid'] ?? '') as String,
      username: (m['username'] ?? '') as String,
      displayName: (m['displayName'] ?? '') as String,
      email: (m['email'] ?? '') as String,
      bio: (m['bio'] ?? '') as String,
      avatar: (m['avatar'] ?? '') as String,
      devLevel: (m['devLevel'] ?? 'Builder') as String,
      techStack: List<String>.from((m['techStack'] ?? const []) as List),
      openToCollab: (m['openToCollab'] ?? false) as bool,
      lookingForCofounder: (m['lookingForCofounder'] ?? false) as bool,
      links: Map<String, dynamic>.from((m['links'] ?? const {}) as Map),
      credits: ((m['credits'] ?? 0) as num).toInt(),
      followersCount: ((m['followersCount'] ?? 0) as num).toInt(),
      followingCount: ((m['followingCount'] ?? 0) as num).toInt(),
      postsCount: ((m['postsCount'] ?? 0) as num).toInt(),
      verified: (m['verified'] ?? false) as bool,
      moderator: (m['moderator'] ?? false) as bool,
      banned: (m['banned'] ?? false) as bool,
      founder: (m['founder'] ?? false) as bool,
      provider: (m['provider'] ?? 'email') as String,
      referredBy: m['referredBy'] as String?,
      loginStreak: ((m['loginStreak'] ?? 0) as num).toInt(),
      longestStreak: ((m['longestStreak'] ?? 0) as num).toInt(),
      onboardingDone: (m['onboardingDone'] ?? false) as bool,
      lastActiveAt: m['lastActiveAt'],
      raw: m,
    );
  }
}
