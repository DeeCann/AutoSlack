package com.autoslack.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.autoslack.data.model.Message
import com.autoslack.ui.theme.SlackPurple
import com.autoslack.ui.theme.SlackPurpleDark
import com.autoslack.ui.theme.TextMuted
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun MessageItem(message: Message) {
    val alignment = if (message.isOwn) Arrangement.End else Arrangement.Start

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = alignment,
        verticalAlignment = Alignment.Top
    ) {
        if (!message.isOwn) {
            if (message.senderImage != null) {
                AsyncImage(
                    model = message.senderImage,
                    contentDescription = message.senderName,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.Person,
                        contentDescription = null,
                        tint = TextMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.width(10.dp))
        }

        Column(
            modifier = Modifier.widthIn(max = 500.dp),
            horizontalAlignment = if (message.isOwn) Alignment.End else Alignment.Start
        ) {
            if (!message.isOwn) {
                Text(
                    text = message.senderName,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(2.dp))
            }

            Box(
                modifier = Modifier
                    .clip(
                        RoundedCornerShape(
                            topStart = 16.dp,
                            topEnd = 16.dp,
                            bottomStart = if (message.isOwn) 16.dp else 4.dp,
                            bottomEnd = if (message.isOwn) 4.dp else 16.dp
                        )
                    )
                    .background(
                        if (message.isOwn) SlackPurple
                        else MaterialTheme.colorScheme.surface
                    )
                    .padding(horizontal = 16.dp, vertical = 10.dp)
            ) {
                Text(
                    text = message.body ?: "",
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (message.isOwn) MaterialTheme.colorScheme.onPrimary
                    else MaterialTheme.colorScheme.onSurface
                )
            }

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = formatTimestamp(message.timestamp),
                style = MaterialTheme.typography.labelSmall,
                color = TextMuted.copy(alpha = 0.6f)
            )
        }
    }
}

private fun formatTimestamp(ts: String): String {
    return try {
        val epochSeconds = ts.toDouble()
        val date = Date((epochSeconds * 1000).toLong())
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
    } catch (_: Exception) {
        ""
    }
}
