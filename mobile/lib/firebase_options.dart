// Firebase config for DevSocio — points at the SAME project as the web app
// (devsocio-8f0c0), so data syncs in real time across web and mobile.
//
// The projectId/apiKey below are the public web-tier values (safe to ship;
// access is gated by Firestore Security Rules). For production Android/iOS
// builds and native Google Sign-In, run `flutterfire configure` once to
// register platform apps (adds google-services.json / GoogleService-Info.plist
// and regenerates this file with per-platform appIds + SHA keys).
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return web;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyCp0aAVeKzptv4HqSicEghuX8KEP4rVjFQ',
    authDomain: 'devsocio-8f0c0.firebaseapp.com',
    projectId: 'devsocio-8f0c0',
    storageBucket: 'devsocio-8f0c0.firebasestorage.app',
    messagingSenderId: '340656300838',
    appId: '1:340656300838:web:43b7a0334098736e1057e7',
    measurementId: 'G-9K4M5GTKC1',
  );

  // Android values from google-services.json (the registered Android app).
  // The appId MUST be the android: variant — using the web: appId here makes
  // Firebase.initializeApp() throw at startup (black screen in release).
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDUtaGvYM6nZVcA28hx0zK3QeYfjMG7joA',
    appId: '1:340656300838:android:2e307ebcc171971d1057e7',
    messagingSenderId: '340656300838',
    projectId: 'devsocio-8f0c0',
    storageBucket: 'devsocio-8f0c0.firebasestorage.app',
  );

  // iOS not yet registered — reuse the Android app values so the Dart code
  // compiles. Register an iOS app + GoogleService-Info.plist before iOS builds.
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDUtaGvYM6nZVcA28hx0zK3QeYfjMG7joA',
    appId: '1:340656300838:android:2e307ebcc171971d1057e7',
    messagingSenderId: '340656300838',
    projectId: 'devsocio-8f0c0',
    storageBucket: 'devsocio-8f0c0.firebasestorage.app',
    iosBundleId: 'com.devsocio.devsocio',
  );
}
