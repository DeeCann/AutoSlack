package com.autoslack.data.model

data class QrCodeResponse(
    val token: String,
    val loginUrl: String,
    val expiresIn: Int
)

data class QrStatusResponse(
    val status: String,
    val errorMessage: String?,
    val accessToken: String?
)
