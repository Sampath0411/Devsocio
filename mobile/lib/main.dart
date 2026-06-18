import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';

import 'firebase_options.dart';
import 'src/app.dart';
import 'src/core/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Surface any uncaught Flutter error as a visible screen rather than a silent
  // black screen in release builds.
  ErrorWidget.builder = (details) => _FatalScreen(message: '${details.exception}');

  try {
    // If the native google-services plugin already created the default app,
    // reuse it instead of throwing a duplicate-app error.
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    }
  } catch (e) {
    runApp(_FatalApp(message: 'Firebase init failed:\n$e'));
    return;
  }

  runApp(const ProviderScope(child: DevSocioApp()));
}

class _FatalApp extends StatelessWidget {
  final String message;
  const _FatalApp({required this.message});
  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.dark,
        home: _FatalScreen(message: message),
      );
}

class _FatalScreen extends StatelessWidget {
  final String message;
  const _FatalScreen({required this.message});
  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.bg,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline,
                    color: AppColors.danger, size: 48),
                const SizedBox(height: 16),
                Text(message,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.textPrimary)),
              ],
            ),
          ),
        ),
      );
}
