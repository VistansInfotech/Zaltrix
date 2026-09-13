# Project-specific ProGuard/R8 rules, appended to proguard-android-optimize.txt.
#
# React Native, ML Kit and the Nitro modules ship their own consumer rules, so
# most of what is needed arrives automatically. What follows covers the parts
# this app reaches through reflection or JNI, which R8 cannot see.

# --- React Native ---------------------------------------------------------
# Native modules and view managers are instantiated by name from C++.
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }
-keep,includedescriptorclasses class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.jni.** { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclasseswithmembernames class * {
    native <methods>;
}

# --- Hermes ---------------------------------------------------------------
-keep class com.facebook.hermes.** { *; }

# --- Nitro modules (VisionCamera, NitroImage, NitroSound, fast-tflite) -----
# Hybrid objects are bound from C++ by class name.
-keep class com.margelo.nitro.** { *; }
-keep class com.mrousavy.camera.** { *; }

# --- ML Kit face detection ------------------------------------------------
# Model wrappers are resolved dynamically from the bundled assets.
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_** { *; }
-dontwarn com.google.mlkit.**

# --- TensorFlow Lite ------------------------------------------------------
# The GPU/NNAPI delegates are looked up reflectively and may be absent.
-keep class org.tensorflow.lite.** { *; }
-dontwarn org.tensorflow.lite.gpu.**

# --- Play Install Referrer ------------------------------------------------
# react-native-device-info reflects on this optional Play library. Without the
# keep, R8 renames it and the app logs "getInstallReferrer will be unavailable"
# on every cold start. Harmless for us, but the capability is simply lost.
-keep class com.android.installreferrer.** { *; }
-dontwarn com.android.installreferrer.**

# --- Keep source line numbers so release stack traces stay readable --------
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
