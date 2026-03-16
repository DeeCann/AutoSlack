package com.autoslack.data.model

import com.google.gson.annotations.SerializedName

data class SlackConversationsResponse(
    val ok: Boolean,
    val channels: List<SlackChannel>?,
    val error: String?
)

data class SlackChannel(
    val id: String?,
    val name: String?,
    val user: String?,
    @SerializedName("is_im") val isIm: Boolean?,
    @SerializedName("is_mpim") val isMpim: Boolean?,
    @SerializedName("is_channel") val isChannel: Boolean?,
    @SerializedName("is_group") val isGroup: Boolean?,
    @SerializedName("is_archived") val isArchived: Boolean?,
    val topic: SlackTopic?,
    val purpose: SlackPurpose?,
    @SerializedName("num_members") val numMembers: Int?
)

data class SlackTopic(val value: String?)
data class SlackPurpose(val value: String?)

data class SlackMessagesResponse(
    val ok: Boolean,
    val messages: List<SlackMessage>?,
    val error: String?
)

data class SlackMessage(
    val type: String?,
    val subtype: String?,
    val user: String?,
    val text: String?,
    val ts: String?,
    @SerializedName("bot_id") val botId: String?
)

data class SlackPostMessageRequest(
    val channel: String,
    val text: String
)

data class SlackPostMessageResponse(
    val ok: Boolean,
    val ts: String?,
    val error: String?
)

data class SlackUserInfoResponse(
    val ok: Boolean,
    val user: SlackUser?,
    val error: String?
)

data class SlackUser(
    val id: String?,
    val name: String?,
    @SerializedName("real_name") val realName: String?,
    val profile: SlackProfile?
)

data class SlackProfile(
    @SerializedName("display_name") val displayName: String?,
    @SerializedName("real_name") val realName: String?,
    @SerializedName("image_72") val image72: String?,
    @SerializedName("image_192") val image192: String?
)

data class SlackAuthTestResponse(
    val ok: Boolean,
    @SerializedName("user_id") val userId: String?,
    @SerializedName("team_id") val teamId: String?,
    val team: String?,
    val user: String?,
    val error: String?
)
