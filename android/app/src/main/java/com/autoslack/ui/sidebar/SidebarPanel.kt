package com.autoslack.ui.sidebar

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tag
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.autoslack.data.model.Conversation
import com.autoslack.data.model.ConversationType
import com.autoslack.ui.theme.DarkBorder
import com.autoslack.ui.theme.SlackPurple
import com.autoslack.ui.theme.TextMuted

@Composable
fun SidebarPanel(
    conversations: List<Conversation>,
    isLoading: Boolean,
    selectedConversationId: String?,
    teamName: String,
    onSelectConversation: (String) -> Unit,
    onLogout: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var channelsExpanded by remember { mutableStateOf(true) }
    var dmsExpanded by remember { mutableStateOf(true) }

    val filtered = conversations.filter {
        it.name.contains(searchQuery, ignoreCase = true)
    }
    val channels = filtered.filter { it.type == ConversationType.CHANNEL }
    val dms = filtered.filter { it.type == ConversationType.DM || it.type == ConversationType.GROUP }

    Column(
        modifier = Modifier
            .width(380.dp)
            .fillMaxHeight()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp)
                .padding(horizontal = 20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(SlackPurple),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Filled.Tag,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = teamName,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            IconButton(
                onClick = onLogout,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.Logout,
                    contentDescription = "Wyloguj",
                    tint = TextMuted,
                    modifier = Modifier.size(24.dp)
                )
            }
        }

        HorizontalDivider(color = DarkBorder, thickness = 1.dp)

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(MaterialTheme.colorScheme.background.copy(alpha = 0.5f))
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Filled.Search,
                contentDescription = null,
                tint = TextMuted,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            BasicTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                textStyle = TextStyle(
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 16.sp
                ),
                cursorBrush = SolidColor(SlackPurple),
                singleLine = true,
                modifier = Modifier.weight(1f),
                decorationBox = { innerTextField ->
                    if (searchQuery.isEmpty()) {
                        Text(
                            "Szukaj konwersacji...",
                            color = TextMuted,
                            fontSize = 16.sp
                        )
                    }
                    innerTextField()
                }
            )
        }

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = SlackPurple, modifier = Modifier.size(36.dp))
            }
        } else {
            LazyColumn(modifier = Modifier.weight(1f)) {
                item {
                    SectionHeader(
                        title = "Kanały",
                        count = channels.size,
                        expanded = channelsExpanded,
                        onToggle = { channelsExpanded = !channelsExpanded }
                    )
                }

                if (channelsExpanded) {
                    items(channels, key = { it.id }) { conversation ->
                        ConversationItem(
                            conversation = conversation,
                            isSelected = conversation.id == selectedConversationId,
                            onClick = { onSelectConversation(conversation.id) }
                        )
                    }
                }

                item {
                    SectionHeader(
                        title = "Wiadomości",
                        count = dms.size,
                        expanded = dmsExpanded,
                        onToggle = { dmsExpanded = !dmsExpanded }
                    )
                }

                if (dmsExpanded) {
                    items(dms, key = { it.id }) { conversation ->
                        ConversationItem(
                            conversation = conversation,
                            isSelected = conversation.id == selectedConversationId,
                            onClick = { onSelectConversation(conversation.id) }
                        )
                    }
                }

                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    count: Int,
    expanded: Boolean,
    onToggle: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(
            onClick = onToggle,
            modifier = Modifier.size(32.dp)
        ) {
            Icon(
                if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                contentDescription = if (expanded) "Zwiń" else "Rozwiń",
                tint = TextMuted,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = "$title ($count)",
            style = MaterialTheme.typography.labelLarge,
            color = TextMuted
        )
    }
}
