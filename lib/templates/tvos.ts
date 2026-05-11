/**
 * Apple TV (tvOS 17+) template — Swift / SwiftUI z focus engine, code-only.
 * Eksport ZIP do Xcode 15+ z target = "tvOS App".
 */

import type { ProjectFiles } from "@/lib/types/project";

export const TVOS_DEPS: Record<string, string> = {};
export const TVOS_DEV_DEPS: Record<string, string> = {};

const README = `# Wybitna Apple TV App

Aplikacja na **Apple TV** (tvOS 17+) w SwiftUI.

## Jak uruchomic
1. Pobierz ZIP (przycisk **Eksport**).
2. Otworz w **Xcode 15+** (xcodegen generate) i wybierz target *Apple TV App*.
3. Uruchom na symulatorze **Apple TV 4K (3rd gen)** (Cmd+R).

## Stack
- SwiftUI dla tvOS 17+
- Focus Engine (Button { ... }.focusable())
- TabView (.tabViewStyle(.sidebarAdaptable))
- Grid / LazyVGrid / NavigationStack
- AVKit dla wideo
`;

const APP_SWIFT = `import SwiftUI

@main
struct WybitnaTvApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
`;

const CONTENT_VIEW = `import SwiftUI

struct ContentView: View {
    @State private var focusedTile: Int? = nil

    let tiles = (1...12).map { "Tile \\($0)" }
    let columns = Array(repeating: GridItem(.flexible(), spacing: 32), count: 4)

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: columns, spacing: 32) {
                    ForEach(Array(tiles.enumerated()), id: \\.offset) { idx, title in
                        Button {
                            print("Picked: \\(title)")
                        } label: {
                            VStack {
                                Image(systemName: "play.rectangle.fill")
                                    .font(.system(size: 64))
                                Text(title)
                            }
                            .frame(width: 280, height: 200)
                            .background(.white.opacity(0.1))
                            .cornerRadius(16)
                        }
                        .buttonStyle(.card)
                    }
                }
                .padding(64)
            }
            .navigationTitle("Wybitna TV")
        }
    }
}

#Preview {
    ContentView()
}
`;

const PROJECT_YML = `name: WybitnaTvApp
options:
  bundleIdPrefix: pl.wybitnastrona
  deploymentTarget:
    tvOS: "17.0"
targets:
  WybitnaTvApp:
    type: application
    platform: tvOS
    sources: [.]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: pl.wybitnastrona.WybitnaTvApp
        SWIFT_VERSION: "5.9"
        TARGETED_DEVICE_FAMILY: "3"
`;

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key><string>Wybitna TV</string>
  <key>CFBundleIdentifier</key><string>pl.wybitnastrona.WybitnaTvApp</string>
  <key>UIRequiredDeviceCapabilities</key>
  <array><string>arm64</string></array>
</dict>
</plist>
`;

export function getTvOsTemplate(): ProjectFiles {
  return {
    "/README.md": { code: README, hidden: false },
    "/project.yml": { code: PROJECT_YML, hidden: true },
    "/Info.plist": { code: INFO_PLIST, hidden: true },
    "/WybitnaTvApp.swift": { code: APP_SWIFT, hidden: false },
    "/ContentView.swift": { code: CONTENT_VIEW, hidden: false, active: true },
  };
}
