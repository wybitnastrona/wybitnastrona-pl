/**
 * Android / Jetpack Compose template (code-only).
 *
 * Brak preview w przegladarce. Uzytkownik eksportuje ZIP i otwiera w
 * Android Studio. AI generuje kompletny projekt Gradle z Kotlin + Compose.
 */

import type { ProjectFiles } from "@/lib/types/project";

export const ANDROID_DEPS: Record<string, string> = {};
export const ANDROID_DEV_DEPS: Record<string, string> = {};

const PROJECT_README = `# Wybitna Android App

Aplikacja Android zbudowana w **Kotlin + Jetpack Compose** (Material 3, API 26+).

## Jak uruchomic

1. Pobierz projekt jako ZIP (przycisk **Eksport** w prawym gornym rogu).
2. Rozpakuj i otwierz w **Android Studio Iguana** (2023.2+).
3. Sync Gradle, wybierz emulator API 26+ i kliknij **Run**.

## Struktura

- \`app/src/main/java/pl/wybitnastrona/app/MainActivity.kt\` — entry point
- \`app/src/main/java/pl/wybitnastrona/app/ui/screens/\` — pelne ekrany
- \`app/src/main/java/pl/wybitnastrona/app/ui/components/\` — komponenty
- \`app/src/main/java/pl/wybitnastrona/app/ui/theme/\` — Material 3 theme
- \`app/src/main/java/pl/wybitnastrona/app/data/\` — modele i repozytoria

## Stack

- Jetpack Compose (NIE XML)
- Material 3 (\`androidx.compose.material3\`)
- Navigation Compose
- ViewModel + StateFlow
`;

const SETTINGS_GRADLE = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "WybitnaApp"
include(":app")
`;

const ROOT_BUILD_GRADLE = `plugins {
    id("com.android.application") version "8.4.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.23" apply false
}
`;

const APP_BUILD_GRADLE = `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "pl.wybitnastrona.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "pl.wybitnastrona.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.11"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.04.01")
    implementation(composeBom)
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.navigation:navigation-compose:2.7.7")
}
`;

const ANDROID_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:label="Wybitna App"
        android:theme="@style/Theme.WybitnaApp">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;

const MAIN_ACTIVITY = `package pl.wybitnastrona.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import pl.wybitnastrona.app.ui.screens.HomeScreen
import pl.wybitnastrona.app.ui.theme.WybitnaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WybitnaTheme {
                HomeScreen()
            }
        }
    }
}
`;

const HOME_SCREEN = `package pl.wybitnastrona.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen() {
    var count by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Witaj") })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp, Alignment.CenterVertically),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.AutoAwesome,
                contentDescription = null,
                modifier = Modifier.size(56.dp)
            )
            Text(
                text = "Wybitna Android App",
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = "Edytuj plik HomeScreen.kt aby zaczac.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center
            )
            Button(onClick = { count++ }) {
                Text("Kliknieto: $count")
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun HomeScreenPreview() {
    WybitnaTheme { HomeScreen() }
}

// re-export theme tylko zeby preview wiedziala
@Composable
private fun WybitnaTheme(content: @Composable () -> Unit) {
    pl.wybitnastrona.app.ui.theme.WybitnaTheme(content = content)
}
`;

const THEME_KT = `package pl.wybitnastrona.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFFE8DCC4),
    onPrimary = Color(0xFF1A1A1A),
    background = Color(0xFFFAFAFA),
    onBackground = Color(0xFF1A1A1A)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFE8DCC4),
    onPrimary = Color(0xFF1A1A1A),
    background = Color(0xFF0A0A0A),
    onBackground = Color(0xFFFAFAFA)
)

@Composable
fun WybitnaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
`;

const GRADLE_PROPERTIES = `org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
kotlin.code.style=official
`;

const PROGUARD = `# Default ProGuard rules
-keepattributes *Annotation*, Signature, Exception
`;

export function getAndroidTemplate(): ProjectFiles {
  return {
    "/README.md": { code: PROJECT_README, hidden: false },
    "/settings.gradle.kts": { code: SETTINGS_GRADLE, hidden: true },
    "/build.gradle.kts": { code: ROOT_BUILD_GRADLE, hidden: true },
    "/gradle.properties": { code: GRADLE_PROPERTIES, hidden: true },
    "/app/build.gradle.kts": { code: APP_BUILD_GRADLE, hidden: false },
    "/app/proguard-rules.pro": { code: PROGUARD, hidden: true },
    "/app/src/main/AndroidManifest.xml": { code: ANDROID_MANIFEST, hidden: false },
    "/app/src/main/java/pl/wybitnastrona/app/MainActivity.kt": {
      code: MAIN_ACTIVITY,
      hidden: false,
    },
    "/app/src/main/java/pl/wybitnastrona/app/ui/screens/HomeScreen.kt": {
      code: HOME_SCREEN,
      hidden: false,
      active: true,
    },
    "/app/src/main/java/pl/wybitnastrona/app/ui/theme/Theme.kt": {
      code: THEME_KT,
      hidden: false,
    },
  };
}
