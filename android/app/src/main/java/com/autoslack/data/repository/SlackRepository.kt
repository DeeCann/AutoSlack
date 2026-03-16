package com.autoslack.data.repository

import com.autoslack.data.api.SlackApiService
import com.autoslack.data.model.Conversation
import com.autoslack.data.model.ConversationType
import com.autoslack.data.model.Message
import com.autoslack.data.model.Participant
import com.autoslack.util.TokenStorage
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SlackRepository @Inject constructor(
    private val slackApi: SlackApiService,
    private val tokenStorage: TokenStorage
) {
    private val userCache = mutableMapOf<String, Pair<String, String?>>()

    private fun bearer(): String = "Bearer ${tokenStorage.getToken()}"

    private fun currentUserId(): String = tokenStorage.getUserId() ?: ""

    suspend fun verifyToken(): Boolean {
        return try {
            val response = slackApi.authTest(bearer())
            if (response.ok && response.userId != null) {
                tokenStorage.saveUserInfo(
                    response.userId,
                    response.team ?: ""
                )
                true
            } else false
        } catch (_: Exception) {
            false
        }
    }

    suspend fun getConversations(): List<Conversation> {
        val response = slackApi.getConversations(bearer())
        if (!response.ok || response.channels == null) return emptyList()

        return response.channels.mapNotNull { ch ->
            val id = ch.id ?: return@mapNotNull null
            val type = ConversationType.fromSlackChannel(ch)

            val name = when (type) {
                ConversationType.DM -> {
                    val userId = ch.user ?: ""
                    resolveUserName(userId)
                }
                else -> ch.name ?: "unknown"
            }

            val imageUrl = when (type) {
                ConversationType.DM -> {
                    val userId = ch.user ?: ""
                    resolveUserImage(userId)
                }
                else -> null
            }

            Conversation(
                id = id,
                name = name,
                type = type,
                snippet = ch.topic?.value,
                unreadCount = 0,
                imageUrl = imageUrl,
                timestamp = null,
                isGroup = type == ConversationType.GROUP,
                participants = if (type == ConversationType.DM && ch.user != null) {
                    listOf(Participant(ch.user, name, imageUrl))
                } else emptyList()
            )
        }.sortedWith(
            compareBy<Conversation> {
                when (it.type) {
                    ConversationType.CHANNEL -> 0
                    ConversationType.DM -> 1
                    ConversationType.GROUP -> 2
                }
            }.thenBy { it.name.lowercase() }
        )
    }

    suspend fun getMessages(channelId: String, limit: Int = 30): List<Message> {
        val response = slackApi.getMessages(bearer(), channelId, limit)
        if (!response.ok || response.messages == null) return emptyList()

        return response.messages
            .filter { it.subtype == null || it.subtype == "me_message" }
            .map { msg ->
                val senderId = msg.user ?: ""
                val senderName = resolveUserName(senderId)
                val senderImage = resolveUserImage(senderId)
                val ts = msg.ts ?: "0"

                Message(
                    id = ts,
                    body = msg.text,
                    timestamp = ts,
                    senderId = senderId,
                    senderName = senderName,
                    senderImage = senderImage,
                    isOwn = senderId == currentUserId()
                )
            }
            .reversed()
    }

    suspend fun sendMessage(channelId: String, text: String): Boolean {
        return try {
            val response = slackApi.postMessage(bearer(), channelId, text)
            response.ok
        } catch (_: Exception) {
            false
        }
    }

    private suspend fun resolveUserName(userId: String): String {
        if (userId.isBlank()) return "Unknown"
        userCache[userId]?.let { return it.first }
        return fetchAndCacheUser(userId).first
    }

    private suspend fun resolveUserImage(userId: String): String? {
        if (userId.isBlank()) return null
        userCache[userId]?.let { return it.second }
        return fetchAndCacheUser(userId).second
    }

    private suspend fun fetchAndCacheUser(userId: String): Pair<String, String?> {
        return try {
            val response = slackApi.getUserInfo(bearer(), userId)
            if (response.ok && response.user != null) {
                val name = response.user.profile?.displayName?.takeIf { it.isNotBlank() }
                    ?: response.user.profile?.realName
                    ?: response.user.realName
                    ?: response.user.name
                    ?: "Unknown"
                val image = response.user.profile?.image72 ?: response.user.profile?.image192
                val result = name to image
                userCache[userId] = result
                result
            } else {
                val fallback = "user-$userId" to null
                userCache[userId] = fallback
                fallback
            }
        } catch (_: Exception) {
            val fallback = "user-$userId" to null
            userCache[userId] = fallback
            fallback
        }
    }
}
