import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/app_user.dart';
import '../models/post.dart';
import 'firebase_providers.dart';

/// Extract #hashtags → unique, lower-cased, with leading '#'.
List<String> parseHashtags(String text) {
  final matches = RegExp(r'#[\p{L}\p{N}_]+', unicode: true).allMatches(text);
  return matches.map((m) => m.group(0)!.toLowerCase()).toSet().toList();
}

/// Extract @mentions → unique lowercase handles (no @).
List<String> parseMentions(String text) {
  final matches = RegExp(r'@([a-zA-Z0-9_]+)').allMatches(text);
  return matches.map((m) => m.group(1)!.toLowerCase()).toSet().toList();
}

class PostRepository {
  final FirebaseFirestore _db;
  PostRepository(this._db);

  CollectionReference<Map<String, dynamic>> get _posts =>
      _db.collection('posts');

  Stream<List<Post>> watchFeed() => _posts
      .orderBy('createdAt', descending: true)
      .limit(50)
      .snapshots()
      .map((s) => s.docs.map((d) => Post.fromMap(d.id, d.data())).toList());

  Stream<List<Post>> watchUserPosts(String uid) => _posts
      .where('authorUid', isEqualTo: uid)
      .limit(50)
      .snapshots()
      .map((s) {
        final list = s.docs.map((d) => Post.fromMap(d.id, d.data())).toList();
        list.sort((a, b) => b.createdAtDate
                ?.compareTo(a.createdAtDate ?? DateTime(0)) ??
            0);
        return list;
      });

  Stream<Post?> watchPost(String postId) => _posts
      .doc(postId)
      .snapshots()
      .map((d) => d.exists ? Post.fromMap(d.id, d.data()!) : null);

  Future<String> createPost(Map<String, dynamic> post) async {
    final ref = await _posts.add({
      'likes': 0,
      'commentsCount': 0,
      ...post,
      'createdAt': FieldValue.serverTimestamp(),
    });
    final authorUid = post['authorUid'] as String?;
    if (authorUid != null) {
      await _db
          .collection('users')
          .doc(authorUid)
          .update({'postsCount': FieldValue.increment(1)}).catchError((_) {});
    }
    return ref.id;
  }

  /// Quote-repost: embeds a snapshot of the original.
  Future<String> repost(Post original, AppUser me, String quote) {
    final snapshot = {
      'postId': original.postId,
      'type': original.type,
      'content': original.content.length > 280
          ? original.content.substring(0, 280)
          : original.content,
      'author': original.author.toMap(),
      'imageUrl': original.imageUrl,
    };
    return createPost({
      'authorUid': me.uid,
      'author': me.asAuthor.toMap(),
      'type': original.type,
      'content': quote.trim(),
      'hashtags': parseHashtags(quote),
      'tags': me.techStack.take(2).toList(),
      'repostOf': snapshot,
    });
  }

  Future<void> deletePost(String postId) async {
    final snap = await _posts.doc(postId).get();
    final authorUid = snap.data()?['authorUid'] as String?;
    await _posts.doc(postId).delete();
    if (authorUid != null) {
      // Decrement postsCount but never below 0 (a plain increment(-1) can drive
      // the counter negative when it's already 0).
      final userRef = _db.collection('users').doc(authorUid);
      await _db.runTransaction((tx) async {
        final u = await tx.get(userRef);
        final current = ((u.data()?['postsCount'] ?? 0) as num).toInt();
        tx.update(userRef, {'postsCount': current > 0 ? current - 1 : 0});
      }).catchError((_) {});
    }
  }

  // --- Likes ---
  Future<void> setLike(String postId, String uid, bool liked) async {
    final likeRef = _posts.doc(postId).collection('likes').doc(uid);
    if (liked) {
      await likeRef.set({'uid': uid, 'createdAt': FieldValue.serverTimestamp()});
      await _posts.doc(postId).update({'likes': FieldValue.increment(1)});
    } else {
      await likeRef.delete();
      await _posts.doc(postId).update({'likes': FieldValue.increment(-1)});
    }
  }

  Stream<Set<String>> watchMyLikes(String uid) => _db
      .collectionGroup('likes')
      .where('uid', isEqualTo: uid)
      .snapshots()
      .map((s) {
        final ids = <String>{};
        for (final d in s.docs) {
          // likes/{uid} directly under a post → parent.parent is the post.
          final parent = d.reference.parent.parent;
          if (parent != null && parent.parent.id == 'posts') ids.add(parent.id);
        }
        return ids;
      });

  // --- Comments ---
  Stream<List<Comment>> watchComments(String postId) => _posts
      .doc(postId)
      .collection('comments')
      .orderBy('createdAt')
      .snapshots()
      .map((s) => s.docs.map((d) => Comment.fromMap(d.id, d.data())).toList());

  Future<String> addComment(String postId, Map<String, dynamic> comment) async {
    final ref = await _posts.doc(postId).collection('comments').add({
      'likesCount': 0,
      'parentId': null,
      ...comment,
      'createdAt': FieldValue.serverTimestamp(),
    });
    await _posts
        .doc(postId)
        .update({'commentsCount': FieldValue.increment(1)}).catchError((_) {});
    return ref.id;
  }

  Future<void> setCommentLike(
      String postId, String commentId, String uid, bool liked) async {
    final cRef = _posts.doc(postId).collection('comments').doc(commentId);
    final likeRef = cRef.collection('likes').doc(uid);
    if (liked) {
      await likeRef.set({'uid': uid, 'createdAt': FieldValue.serverTimestamp()});
      await cRef.update({'likesCount': FieldValue.increment(1)});
    } else {
      await likeRef.delete();
      await cRef.update({'likesCount': FieldValue.increment(-1)});
    }
  }
}

final postRepositoryProvider =
    Provider<PostRepository>((ref) => PostRepository(ref.watch(firestoreProvider)));

final feedProvider = StreamProvider<List<Post>>(
    (ref) => ref.watch(postRepositoryProvider).watchFeed());

final myLikesProvider = StreamProvider<Set<String>>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return Stream.value(const {});
  return ref.watch(postRepositoryProvider).watchMyLikes(auth.uid);
});

final postProvider =
    StreamProvider.family<Post?, String>((ref, postId) =>
        ref.watch(postRepositoryProvider).watchPost(postId));

final commentsProvider =
    StreamProvider.family<List<Comment>, String>((ref, postId) =>
        ref.watch(postRepositoryProvider).watchComments(postId));

final userPostsProvider =
    StreamProvider.family<List<Post>, String>((ref, uid) =>
        ref.watch(postRepositoryProvider).watchUserPosts(uid));
