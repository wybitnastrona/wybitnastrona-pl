/**
 * iOS / SwiftUI template (code-only).
 *
 * Brak preview w przegladarce — Sandpack nie odpala Swifta. Uzytkownik
 * eksportuje ZIP i otwiera w Xcode. AI generuje kompletny projekt Xcode
 * z folderami `Models/`, `Views/`, `Screens/`, `Components/`.
 */

import type { ProjectFiles } from "@/lib/types/project";

export const IOS_DEPS: Record<string, string> = {};
export const IOS_DEV_DEPS: Record<string, string> = {};

const PROJECT_README = `# Wybitna iOS App

Aplikacja iOS zbudowana w **Swift 5.9 + SwiftUI** (iOS 17+).

## Jak uruchomic

1. Pobierz projekt jako ZIP (przycisk **Eksport** w prawym gornym rogu).
2. Rozpakuj i otwierz \`WybitnaApp.xcodeproj\` w **Xcode 15+**.
3. Wybierz target i kliknij **Run** (Cmd+R).

## Struktura

- \`WybitnaApp.swift\` — entry point z \`@main\`
- \`ContentView.swift\` — root view
- \`Screens/\` — pelne ekrany aplikacji
- \`Components/\` — wielokrotnie uzywane komponenty
- \`Models/\` — modele danych (struct)
- \`ViewModels/\` — ObservableObject (MVVM)
- \`Assets.xcassets/\` — kolory, ikony, obrazy

## Stack

- SwiftUI (NIE UIKit)
- @State / @Binding / @ObservedObject
- NavigationStack (iOS 16+)
- SF Symbols dla ikon
`;

const WYBITNA_APP_SWIFT = `import SwiftUI

@main
struct WybitnaApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
`;

const CONTENT_VIEW_SWIFT = `import SwiftUI

struct ContentView: View {
    @State private var count: Int = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "sparkles")
                    .font(.system(size: 56))
                    .foregroundStyle(.accent)

                Text("Wybitna iOS App")
                    .font(.largeTitle.bold())

                Text("Edytuj plik **ContentView.swift** aby zaczac.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Button {
                    count += 1
                } label: {
                    Label("Kliknieto: \\(count)", systemImage: "hand.tap")
                        .font(.headline)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
            .padding()
            .navigationTitle("Witaj")
        }
    }
}

#Preview {
    ContentView()
}
`;

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>pl_PL</string>
    <key>CFBundleDisplayName</key>
    <string>Wybitna App</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>pl.wybitnastrona.WybitnaApp</string>
    <key>CFBundleName</key>
    <string>WybitnaApp</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>UILaunchScreen</key>
    <dict/>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
</dict>
</plist>
`;

const ACCENT_COLOR_JSON = `{
  "colors" : [
    {
      "color" : {
        "color-space" : "srgb",
        "components" : {
          "alpha" : "1.000",
          "blue" : "0.776",
          "green" : "0.863",
          "red" : "0.910"
        }
      },
      "idiom" : "universal"
    }
  ],
  "info" : {
    "author" : "wybitnastrona.pl",
    "version" : 1
  }
}
`;

const ASSETS_CONTENTS_JSON = `{
  "info" : {
    "author" : "wybitnastrona.pl",
    "version" : 1
  }
}
`;

const PROJECT_PBXPROJ = `// Plik projektu Xcode generowany automatycznie. Pelny pbxproj zostanie
// wygenerowany przez \`xcodegen\` na podstawie struktury katalogow.
// Otworz folder w Xcode 15+ — IDE samo zaproponuje stworzenie projektu.
//
// Alternatywnie: skorzystaj z xcodegen:
//   brew install xcodegen
//   xcodegen generate
`;

const PROJECT_YML = `name: WybitnaApp
options:
  bundleIdPrefix: pl.wybitnastrona
  deploymentTarget:
    iOS: "17.0"
targets:
  WybitnaApp:
    type: application
    platform: iOS
    sources:
      - path: .
        excludes:
          - "README.md"
          - "project.yml"
    info:
      path: Info.plist
      properties:
        UILaunchScreen: {}
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: pl.wybitnastrona.WybitnaApp
        SWIFT_VERSION: "5.9"
        IPHONEOS_DEPLOYMENT_TARGET: "17.0"
`;

export function getIosTemplate(): ProjectFiles {
  return {
    "/README.md": { code: PROJECT_README, hidden: false },
    "/project.yml": { code: PROJECT_YML, hidden: true },
    "/Info.plist": { code: INFO_PLIST, hidden: true },
    "/WybitnaApp.swift": { code: WYBITNA_APP_SWIFT, hidden: false },
    "/ContentView.swift": { code: CONTENT_VIEW_SWIFT, hidden: false, active: true },
    "/Assets.xcassets/Contents.json": { code: ASSETS_CONTENTS_JSON, hidden: true },
    "/Assets.xcassets/AccentColor.colorset/Contents.json": {
      code: ACCENT_COLOR_JSON,
      hidden: true,
    },
    "/Assets.xcassets/AppIcon.appiconset/Contents.json": {
      code: ASSETS_CONTENTS_JSON,
      hidden: true,
    },
    "/.wybitna-xcode-note": { code: PROJECT_PBXPROJ, hidden: true },
  };
}
