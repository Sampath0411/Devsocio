import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../core/theme.dart';

class Avatar extends StatelessWidget {
  final String url;
  final double size;
  final bool founderRing;
  final bool online;
  const Avatar({
    super.key,
    required this.url,
    this.size = 40,
    this.founderRing = false,
    this.online = false,
  });

  @override
  Widget build(BuildContext context) {
    Widget img = ClipOval(
      child: url.isEmpty
          ? Container(
              width: size,
              height: size,
              color: AppColors.surfaceAlt,
              child: Icon(Icons.person, size: size * 0.6, color: AppColors.textMuted),
            )
          : CachedNetworkImage(
              imageUrl: url,
              width: size,
              height: size,
              fit: BoxFit.cover,
              placeholder: (_, __) =>
                  Container(width: size, height: size, color: AppColors.surfaceAlt),
              errorWidget: (_, __, ___) => Container(
                width: size,
                height: size,
                color: AppColors.surfaceAlt,
                child: Icon(Icons.person,
                    size: size * 0.6, color: AppColors.textMuted),
              ),
            ),
    );

    if (founderRing) {
      img = Container(
        padding: const EdgeInsets.all(2),
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(colors: [AppColors.gold, AppColors.warning]),
        ),
        child: img,
      );
    }

    if (!online) return img;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        img,
        Positioned(
          right: 0,
          bottom: 0,
          child: Container(
            width: size * 0.28,
            height: size * 0.28,
            decoration: BoxDecoration(
              color: AppColors.success,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.bg, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}
