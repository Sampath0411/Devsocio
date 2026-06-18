import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// Instagram-style full-screen, pinch-zoomable image viewer with a hero
/// transition. Open with [openPhoto].
void openPhoto(BuildContext context, String url, {String heroTag = ''}) {
  if (url.isEmpty) return;
  Navigator.of(context).push(PageRouteBuilder(
    opaque: false,
    barrierColor: Colors.black87,
    pageBuilder: (_, __, ___) => _PhotoViewer(url: url, heroTag: heroTag),
    transitionsBuilder: (_, anim, __, child) =>
        FadeTransition(opacity: anim, child: child),
  ));
}

class _PhotoViewer extends StatelessWidget {
  final String url;
  final String heroTag;
  const _PhotoViewer({required this.url, required this.heroTag});

  @override
  Widget build(BuildContext context) {
    final image = InteractiveViewer(
      minScale: 0.8,
      maxScale: 4,
      child: CachedNetworkImage(
        imageUrl: url,
        fit: BoxFit.contain,
        placeholder: (_, __) =>
            const Center(child: CircularProgressIndicator()),
        errorWidget: (_, __, ___) =>
            const Icon(Icons.broken_image, color: Colors.white54, size: 64),
      ),
    );

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            child: Center(
              child: heroTag.isEmpty
                  ? image
                  : Hero(tag: heroTag, child: image),
            ),
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            right: 8,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 28),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
        ],
      ),
    );
  }
}
