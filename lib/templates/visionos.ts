/**
 * Vision Pro (visionOS 1+) template — Swift / SwiftUI + RealityKit, code-only.
 * Eksport ZIP do Xcode 15.2+ z target = "visionOS App".
 *
 * Klimat: ImmersiveSpace + .volumetric WindowGroup + RealityKit Entity.
 */

import type { ProjectFiles } from "@/lib/types/project";

export const VISIONOS_DEPS: Record<string, string> = {};
export const VISIONOS_DEV_DEPS: Record<string, string> = {};

const README = `# Wybitna Vision Pro App

Aplikacja na **Apple Vision Pro** (visionOS 1+) w SwiftUI + RealityKit.

## Jak uruchomic
1. Pobierz ZIP (przycisk **Eksport**).
2. Otworz w **Xcode 15.2+** (xcodegen generate) i wybierz target *visionOS App*.
3. Uruchom na symulatorze **Apple Vision Pro** (Cmd+R).

## Stack
- SwiftUI dla visionOS 1+
- WindowGroup .windowStyle(.volumetric) dla 3D
- ImmersiveSpace dla AR / VR
- RealityKit Entity + Anchor + Model3D
- Spatial Audio (jezeli is_wybitny)
`;

const APP_SWIFT = `import SwiftUI

@main
struct WybitnaVisionApp: App {
    var body: some Scene {
        // Standardowe okno
        WindowGroup {
            ContentView()
        }

        // Okno objetosciowe (3D)
        WindowGroup(id: "globe") {
            GlobeView()
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 0.6, height: 0.6, depth: 0.6, in: .meters)

        // Pelna immersja (ImmersiveSpace)
        ImmersiveSpace(id: "ImmersiveSpace") {
            ImmersiveView()
        }
    }
}
`;

const CONTENT_VIEW = `import SwiftUI

struct ContentView: View {
    @Environment(\\.openWindow) private var openWindow
    @Environment(\\.openImmersiveSpace) private var openImmersiveSpace

    var body: some View {
        VStack(spacing: 24) {
            Text("Wybitna Vision App")
                .font(.largeTitle.bold())

            Text("Wybierz tryb wyswietlania")
                .foregroundStyle(.secondary)

            HStack(spacing: 16) {
                Button("Okno 3D — Globus") {
                    openWindow(id: "globe")
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Button("Pelna immersja") {
                    Task { await openImmersiveSpace(id: "ImmersiveSpace") }
                }
                .controlSize(.large)
            }
        }
        .padding(64)
    }
}

#Preview { ContentView() }
`;

const GLOBE_VIEW = `import SwiftUI
import RealityKit

struct GlobeView: View {
    var body: some View {
        RealityView { content in
            let mesh = MeshResource.generateSphere(radius: 0.2)
            var material = SimpleMaterial(color: .init(white: 0.8, alpha: 1), isMetallic: false)
            material.roughness = 0.4
            let entity = ModelEntity(mesh: mesh, materials: [material])
            entity.components.set(InputTargetComponent())
            content.add(entity)
        }
    }
}
`;

const IMMERSIVE_VIEW = `import SwiftUI
import RealityKit

struct ImmersiveView: View {
    var body: some View {
        RealityView { content in
            // Otoczenie: prosty ksztalt jako placeholder.
            let mesh = MeshResource.generateBox(size: 0.3)
            var mat = SimpleMaterial(color: .blue, isMetallic: false)
            mat.roughness = 0.3
            let cube = ModelEntity(mesh: mesh, materials: [mat])
            cube.position = [0, 1.2, -1.5]
            content.add(cube)
        }
    }
}
`;

const PROJECT_YML = `name: WybitnaVisionApp
options:
  bundleIdPrefix: pl.wybitnastrona
  deploymentTarget:
    visionOS: "1.0"
targets:
  WybitnaVisionApp:
    type: application
    platform: visionOS
    sources: [.]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: pl.wybitnastrona.WybitnaVisionApp
        SWIFT_VERSION: "5.9"
`;

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key><string>Wybitna Vision</string>
  <key>CFBundleIdentifier</key><string>pl.wybitnastrona.WybitnaVisionApp</string>
  <key>UIApplicationSceneManifest</key>
  <dict>
    <key>UIApplicationSupportsMultipleScenes</key><true/>
  </dict>
</dict>
</plist>
`;

export function getVisionOsTemplate(): ProjectFiles {
  return {
    "/README.md": { code: README, hidden: false },
    "/project.yml": { code: PROJECT_YML, hidden: true },
    "/Info.plist": { code: INFO_PLIST, hidden: true },
    "/WybitnaVisionApp.swift": { code: APP_SWIFT, hidden: false },
    "/ContentView.swift": { code: CONTENT_VIEW, hidden: false, active: true },
    "/GlobeView.swift": { code: GLOBE_VIEW, hidden: false },
    "/ImmersiveView.swift": { code: IMMERSIVE_VIEW, hidden: false },
  };
}
