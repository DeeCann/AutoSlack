package com.autoslack.data.model

data class Conversation(
    val id: String,
    val name: String,
    val type: ConversationType,
    val snippet: String?,
    val unreadCount: Int,
    val imageUrl: String?,
    val timestamp: String?,
    val isGroup: Boolean,
    val participants: List<Participant>
)

data class Participant(
    val id: String,
    val name: String,
    val imageUrl: String?
)

enum class ConversationType {
    CHANNEL, DM, GROUP;

    companion object {
        fun fromSlackChannel(channel: SlackChannel): ConversationType {
            return when {
                channel.isIm == true -> DM
                channel.isMpim == true -> GROUP
                else -> CHANNEL
            }
        }
    }
}
