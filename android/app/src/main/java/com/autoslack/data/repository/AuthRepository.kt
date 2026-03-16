package com.autoslack.data.repository

import com.autoslack.data.api.AuthApiService
import com.autoslack.data.model.QrCodeResponse
import com.autoslack.data.model.QrStatusResponse
import com.autoslack.util.TokenStorage
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApiService,
    private val tokenStorage: TokenStorage
) {
    fun isLoggedIn(): Boolean = tokenStorage.hasToken()

    fun getToken(): String? = tokenStorage.getToken()

    fun getBearerToken(): String = "Bearer ${tokenStorage.getToken()}"

    suspend fun requestQrCode(): QrCodeResponse {
        return authApi.getQrCode()
    }

    suspend fun pollQrStatus(token: String): QrStatusResponse {
        return authApi.getQrStatus(token)
    }

    fun saveToken(accessToken: String) {
        tokenStorage.saveToken(accessToken)
    }

    fun saveUserInfo(userId: String, teamName: String) {
        tokenStorage.saveUserInfo(userId, teamName)
    }

    fun getUserId(): String? = tokenStorage.getUserId()

    fun getTeamName(): String? = tokenStorage.getTeamName()

    suspend fun logout() {
        try {
            authApi.logout()
        } catch (_: Exception) {}
        tokenStorage.clearAll()
    }
}
