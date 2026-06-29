package com.parallax.app.ui.component

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parallax.app.ui.theme.*

private val intentExamples = listOf(
    "Quiet date night, great wine, authentic Italian",
    "Quick family lunch, kid-friendly, large portions",
    "Business dinner, upscale but not pretentious",
    "Cheap eats, big flavors, don't care about decor",
    "Brunch with friends, good vibes, strong coffee",
)

@Composable
fun SearchBar(
    query: String,
    intent: String,
    isLoading: Boolean,
    onQueryChange: (String) -> Unit,
    onIntentChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Restaurant", fontSize = 12.sp, color = TextSecondary)
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            placeholder = { Text("Restaurant name or Google Maps URL", color = TextMuted) },
            singleLine = true,
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Amber600,
                unfocusedBorderColor = Border,
                focusedContainerColor = Surface,
                unfocusedContainerColor = Surface,
            ),
        )

        Text("What are you looking for?", fontSize = 12.sp, color = TextSecondary)
        OutlinedTextField(
            value = intent,
            onValueChange = onIntentChange,
            placeholder = { Text("Describe what matters to you...", color = TextMuted) },
            minLines = 2,
            maxLines = 4,
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Amber600,
                unfocusedBorderColor = Border,
                focusedContainerColor = Surface,
                unfocusedContainerColor = Surface,
            ),
        )

        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            intentExamples.forEach { example ->
                AssistChip(
                    onClick = { onIntentChange(example) },
                    label = { Text(example, fontSize = 10.sp) },
                    enabled = !isLoading,
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = Background,
                        labelColor = TextTertiary,
                    ),
                    border = AssistChipDefaults.assistChipBorder(enabled = true, borderColor = Border),
                )
            }
        }

        Button(
            onClick = onSubmit,
            enabled = query.isNotBlank() && intent.isNotBlank() && !isLoading,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Amber600),
        ) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), color = TextPrimary, strokeWidth = 2.dp)
            } else {
                Text("Get your Parallax Score")
            }
        }
    }
}
