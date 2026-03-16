package com.autoslack.di

import android.content.Context
import com.autoslack.data.api.AuthApiService
import com.autoslack.data.api.SlackApiService
import com.autoslack.data.repository.AuthRepository
import com.autoslack.data.repository.SlackRepository
import com.autoslack.util.TokenStorage
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideTokenStorage(@ApplicationContext context: Context): TokenStorage {
        return TokenStorage(context)
    }

    @Provides
    @Singleton
    fun provideAuthRepository(
        authApiService: AuthApiService,
        tokenStorage: TokenStorage
    ): AuthRepository {
        return AuthRepository(authApiService, tokenStorage)
    }

    @Provides
    @Singleton
    fun provideSlackRepository(
        slackApiService: SlackApiService,
        tokenStorage: TokenStorage
    ): SlackRepository {
        return SlackRepository(slackApiService, tokenStorage)
    }
}
