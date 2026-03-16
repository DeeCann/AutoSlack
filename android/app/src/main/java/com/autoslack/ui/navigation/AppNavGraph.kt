package com.autoslack.ui.navigation

import androidx.compose.runtime.Composable
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
    val startDest = if (loginViewModel.isLoggedIn()) "dashboard" else "login"

    NavHost(navController = navController, startDestination = startDest) {
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
