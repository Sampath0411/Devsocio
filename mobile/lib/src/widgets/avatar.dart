import 'package:flutter/material.dart';
import '../core/theme.dart';
import 'app_image.dart';
import 'photo_viewer.dart';

class Avatar extends StatelessWidget {
  final String url;
  final double size;
  final bool founderRing;
  final bool online;
  /// When true, tapping opens the photo full-screen (Instagram-style).
  final bool tapToView;
  const Avatar({
    super.key,
    required this.url,
    this.size = 40,
    this.founderRing = false,
    this.online = false,
    this.tapToView = false,
  });

  @override
  Widget build(BuildContext context) {
    final core = _build(context);
    if (!tapToView || url.isEmpty) return core;
    return GestureDetector(
      onTap: () => openPhoto(context, url, heroTag: 'avatar-$url', isAvatar: true),
      child: Hero(tag: 'avatar-$url', child: core),
    );
  }

  Widget _build(BuildContext context) {
    Widget img = SmartImage(
      url: url,
      width: size,
      height: size,
      isAvatar: true,
      backgroundColor: AppColors.surfaceAlt,
    );

    if (founderRing) {
      img = Container(
        padding: const EdgeInsets.all(2.5),
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          gradient: AppColors.gradientGold,
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
          child: _OnlineDot(size: size * 0.28),
        ),
      ],
    );
  }
}

/// Pulsing online indicator dot.
class _OnlineDot extends StatefulWidget {
  final double size;
  const _OnlineDot({required this.size});

  @override
  State<_OnlineDot> createState() => _OnlineDotState();
}

class _OnlineDotState extends State<_OnlineDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _pulse;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _pulse = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulse,
      builder: (_, child) => Transform.scale(
        scale: _pulse.value,
        child: child,
      ),
      child: Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          color: AppColors.success,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.bg, width: 2.5),
          boxShadow: [
            BoxShadow(
              color: AppColors.success.withValues(alpha: 0.5),
              blurRadius: 4,
              spreadRadius: 1,
            ),
          ],
        ),
      ),
    );
  }
}
