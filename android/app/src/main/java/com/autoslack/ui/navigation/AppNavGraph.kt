package com.autoslack.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.autoslack.ui.dashboard.DashboardScreen
import com.autoslack.ui.login.LoginScreen
import com.autoslack.ui.login.LoginViewModel

@Composable
fun AppNavGraph() {
    val navController = rememberNavController()
    val loginViewModel: LoginViewModel = hiltViewModel()
    var startDest by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        if (loginViewModel.isLoggedIn()) {
            val valid = loginViewModel.validateExistingToken()
            startDest = if (valid) "dashboard" else "login"
        } else {
            startDest = "login"
        }
    }

    val dest = startDest
    if (dest == null) {
        Box(
            Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
        )
        return
    }

    NavHost(navController = navController, startDestination = dest) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("dashboard") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }
        composable("dashboard") {
            DashboardScreen(
                onLogout = {
                    navController.navigate("login") {
                        popUpTo("dashboard") { inclusive = true }
                    }
                }
            )
        }
    }
}
