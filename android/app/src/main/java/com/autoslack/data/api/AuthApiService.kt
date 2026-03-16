package com.autoslack.data.api

import com.autoslack.data.model.QrCodeResponse
import com.autoslack.data.model.QrStatusResponse
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface AuthApiService {

    @GET("api/auth/qr-code")
    suspend fun getQrCode(): QrCodeResponse

    @GET("api/auth/qr-status/{token}")
    suspend fun getQrStatus(@Path("token") token: String): QrStatusResponse

    @POST("api/auth/logout")
    suspend fun logout(): Map<String, Any>
}
