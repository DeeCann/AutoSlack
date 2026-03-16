package com.autoslack.util

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenStorage @Inject constructor(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "autoslack_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun hasToken(): Boolean = getToken() != null

    fun saveUserInfo(userId: String, teamName: String) {
        prefs.edit()
            .putString(KEY_USER_ID, userId)
            .putString(KEY_TEAM_NAME, teamName)
            .apply()
    }

    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    fun getTeamName(): String? = prefs.getString(KEY_TEAM_NAME, null)

    fun clearAll() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_TOKEN = "slack_access_token"
        private const val KEY_USER_ID = "slack_user_id"
        private const val KEY_TEAM_NAME = "slack_team_name"
    }
}
