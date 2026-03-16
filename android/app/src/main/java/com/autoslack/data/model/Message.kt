package com.autoslack.data.model

data class Message(
    val id: String,
    val body: String?,
    val timestamp: String,
    val senderId: String,
    val senderName: String,
    val senderImage: String?,
    val isOwn: Boolean
)
