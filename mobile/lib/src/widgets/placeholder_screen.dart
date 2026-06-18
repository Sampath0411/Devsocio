import 'package:flutter/material.dart';
import '../core/theme.dart';

/// Temporary scaffold used by screens not yet implemented in later phases.
class PlaceholderScreen extends StatelessWidget {
  final String title;
  final IconData icon;
  final String phase;
  const PlaceholderScreen({
    super.key,
    required this.title,
    required this.icon,
    required this.phase,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: AppColors.primary),
            const SizedBox(height: 16),
            Text(title, style: AppTheme.brandTitle),
            const SizedBox(height: 8),
            Text('Coming in $phase',
                style: const TextStyle(color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}
