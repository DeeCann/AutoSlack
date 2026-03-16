package com.autoslack.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val AutoSlackColorScheme = darkColorScheme(
    primary = SlackPurple,
    onPrimary = UnreadWhite,
    primaryContainer = SlackPurpleLight,
    onPrimaryContainer = UnreadWhite,
    secondary = SlackBlue,
    onSecondary = DarkBackground,
    tertiary = SlackGreen,
    background = DarkBackground,
    onBackground = TextPrimary,
    surface = DarkSurface,
    onSurface = TextPrimary,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = TextSecondary,
    outline = DarkBorder,
    error = SlackRed,
    onError = UnreadWhite
)

@Composable
fun AutoSlackTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AutoSlackColorScheme,
        typography = AutoSlackTypography,
        content = content
    )
}
