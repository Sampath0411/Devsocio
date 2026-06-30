import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// DevSocio brand palette — matches the web app's Tailwind theme.
///   Primary orange #FCA311 on near-black #000000 background, with
///   Prussian-blue surfaces (#14213D / #1A2B4E / #0D1628).
class AppColors {
  // -- Core palette (web parity) --
  static const orangeWarm = Color(0xFFFCA311); // primary
  static const orangeSoft = Color(0xFFFDB340);
  static const orangeDark = Color(0xFFE8920A);
  static const prussian = Color(0xFF14213D);
  static const prussianHi = Color(0xFF1A2B4E);
  static const prussianDeep = Color(0xFF0D1628);

  // -- Brand primaries --
  static const primary = Color(0xFFFCA311); // Orange — main CTA / accent
  static const accent = Color(0xFFFCA311); // alias

  // -- Semantic colors --
  static const danger = Color(0xFFEF4444);
  static const success = Color(0xFF22C55E);
  static const warning = Color(0xFFFCA311); // Orange doubles as warning
  static const orange = Color(0xFFFCA311);
  static const gold = Color(0xFFFCA311);
  static const goldDark = Color(0xFFE8920A);

  // -- Section-specific accent palettes (orange-forward to match web) --
  // Feed: orange → orange-dark
  static const feedPrimary = Color(0xFFFCA311);
  static const feedSecondary = Color(0xFFE8920A);

  // Explore: prussian → orange
  static const explorePrimary = Color(0xFF14213D);
  static const exploreSecondary = Color(0xFFFCA311);

  // Ideas: orange-soft → orange
  static const ideasPrimary = Color(0xFFFDB340);
  static const ideasSecondary = Color(0xFFFCA311);

  // Messages: prussian-deep → prussian
  static const messagesPrimary = Color(0xFF0D1628);
  static const messagesSecondary = Color(0xFF14213D);

  // Profile: prussian → orange
  static const profilePrimary = Color(0xFF14213D);
  static const profileSecondary = Color(0xFFFCA311);

  // Admin: prussian
  static const adminPrimary = Color(0xFF14213D);
  static const adminSecondary = Color(0xFF1A2B4E);

  // -- Backgrounds & surfaces (web parity: pure black bg, prussian panels) --
  static const bg = Color(0xFF000000); // pure black
  static const surface = Color(0xFF14213D); // prussian panel
  static const surfaceAlt = Color(0xFF1A2B4E); // raised panel
  static const surfaceCard = Color(0xFF14213D);
  static const border = Color(0xFF1E2F4A);
  static const borderLight = Color(0xFF263C60);

  // -- Text (web parity) --
  static const textPrimary = Color(0xFFFFFFFF);
  static const textSecondary = Color(0xFFE5E5E5);
  static const textMuted = Color(0xFFA0ADC0);

  // -- Glass effects --
  static const glassBg = Color(0x1AFFFFFF);
  static const glassBorder = Color(0x33FFFFFF);

  // -- Gradients --
  static const gradientBrand = LinearGradient(
    colors: [primary, accent],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const gradientFeed = LinearGradient(
    colors: [feedPrimary, feedSecondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const gradientExplore = LinearGradient(
    colors: [explorePrimary, exploreSecondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const gradientIdeas = LinearGradient(
    colors: [ideasPrimary, ideasSecondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const gradientMessages = LinearGradient(
    colors: [messagesPrimary, messagesSecondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const gradientProfile = LinearGradient(
    colors: [profilePrimary, profileSecondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const gradientGold = LinearGradient(
    colors: [gold, goldDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

class AppTheme {
  /// Shared text theme (Inter body, Space Grotesk headings, JetBrains Mono code).
  static TextStyle brandTitle(double size) =>
      GoogleFonts.spaceGrotesk(fontSize: size, fontWeight: FontWeight.w800, color: AppColors.textPrimary);

  static TextStyle brandSubtitle(double size) =>
      GoogleFonts.spaceGrotesk(fontSize: size, fontWeight: FontWeight.w700, color: AppColors.textPrimary);

  static TextStyle get mono => GoogleFonts.jetBrainsMono(fontSize: 13, color: AppColors.textPrimary);

  // ---- Base dark theme ----
  static ThemeData _base() {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.dark,
    ).copyWith(
      primary: AppColors.primary,
      secondary: AppColors.accent,
      surface: AppColors.surface,
      error: AppColors.danger,
    );

    final textTheme = GoogleFonts.interTextTheme(ThemeData.dark(useMaterial3: true).textTheme).apply(
      bodyColor: AppColors.textPrimary,
      displayColor: AppColors.textPrimary,
    );

    return ThemeData.dark(useMaterial3: true).copyWith(
      scaffoldBackgroundColor: AppColors.bg,
      colorScheme: scheme,
      textTheme: textTheme,
      primaryColor: AppColors.primary,
      dividerColor: AppColors.border,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.bg,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
        titleTextStyle: GoogleFonts.spaceGrotesk(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfaceCard,
        elevation: 0,
        shadowColor: Colors.black26,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide.none,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceAlt,
        hintStyle: const TextStyle(color: AppColors.textMuted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.primary.withValues(alpha: 0.18),
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  static ThemeData get dark => _base();
}
