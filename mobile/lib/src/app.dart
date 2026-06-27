import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme_provider.dart';
import 'router/router.dart';
import 'widgets/lock_screen.dart';

class DevSocioApp extends ConsumerWidget {
  const DevSocioApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);
    return MaterialApp.router(
      title: 'DevSocio',
      debugShowCheckedModeBanner: false,
      theme: buildThemeFor(themeMode),
      routerConfig: router,
      builder: (context, child) {
        return LockScreen(child: child ?? const SizedBox.shrink());
      },
    );
  }
}
