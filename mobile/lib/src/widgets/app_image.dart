import 'dart:convert';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// Returns an ImageProvider for either a `data:` URI (image stored in Firestore
/// as base64) or an http(s) URL. Null for empty/invalid input.
ImageProvider? smartImageProvider(String? url) {
  if (url == null || url.isEmpty) return null;
  if (url.startsWith('data:')) {
    final comma = url.indexOf(',');
    if (comma == -1) return null;
    try {
      return MemoryImage(base64Decode(url.substring(comma + 1)));
    } catch (_) {
      return null;
    }
  }
  if (url.startsWith('http')) return CachedNetworkImageProvider(url);
  return null;
}

/// A universal image widget that handles both `data:` URIs (base64 stored in
/// Firestore) and http(s) URLs (Cloudinary, pasted links, etc.).
///
/// Features:
/// - Automatic URL type detection
/// - Animated loading placeholder with shimmer
/// - Smooth fade-in on image load
/// - Error fallback with icon
/// - Circular clip option for avatars
class SmartImage extends StatefulWidget {
  final String? url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final double borderRadius;
  final bool isAvatar;
  final Widget Function()? placeholder;
  final Widget Function()? errorWidget;
  final Color? backgroundColor;

  const SmartImage({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius = 0,
    this.isAvatar = false,
    this.placeholder,
    this.errorWidget,
    this.backgroundColor,
  });

  @override
  State<SmartImage> createState() => _SmartImageState();
}

class _SmartImageState extends State<SmartImage>
    with SingleTickerProviderStateMixin {
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  bool _imageLoaded = false;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeInOut,
    );
  }

  @override
  void didUpdateWidget(SmartImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url) {
      _imageLoaded = false;
      _fadeController.reset();
    }
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  void _onImageLoaded() {
    if (!_imageLoaded && mounted) {
      _imageLoaded = true;
      _fadeController.forward();
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = smartImageProvider(widget.url);
    if (provider == null) {
      return _buildPlaceholder();
    }

    Widget imageWidget;

    if (widget.url!.startsWith('http')) {
      imageWidget = CachedNetworkImage(
        imageUrl: widget.url!,
        width: widget.width,
        height: widget.height,
        fit: widget.fit,
        fadeInDuration: const Duration(milliseconds: 300),
        fadeOutDuration: const Duration(milliseconds: 200),
        placeholder: (_, __) => _buildShimmerPlaceholder(),
        errorWidget: (_, __, ___) => _buildErrorWidget(),
      );
    } else if (widget.url!.startsWith('data:')) {
      imageWidget = Image(
        image: provider,
        width: widget.width,
        height: widget.height,
        fit: widget.fit,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => _buildErrorWidget(),
        frameBuilder: (_, child, frame, wasSync) {
          _onImageLoaded();
          if (wasSync || frame != null) {
            return FadeTransition(
              opacity: _fadeAnimation,
              child: child,
            );
          }
          return _buildShimmerPlaceholder();
        },
      );
    } else {
      imageWidget = _buildPlaceholder();
    }

    if (widget.isAvatar) {
      return ClipOval(child: imageWidget);
    }

    if (widget.borderRadius > 0) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(widget.borderRadius),
        child: imageWidget,
      );
    }

    return imageWidget;
  }

  Widget _buildShimmerPlaceholder() {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 800),
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: widget.backgroundColor ?? const Color(0xFF1C1C28),
        borderRadius: widget.isAvatar
            ? null
            : BorderRadius.circular(widget.borderRadius > 0 ? widget.borderRadius : 4),
        shape: widget.isAvatar ? BoxShape.circle : BoxShape.rectangle,
      ),
      child: _ShimmerEffect(
        child: Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.03),
            borderRadius: widget.isAvatar
                ? null
                : BorderRadius.circular(widget.borderRadius > 0 ? widget.borderRadius : 4),
            shape: widget.isAvatar ? BoxShape.circle : BoxShape.rectangle,
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    final size = widget.width ?? widget.height ?? 40;
    return Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: widget.backgroundColor ?? const Color(0xFF1C1C28),
        borderRadius: widget.isAvatar
            ? null
            : BorderRadius.circular(widget.borderRadius > 0 ? widget.borderRadius : 4),
        shape: widget.isAvatar ? BoxShape.circle : BoxShape.rectangle,
      ),
      child: widget.placeholder?.call() ??
          Icon(
            widget.isAvatar ? Icons.person : Icons.image_outlined,
            size: size * 0.4,
            color: const Color(0xFF9A9AB0),
          ),
    );
  }

  Widget _buildErrorWidget() {
    final size = widget.width ?? widget.height ?? 40;
    return Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: widget.backgroundColor ?? const Color(0xFF1C1C28),
        borderRadius: widget.isAvatar
            ? null
            : BorderRadius.circular(widget.borderRadius > 0 ? widget.borderRadius : 4),
        shape: widget.isAvatar ? BoxShape.circle : BoxShape.rectangle,
      ),
      child: widget.errorWidget?.call() ??
          Icon(
            widget.isAvatar ? Icons.person : Icons.broken_image_outlined,
            size: size * 0.4,
            color: const Color(0xFF9A9AB0),
          ),
    );
  }
}

/// A subtle shimmer/scanline effect for loading states.
class _ShimmerEffect extends StatefulWidget {
  final Widget child;
  const _ShimmerEffect({required this.child});

  @override
  State<_ShimmerEffect> createState() => _ShimmerEffectState();
}

class _ShimmerEffectState extends State<_ShimmerEffect>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    _animation = Tween<double>(begin: -0.5, end: 2.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutSine),
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
      animation: _animation,
      builder: (_, child) => ShaderMask(
        shaderCallback: (bounds) => LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: const [
            Colors.transparent,
            Colors.white10,
            Colors.white24,
            Colors.white10,
            Colors.transparent,
          ],
          stops: [
            (_animation.value - 0.4).clamp(0.0, 1.0),
            (_animation.value - 0.2).clamp(0.0, 1.0),
            _animation.value.clamp(0.0, 1.0),
            (_animation.value + 0.2).clamp(0.0, 1.0),
            (_animation.value + 0.4).clamp(0.0, 1.0),
          ],
        ).createShader(bounds),
        blendMode: BlendMode.srcOver,
        child: child!,
      ),
      child: widget.child,
    );
  }
}
