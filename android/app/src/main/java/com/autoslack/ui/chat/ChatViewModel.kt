package com.autoslack.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autoslack.data.model.Message
import com.autoslack.data.repository.SlackRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatState(
    val messages: List<Message> = emptyList(),
    val isLoading: Boolean = false,
    val isSending: Boolean = false,
    val error: String? = null,
    val conversationId: String? = null
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val slackRepository: SlackRepository
) : ViewModel() {

    private val _state = MutableStateFlow(ChatState())
    val state: StateFlow<ChatState> = _state.asStateFlow()

    private var pollingJob: Job? = null

    fun loadConversation(conversationId: String) {
        pollingJob?.cancel()

        _state.value = ChatState(isLoading = true, conversationId = conversationId)

        viewModelScope.launch {
            try {
                val messages = slackRepository.getMessages(conversationId)
                _state.value = _state.value.copy(
                    messages = messages,
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

        startMessagePolling(conversationId)
    }

    fun sendMessage(text: String) {
        val conversationId = _state.value.conversationId ?: return
        if (text.isBlank()) return

        _state.value = _state.value.copy(isSending = true)

        viewModelScope.launch {
            val success = slackRepository.sendMessage(conversationId, text)
            if (success) {
                delay(500)
                try {
                    val messages = slackRepository.getMessages(conversationId)
                    _state.value = _state.value.copy(
                        messages = messages,
                        isSending = false
                    )
                } catch (_: Exception) {
                    _state.value = _state.value.copy(isSending = false)
                }
            } else {
                _state.value = _state.value.copy(
                    isSending = false,
                    error = "Nie udało się wysłać wiadomości"
                )
            }
        }
    }

    private fun startMessagePolling(conversationId: String) {
        pollingJob = viewModelScope.launch {
            while (true) {
                delay(3000)
                try {
                    val messages = slackRepository.getMessages(conversationId)
                    _state.value = _state.value.copy(messages = messages)
                } catch (_: Exception) {}
            }
        }
    }

    override fun onCleared() {
        pollingJob?.cancel()
        super.onCleared()
    }
}
