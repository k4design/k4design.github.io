# ChordCraft

AI-powered chord progression generator for iOS, built with SwiftUI and the Anthropic API.

## Features

- **Generate from Verse** — Input your verse chords and get AI-crafted progressions for chorus, pre-chorus, bridge, and outro
- **Full Song Generator** — Choose key, scale, genre, and mood; Claude composes a complete song structure (intro through outro)
- **Music theory aware** — Automatic key detection, Roman numeral analysis, color-coded chord quality
- **Save favorites** — Heart any progression to persist it locally
- **History** — Last 10 sessions stored so you can revisit without regenerating
- **Share** — Copy individual progressions or export a full song chart as plain text

## Requirements

- Xcode 15+
- iOS 17+ deployment target
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

## Setup

### 1. Clone and open

```bash
git clone <repo-url>
cd chordprog
open ChordCraft.xcodeproj
```

### 2. Configure API key

**Option A — Config.plist (recommended for dev)**

Copy the template and add your key:

```bash
cp ChordCraft/Config.plist.example ChordCraft/Config.plist
```

Then edit `Config.plist` and set `ANTHROPIC_API_KEY` to your key. This file is gitignored.

**Option B — In-app settings**

Launch the app, tap the gear icon on the home screen (or complete onboarding), and paste your API key. It's stored in `UserDefaults` on-device.

### 3. Build & run

Select a simulator or device in Xcode and press ⌘R.

## Project Structure

```
ChordCraft/
├── ChordCraftApp.swift          Entry point, onboarding gate
├── Config.plist                 API key (gitignored)
│
├── Models/
│   ├── ChordProgression.swift   Core progression model + JSON response types
│   ├── SongSection.swift        Section types and enums
│   └── SongStructure.swift      Full song model + generation session history
│
├── ViewModels/
│   ├── SectionGeneratorViewModel.swift
│   └── FullSongViewModel.swift
│
├── Views/
│   ├── HomeView.swift           Landing screen with two mode cards
│   ├── SectionGeneratorView.swift
│   ├── FullSongGeneratorView.swift
│   ├── ProgressionResultCard.swift
│   ├── ChordPillView.swift      Chord chips + chord picker modal
│   ├── SongStructureView.swift  Timeline layout for full song results
│   ├── SavedProgressionsView.swift
│   ├── SettingsView.swift
│   ├── OnboardingView.swift
│   └── DesignSystem.swift       Colors, fonts, shared modifiers
│
├── Services/
│   └── AnthropicService.swift   Anthropic API client (URLSession, async/await)
│
└── Utilities/
    └── MusicTheoryHelpers.swift  Key detection, Roman numeral analysis
```

## Architecture

MVVM with SwiftUI. No third-party dependencies — all networking uses `URLSession` async/await. Data persistence is `UserDefaults` (encoded as JSON) for saved progressions and generation history.

## API Usage

The app sends requests to `claude-sonnet-4-20250514` via the `/v1/messages` endpoint. Claude is prompted to return structured JSON only, which is decoded directly into Swift model objects. Both generation modes use a single `AnthropicService` actor with two async methods:

- `generateSectionProgressions(verseChords:key:sections:variations:)`
- `generateFullSong(key:scale:genre:tempoFeel:emotionalVibe:)`

## Design Tokens

| Token | Value | Usage |
|---|---|---|
| Background | `#0D0D14` | App background |
| Surface | `#12121E` | Secondary backgrounds |
| Card | `#1A1A2E` | Card fills |
| Accent (gold) | `#F5A623` | Primary actions, chorus |
| Teal | `#4ECDC4` | Secondary, verse |
| Chorus | `#F5A623` | Section badge |
| Bridge | `#F87171` | Section badge |
| Pre-Chorus | `#A78BFA` | Section badge |
