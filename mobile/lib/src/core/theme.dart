import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// DevSocio brand palette — "Coastal Dev".
///   Space Indigo #222e50 · Cerulean #007991 · Seagrass #439a86
///   Celadon #bcd8c1 · Light Gold #e9d985
class AppColors {
  // -- Core palette --
  static const spaceIndigo = Color(0xFF222E50);
  static const cerulean = Color(0xFF007991);
  static const seagrass = Color(0xFF439A86);
  static const celadon = Color(0xFFBCD8C1);
  static const lightGold = Color(0xFFE9D985);

  // -- Brand primaries --
  static const primary = Color(0xFF007991); // Cerulean
  static const accent = Color(0xFF439A86); // Seagrass

  // -- Semantic colors --
  static const danger = Color(0xFFE2607A);
  static const success = Color(0xFF439A86); // Seagrass
  static const warning = Color(0xFFE9D985); // Light Gold
  static const orange = Color(0xFFE9A85A);
  static const gold = Color(0xFFE9D985);
  static const goldDark = Color(0xFFD4BF5A);

  // -- Section-specific accent palettes (derived from the core palette) --
  // Feed: cerulean → seagrass
  static const feedPrimary = Color(0xFF007991);
  static const feedSecondary = Color(0xFF439A86);

  // Explore: seagrass → celadon
  static const explorePrimary = Color(0xFF439A86);
  static const exploreSecondary = Color(0xFF6FB8A0);

  // Ideas: light gold → warm gold
  static const ideasPrimary = Color(0xFFE9D985);
  static const ideasSecondary = Color(0xFFD4BF5A);

  // Messages: cerulean → deep teal
  static const messagesPrimary = Color(0xFF007991);
  static const messagesSecondary = Color(0xFF0A8FAB);

  // Profile: space indigo → cerulean
  static const profilePrimary = Color(0xFF3A4D7A);
  static const profileSecondary = Color(0xFF007991);

  // Admin: cerulean
  static const adminPrimary = Color(0xFF007991);
  static const adminSecondary = Color(0xFF0A8FAB);

  // -- Backgrounds & surfaces (derived from Space Indigo) --
  static const bg = Color(0xFF0B1020); // near-black navy
  static const surface = Color(0xFF141D33);
  static const surfaceAlt = Color(0xFF1B2742);
  static const surfaceCard = Color(0xFF141D33);
  static const border = Color(0xFF2A3A5C);
  static const borderLight = Color(0xFF364970);

  // -- Text --
  static const textPrimary = Color(0xFFEEF3F8);
  static const textSecondary = Color(0xFFC4D0E0);
  static const textMuted = Color(0xFF8497B4);

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
