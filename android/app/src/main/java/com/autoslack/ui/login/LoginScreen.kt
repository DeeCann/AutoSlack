package com.autoslack.ui.login

import android.graphics.Bitmap
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.autoslack.ui.theme.SlackPurple
import com.autoslack.ui.theme.SlackPurpleLight
import com.autoslack.ui.theme.TextMuted
import com.autoslack.util.QrCodeEncoder

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.requestQrCode(onLoginSuccess)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.padding(48.dp)
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(SlackPurple),
                    contentAlignment = Alignment.Center
                ) {
                    Text("S", fontSize = 32.sp, color = MaterialTheme.colorScheme.onPrimary)
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "AutoSlack",
                    style = MaterialTheme.typography.displayLarge,
                    color = MaterialTheme.colorScheme.onBackground
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Slack dla Android Automotive",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextMuted
                )

                Spacer(modifier = Modifier.height(32.dp))

                Text(
                    text = "Zeskanuj kod QR telefonem\naby zalogować się do Slack",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    lineHeight = 28.sp
                )
            }

            Spacer(modifier = Modifier.width(64.dp))

            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                when (state.status) {
                    "loading" -> {
                        Box(
                            modifier = Modifier.size(280.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(48.dp),
                                color = SlackPurple
                            )
                        }
                    }
                    "pending" -> {
                        QrCodeDisplay(url = state.loginUrl ?: "")
                    }
                    "success" -> {
                        Box(
                            modifier = Modifier.size(280.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Połączono!",
                                style = MaterialTheme.typography.headlineLarge,
                                color = MaterialTheme.colorScheme.tertiary
                            )
                        }
                    }
                    "error", "expired" -> {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.size(280.dp),
                            verticalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = if (state.status == "expired") "Kod wygasł" else "Błąd",
                                style = MaterialTheme.typography.headlineMedium,
                                color = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = state.errorMessage ?: "",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextMuted,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            TextButton(
                                onClick = { viewModel.requestQrCode(onLoginSuccess) }
                            ) {
                                Text(
                                    "Wygeneruj nowy kod",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = SlackPurpleLight
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QrCodeDisplay(url: String) {
    val bitmap: Bitmap = remember(url) {
        QrCodeEncoder.encode(url, 512)
    }

    val infiniteTransition = rememberInfiniteTransition(label = "qr-pulse")
    val borderAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500),
            repeatMode = RepeatMode.Reverse
        ),
        label = "border-alpha"
    )

    Box(
        modifier = Modifier
            .size(300.dp)
            .graphicsLayer { alpha = 1f }
            .border(
                width = 3.dp,
                color = SlackPurple.copy(alpha = borderAlpha),
                shape = RoundedCornerShape(24.dp)
            )
            .padding(12.dp),
        contentAlignment = Alignment.Center
    ) {
        Image(
            bitmap = bitmap.asImageBitmap(),
            contentDescription = "Kod QR logowania do Slack",
            modifier = Modifier
                .size(260.dp)
                .clip(RoundedCornerShape(12.dp)),
            contentScale = ContentScale.Fit
        )
    }
}
