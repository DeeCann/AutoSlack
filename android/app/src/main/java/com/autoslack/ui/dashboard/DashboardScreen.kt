package com.autoslack.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.autoslack.ui.chat.ChatPanel
import com.autoslack.ui.sidebar.SidebarPanel

@Composable
fun DashboardScreen(
    onLogout: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        SidebarPanel(
            conversations = state.conversations,
            isLoading = state.isLoading,
            selectedConversationId = state.selectedConversationId,
            teamName = state.teamName,
            onSelectConversation = { viewModel.selectConversation(it) },
            onLogout = { viewModel.logout(onLogout) }
        )

        ChatPanel(
            conversationId = state.selectedConversationId,
            conversationName = state.conversations
                .find { it.id == state.selectedConversationId }?.name
        )
    }
}
