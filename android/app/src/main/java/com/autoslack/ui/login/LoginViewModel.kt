package com.autoslack.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autoslack.data.repository.AuthRepository
import com.autoslack.data.repository.SlackRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginState(
    val isLoading: Boolean = true,
    val loginUrl: String? = null,
    val qrToken: String? = null,
    val status: String = "loading",
    val errorMessage: String? = null,
    val expiresIn: Int = 300
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val slackRepository: SlackRepository
) : ViewModel() {

    private val _state = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _state.asStateFlow()
    private var pollingJob: Job? = null

    fun isLoggedIn(): Boolean = authRepository.isLoggedIn()

    suspend fun validateExistingToken(): Boolean {
        return try {
            val valid = slackRepository.verifyToken()
            if (!valid) {
                authRepository.logout()
            }
            valid
        } catch (_: Exception) {
            authRepository.logout()
            false
        }
    }

    fun requestQrCode(onSuccess: () -> Unit) {
        pollingJob?.cancel()
        viewModelScope.launch {
            _state.value = LoginState(isLoading = true, status = "loading")
            try {
                val qrResponse = authRepository.requestQrCode()
                _state.value = LoginState(
                    isLoading = false,
                    loginUrl = qrResponse.loginUrl,
                    qrToken = qrResponse.token,
                    status = "pending",
                    expiresIn = qrResponse.expiresIn
                )
                startPolling(qrResponse.token, onSuccess)
            } catch (e: Exception) {
                val errorMsg = when (e) {
                    is java.net.UnknownHostException,
                    is java.net.ConnectException ->
                        "Serwer OAuth jest niedostępny. Sprawdź połączenie z internetem."
                    is java.net.SocketTimeoutException ->
                        "Przekroczono czas połączenia z serwerem. Spróbuj ponownie."
                    else -> e.message ?: "Nie udało się wygenerować kodu QR"
                }
                _state.value = LoginState(
                    isLoading = false,
                    status = "error",
                    errorMessage = errorMsg
                )
            }
        }
    }

    private fun startPolling(token: String, onSuccess: () -> Unit) {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            val maxAttempts = 100
            var attempt = 0

            while (attempt < maxAttempts) {
                delay(3000)
                attempt++

                try {
                    val statusResponse = authRepository.pollQrStatus(token)

                    when (statusResponse.status) {
                        "success" -> {
                            val accessToken = statusResponse.accessToken
                            if (accessToken != null) {
                                authRepository.saveToken(accessToken)
                                val verified = slackRepository.verifyToken()
                                if (verified) {
                                    _state.value = _state.value.copy(status = "success")
                                    onSuccess()
                                } else {
                                    authRepository.logout()
                                    _state.value = _state.value.copy(
                                        status = "error",
                                        errorMessage = "Nie udało się zweryfikować tokenu. Spróbuj ponownie."
                                    )
                                }
                            } else {
                                _state.value = _state.value.copy(
                                    status = "error",
                                    errorMessage = "Brak tokenu w odpowiedzi serwera"
                                )
                            }
                            return@launch
                        }
                        "error" -> {
                            _state.value = _state.value.copy(
                                status = "error",
                                errorMessage = statusResponse.errorMessage ?: "Logowanie nie powiodło się"
                            )
                            return@launch
                        }
                        "expired" -> {
                            _state.value = _state.value.copy(
                                status = "expired",
                                errorMessage = "Kod QR wygasł. Wygeneruj nowy."
                            )
                            return@launch
                        }
                    }
                } catch (_: Exception) {
                    // network hiccup — keep trying
                }
            }

            _state.value = _state.value.copy(
                status = "expired",
                errorMessage = "Sesja wygasła. Spróbuj ponownie."
            )
        }
    }
}
