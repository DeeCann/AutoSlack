-keepattributes Signature
-keepattributes *Annotation*

-keep class com.autoslack.data.model.** { *; }

-dontwarn okhttp3.**
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
