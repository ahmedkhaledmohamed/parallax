package com.parallax.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.viewmodel.compose.viewModel
import com.parallax.app.data.api.MapsUrlDetector
import com.parallax.app.data.api.ParallaxApi
import com.parallax.app.data.repository.AnalysisRepository
import com.parallax.app.ui.screen.HomeScreen
import com.parallax.app.ui.theme.ParallaxTheme
import com.parallax.app.ui.viewmodel.HomeViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val sharedText = extractSharedText(intent)

        setContent {
            ParallaxTheme {
                val vm: HomeViewModel = viewModel {
                    val app = application as ParallaxApp
                    val repo = AnalysisRepository(
                        api = ParallaxApi(),
                        dao = app.database.searchHistoryDao(),
                    )
                    HomeViewModel(repo)
                }

                LaunchedEffect(sharedText) {
                    if (sharedText != null) {
                        val query = if (MapsUrlDetector.isGoogleMapsUrl(sharedText)) {
                            MapsUrlDetector.extractQuery(sharedText)
                        } else {
                            sharedText
                        }
                        vm.setSharedQuery(query)
                    }
                }

                HomeScreen(viewModel = vm)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    private fun extractSharedText(intent: Intent?): String? {
        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            return intent.getStringExtra(Intent.EXTRA_TEXT)
        }
        return null
    }
}
