package com.autoslack.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autoslack.data.model.Conversation
import com.autoslack.data.repository.AuthRepository
import com.autoslack.data.repository.SlackRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardState(
    val conversations: List<Conversation> = emptyList(),
    val isLoading: Boolean = true,
    val selectedConversationId: String? = null,
    val teamName: String = "Slack",
    val error: String? = null
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val slackRepository: SlackRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(DashboardState())
    val state: StateFlow<DashboardState> = _state.asStateFlow()

    init {
        _state.value = _state.value.copy(teamName = authRepository.getTeamName() ?: "Slack")
        loadConversations()
        startConversationPolling()
    }

    fun selectConversation(id: String) {
        _state.value = _state.value.copy(selectedConversationId = id)
    }

    fun loadConversations() {
        viewModelScope.launch {
            try {
                val conversations = slackRepository.getConversations()
                _state.value = _state.value.copy(
                    conversations = conversations,
                    isLoading = false,
                    error = null
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = e.message
                )
            }
        }
    }

    private fun startConversationPolling() {
        viewModelScope.launch {
            while (true) {
                delay(30_000)
                try {
                    val conversations = slackRepository.getConversations()
                    _state.value = _state.value.copy(conversations = conversations)
                } catch (_: Exception) {}
            }
        }
    }

    fun logout(onLogout: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onLogout()
        }
    }
}
