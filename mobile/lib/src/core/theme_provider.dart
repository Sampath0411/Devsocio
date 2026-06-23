import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'theme.dart';

/// Theme mode options for the app.
enum AppThemeMode {
  dark,       // Current near-black dark theme
  light,      // Light/white theme
  pureBlack,  // True AMOLED black (#000000) backgrounds
}

/// Provider that persists and restores the selected theme mode.
final themeModeProvider =
    StateNotifierProvider<ThemeModeNotifier, AppThemeMode>((ref) {
  return ThemeModeNotifier();
});

class ThemeModeNotifier extends StateNotifier<AppThemeMode> {
  ThemeModeNotifier() : super(AppThemeMode.dark) {
    _load();
  }

  static const _key = 'app_theme_mode';

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_key) ?? 'dark';
    state = AppThemeMode.values.firstWhere(
      (m) => m.name == stored,
      orElse: () => AppThemeMode.dark,
    );
  }

  Future<void> setMode(AppThemeMode mode) async {
    state = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, mode.name);
  }
}

/// Builds a [ThemeData] for the given [AppThemeMode].
ThemeData buildThemeFor(AppThemeMode mode) {
  switch (mode) {
    case AppThemeMode.dark:
      return AppTheme.dark;
    case AppThemeMode.light:
      return _lightTheme();
    case AppThemeMode.pureBlack:
      return _pureBlackTheme();
  }
}

// ─── LIGHT THEME ─────────────────────────────────────

ThemeData _lightTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    brightness: Brightness.light,
  ).copyWith(
    primary: AppColors.primary,
    secondary: AppColors.accent,
    error: AppColors.danger,
  );

  final textTheme = GoogleFonts.interTextTheme(ThemeData.light(useMaterial3: true).textTheme).apply(
    bodyColor: const Color(0xFF1A1A2E),
    displayColor: const Color(0xFF1A1A2E),
  );

  return ThemeData.light(useMaterial3: true).copyWith(
    scaffoldBackgroundColor: const Color(0xFFF5F5FA),
    colorScheme: scheme,
    textTheme: textTheme,
    primaryColor: AppColors.primary,
    dividerColor: const Color(0xFFE0E0E8),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      titleTextStyle: GoogleFonts.spaceGrotesk(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: const Color(0xFF1A1A2E),
      ),
      iconTheme: const IconThemeData(color: Color(0xFF1A1A2E)),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE8E8F0)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFF0F0F6),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFD0D0DC)),
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
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: AppColors.primary.withValues(alpha: 0.15),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF1A1A2E)),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}

// ─── PURE BLACK (AMOLED) THEME ───────────────────────

ThemeData _pureBlackTheme() {
  const black = Color(0xFF000000);
  const white10 = Color(0xFF1A1A1A);

  final scheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    brightness: Brightness.dark,
  ).copyWith(
    primary: AppColors.primary,
    secondary: AppColors.accent,
    surface: black,
    error: AppColors.danger,
  );

  final textTheme = GoogleFonts.interTextTheme(ThemeData.dark(useMaterial3: true).textTheme).apply(
    bodyColor: Colors.white,
    displayColor: Colors.white,
  );

  return ThemeData.dark(useMaterial3: true).copyWith(
    scaffoldBackgroundColor: black,
    colorScheme: scheme,
    textTheme: textTheme,
    primaryColor: AppColors.primary,
    dividerColor: white10,
    appBarTheme: AppBarTheme(
      backgroundColor: black,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      titleTextStyle: GoogleFonts.spaceGrotesk(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: Colors.white,
      ),
      iconTheme: const IconThemeData(color: Colors.white),
    ),
    cardTheme: CardThemeData(
      color: white10,
      elevation: 0,
      shadowColor: Colors.black45,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide.none,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: white10,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF2A2A2A)),
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
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: black,
      indicatorColor: AppColors.primary.withValues(alpha: 0.2),
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
