/// Runtime configuration. Pass overrides at build time with --dart-define, e.g.
///   flutter run --dart-define=API_BASE=https://devsocio.vercel.app \
///               --dart-define=CLOUDINARY_CLOUD=xxx \
///               --dart-define=CLOUDINARY_PRESET=yyy
///
/// API_BASE must point at the deployed web app that hosts the Vercel /api/*
/// serverless functions (credits, ai, agent). The mobile client never holds the
/// OpenRouter or Firebase-admin keys — those stay server-side, exactly like web.
class Env {
  /// Base URL of the deployed DevSocio web app (hosts /api/* on Vercel).
  static const apiBase = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'https://devsocio.vercel.app',
  );

  static const cloudinaryCloud =
      String.fromEnvironment('CLOUDINARY_CLOUD', defaultValue: '');
  static const cloudinaryPreset =
      String.fromEnvironment('CLOUDINARY_PRESET', defaultValue: '');

  static bool get cloudinaryEnabled =>
      cloudinaryCloud.isNotEmpty && cloudinaryPreset.isNotEmpty;

  static String get creditsUrl => '$apiBase/api/credits';
  static String get aiUrl => '$apiBase/api/ai';
  static String get agentUrl => '$apiBase/api/agent';
}
