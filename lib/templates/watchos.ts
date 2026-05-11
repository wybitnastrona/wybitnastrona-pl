/**
 * Apple Watch (watchOS 10+) template — Swift / SwiftUI, code-only.
 * Eksport ZIP do Xcode 15+ z target = "Watch App" (App for Apple Watch).
 */

import type { ProjectFiles } from "@/lib/types/project";

export const WATCHOS_DEPS: Record<string, string> = {};
export const WATCHOS_DEV_DEPS: Record<string, string> = {};

const README = `# Wybitna Watch App

Aplikacja na **Apple Watch** w SwiftUI (watchOS 10+).

## Jak uruchomic
1. Pobierz ZIP (przycisk **Eksport** w prawym gornym rogu).
2. Otworz w **Xcode 15+** — kliknij \`xcodegen generate\` (lub Xcode->File->New Project z Watch App template).
3. Wybierz target *Watch App* i kliknij **Run** (Cmd+R) na symulatorze Apple Watch Series 9.

## Stack
- SwiftUI dla watchOS 10+
- WKApplicationDelegate (jezeli potrzebny)
- WatchKit (Image(systemName:), List, NavigationStack)
- HealthKit + CoreMotion (jezeli aplikacja korzysta)
- Complications (Sources/Complications/)
- Live Activities (gdy is_wybitny)
`;

const APP_SWIFT = `import SwiftUI

@main
struct WybitnaWatchApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
`;

const CONTENT_VIEW = `import SwiftUI

struct ContentView: View {
    @State private var heartRate: Int = 72

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(.red)
                    .symbolEffect(.pulse, options: .repeating)

                Text("\\(heartRate) BPM")
                    .font(.title2.bold())
                    .monospacedDigit()

                Button {
                    heartRate = Int.random(in: 60...110)
                } label: {
                    Label("Odswiez", systemImage: "arrow.clockwise")
                        .font(.footnote)
                }
                .controlSize(.small)
            }
            .padding()
            .navigationTitle("Puls")
        }
    }
}

#Preview {
    ContentView()
}
`;

const COMPLICATION = `import WidgetKit
import SwiftUI

struct HeartRateComplication: Widget {
    let kind = "HeartRateComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ComplicationView(entry: entry)
        }
        .configurationDisplayName("Puls")
        .description("Aktualne tetno na tarczy.")
        .supportedFamilies([.accessoryCircular, .accessoryCorner])
    }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), heartRate: 72)
    }
    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        completion(placeholder(in: context))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        let timeline = Timeline(entries: [placeholder(in: context)], policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let heartRate: Int
}

struct ComplicationView: View {
    let entry: SimpleEntry
    var body: some View {
        VStack(spacing: 0) {
            Image(systemName: "heart.fill").foregroundStyle(.red)
            Text("\\(entry.heartRate)").font(.caption2).monospacedDigit()
        }
    }
}
`;

const PROJECT_YML = `name: WybitnaWatchApp
options:
  bundleIdPrefix: pl.wybitnastrona
  deploymentTarget:
    watchOS: "10.0"
targets:
  WybitnaWatchApp:
    type: application.watchapp2
    platform: watchOS
    sources: [.]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: pl.wybitnastrona.WybitnaWatchApp
        SWIFT_VERSION: "5.9"
`;

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key><string>Watch App</string>
  <key>CFBundleIdentifier</key><string>pl.wybitnastrona.WybitnaWatchApp</string>
  <key>WKApplication</key><true/>
  <key>WKWatchOnly</key><true/>
</dict>
</plist>
`;

export function getWatchOsTemplate(): ProjectFiles {
  return {
    "/README.md": { code: README, hidden: false },
    "/project.yml": { code: PROJECT_YML, hidden: true },
    "/Info.plist": { code: INFO_PLIST, hidden: true },
    "/WybitnaWatchApp.swift": { code: APP_SWIFT, hidden: false },
    "/ContentView.swift": { code: CONTENT_VIEW, hidden: false, active: true },
    "/Complications/HeartRateComplication.swift": {
      code: COMPLICATION,
      hidden: false,
    },
  };
}
