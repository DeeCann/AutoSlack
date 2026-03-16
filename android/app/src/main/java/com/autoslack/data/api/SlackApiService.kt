package com.autoslack.data.api

import com.autoslack.data.model.SlackAuthTestResponse
import com.autoslack.data.model.SlackConversationsResponse
import com.autoslack.data.model.SlackMessagesResponse
import com.autoslack.data.model.SlackPostMessageResponse
import com.autoslack.data.model.SlackUserInfoResponse
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Query

interface SlackApiService {

    @GET("conversations.list")
    suspend fun getConversations(
        @Header("Authorization") token: String,
        @Query("types") types: String = "public_channel,private_channel,mpim,im",
        @Query("limit") limit: Int = 50,
        @Query("exclude_archived") excludeArchived: Boolean = true
    ): SlackConversationsResponse

    @GET("conversations.history")
    suspend fun getMessages(
        @Header("Authorization") token: String,
        @Query("channel") channelId: String,
        @Query("limit") limit: Int = 30
    ): SlackMessagesResponse

    @FormUrlEncoded
    @POST("chat.postMessage")
    suspend fun postMessage(
        @Header("Authorization") token: String,
        @Field("channel") channel: String,
        @Field("text") text: String
    ): SlackPostMessageResponse

    @GET("users.info")
    suspend fun getUserInfo(
        @Header("Authorization") token: String,
        @Query("user") userId: String
    ): SlackUserInfoResponse

    @GET("auth.test")
    suspend fun authTest(
        @Header("Authorization") token: String
    ): SlackAuthTestResponse
}
