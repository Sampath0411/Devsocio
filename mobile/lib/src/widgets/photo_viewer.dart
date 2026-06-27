import 'package:flutter/material.dart';
import '../core/theme.dart';
import 'app_image.dart';

/// Instagram-style full-screen image viewer with smooth open/close transitions.
/// Pass [isAvatar] = true to show profile photos as a circle (like Instagram).
void openPhoto(BuildContext context, String url,
    {String heroTag = '', bool isAvatar = false}) {
  if (url.isEmpty) return;
  Navigator.of(context).push(PageRouteBuilder(
    opaque: false,
    barrierColor: Colors.transparent,
    pageBuilder: (_, __, ___) =>
        _PhotoViewer(url: url, heroTag: heroTag, isAvatar: isAvatar),
    transitionsBuilder: (_, anim, __, child) {
      return FadeTransition(
        opacity: anim,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.92, end: 1.0).animate(
            CurvedAnimation(parent: anim, curve: Curves.easeOutBack),
          ),
          child: child,
        ),
      );
    },
    transitionDuration: const Duration(milliseconds: 350),
    reverseTransitionDuration: const Duration(milliseconds: 250),
  ));
}

class _PhotoViewer extends StatelessWidget {
  final String url;
  final String heroTag;
  final bool isAvatar;
  const _PhotoViewer({
    required this.url,
    required this.heroTag,
    required this.isAvatar,
  });

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final avatarDiam = size.width * 0.72;

    Widget content = isAvatar
        ? Container(
            width: avatarDiam,
            height: avatarDiam,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [AppColors.primary, AppColors.accent],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.4),
                  blurRadius: 40,
                  spreadRadius: 10,
                ),
              ],
            ),
            child: SmartImage(
              url: url,
              width: avatarDiam,
              height: avatarDiam,
              isAvatar: true,
              backgroundColor: Colors.black,
            ),
          )
        : InteractiveViewer(
            minScale: 0.5,
            maxScale: 5,
            boundaryMargin: const EdgeInsets.all(80),
            child: SmartImage(
              url: url,
              fit: BoxFit.contain,
              backgroundColor: Colors.transparent,
            ),
          );

    if (heroTag.isNotEmpty) {
      content = Hero(tag: heroTag, child: content);
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.black87,
              Colors.black,
              Colors.black87,
            ],
          ),
        ),
        child: GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          behavior: HitTestBehavior.opaque,
          child: Stack(
            children: [
              Center(child: content),
              Positioned(
                top: MediaQuery.of(context).padding.top + 8,
                right: 8,
                child: Material(
                  color: Colors.black26,
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: () => Navigator.of(context).pop(),
                    child: const Padding(
                      padding: EdgeInsets.all(8),
                      child: Icon(Icons.close, color: Colors.white, size: 24),
                    ),
                  ),
                ),
              ),
              // Swipe down hint
              Positioned(
                top: MediaQuery.of(context).padding.top + 12,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white30,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
