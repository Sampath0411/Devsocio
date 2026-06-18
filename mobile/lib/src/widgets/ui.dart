import 'package:flutter/material.dart';
import '../core/theme.dart';

void showToast(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: error ? AppColors.danger : AppColors.surfaceAlt,
      behavior: SnackBarBehavior.floating,
      shape:
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
}

/// Brand gradient wordmark used across auth screens.
class BrandMark extends StatelessWidget {
  final double size;
  const BrandMark({super.key, this.size = 22});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: EdgeInsets.all(size * 0.35),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
                colors: [AppColors.primary, AppColors.accent]),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(Icons.terminal, color: Colors.white, size: size),
        ),
        const SizedBox(width: 10),
        Text('DevSocio',
            style: TextStyle(
                fontSize: size + 4,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary)),
      ],
    );
  }
}

class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  const PrimaryButton(
      {super.key,
      required this.label,
      required this.onPressed,
      this.loading = false});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: loading ? null : onPressed,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: loading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : Text(label),
        ),
      ),
    );
  }
}
