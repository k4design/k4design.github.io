import Foundation

enum AnthropicError: LocalizedError {
    case missingAPIKey
    case invalidResponse
    case parseError(String)
    case apiError(String)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "API key not configured. Please add your Anthropic API key in Settings."
        case .invalidResponse:
            return "Received an invalid response from the API."
        case .parseError(let detail):
            return "Failed to parse response: \(detail)"
        case .apiError(let message):
            return "API error: \(message)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

actor AnthropicService {

    static let shared = AnthropicService()
    private let baseURL = "https://api.anthropic.com/v1/messages"
    private let model = "claude-sonnet-4-20250514"

    private var apiKey: String {
        if let stored = UserDefaults.standard.string(forKey: "anthropic_api_key"), !stored.isEmpty {
            return stored
        }
        if let path = Bundle.main.path(forResource: "Config", ofType: "plist"),
           let dict = NSDictionary(contentsOfFile: path),
           let key = dict["ANTHROPIC_API_KEY"] as? String,
           !key.isEmpty {
            return key
        }
        return ""
    }

    // MARK: - Section Progressions

    func generateSectionProgressions(
        verseChords: [String],
        key: String,
        sections: [String],
        variations: Int
    ) async throws -> ProgressionResponse {
        guard !apiKey.isEmpty else { throw AnthropicError.missingAPIKey }

        let sectionsStr = sections.joined(separator: ", ")
        let chordsStr = verseChords.joined(separator: ", ")

        let prompt = """
        You are an expert music theorist and songwriter. Given a verse chord progression, generate musically coherent chord progressions for other song sections.

        Verse chords: \(chordsStr)
        Detected key: \(key)
        Generate progressions for: \(sectionsStr)
        Variations per section: \(variations)

        Requirements:
        - Each progression should be 4 chords unless musically justified otherwise
        - Progressions must complement the verse harmonically
        - Use proper voice leading and common practice harmony
        - Include Roman numeral analysis relative to \(key)
        - Provide emotional context in the "feel" field
        - Give a brief theory explanation in "description"

        Respond ONLY with valid JSON, no markdown, no explanation outside the JSON:
        {
          "key": "\(key)",
          "progressions": [
            {
              "section": "Chorus",
              "variation": 1,
              "chords": ["C", "G", "Am", "F"],
              "roman_numerals": ["I", "V", "vi", "IV"],
              "feel": "Anthemic and uplifting",
              "description": "Classic I-V-vi-IV creates a bright emotional lift from the verse"
            }
          ]
        }
        """

        return try await sendRequest(prompt: prompt, responseType: ProgressionResponse.self)
    }

    // MARK: - Full Song

    func generateFullSong(
        key: String,
        scale: String,
        genre: String,
        tempoFeel: String,
        emotionalVibe: String
    ) async throws -> FullSongResponse {
        guard !apiKey.isEmpty else { throw AnthropicError.missingAPIKey }

        let prompt = """
        You are an expert music theorist and songwriter. Generate a complete song structure with chord progressions.

        Parameters:
        - Key: \(key)
        - Scale/Mode: \(scale)
        - Genre: \(genre)
        - Tempo feel: \(tempoFeel.isEmpty ? "medium" : tempoFeel)
        - Emotional vibe: \(emotionalVibe.isEmpty ? "not specified" : emotionalVibe)

        Generate progressions for: Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro

        Requirements:
        - Each section should have a distinct harmonic character but relate to the whole
        - Use genre-appropriate chord vocabulary
        - Roman numerals should be relative to \(key) \(scale)
        - The intro and outro may reuse motifs from verse/chorus

        Respond ONLY with valid JSON, no markdown, no explanation outside the JSON:
        {
          "key": "\(key)",
          "scale": "\(scale)",
          "genre": "\(genre)",
          "overall_feel": "Description of the song's emotional arc",
          "progressions": [
            {
              "section": "Intro",
              "variation": 1,
              "chords": ["Am", "F", "C", "G"],
              "roman_numerals": ["i", "VI", "III", "VII"],
              "feel": "Mysterious and atmospheric",
              "description": "Sets the dark tonal center with natural minor movement"
            }
          ]
        }
        """

        return try await sendRequest(prompt: prompt, responseType: FullSongResponse.self)
    }

    // MARK: - Private

    private func sendRequest<T: Decodable>(prompt: String, responseType: T.Type) async throws -> T {
        guard let url = URL(string: baseURL) else { throw AnthropicError.invalidResponse }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")

        let body: [String: Any] = [
            "model": model,
            "max_tokens": 4096,
            "messages": [
                ["role": "user", "content": prompt]
            ]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AnthropicError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            if let errorBody = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let error = errorBody["error"] as? [String: Any],
               let message = error["message"] as? String {
                throw AnthropicError.apiError(message)
            }
            throw AnthropicError.apiError("HTTP \(httpResponse.statusCode)")
        }

        // Parse the Anthropic response envelope
        guard let responseJSON = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let content = responseJSON["content"] as? [[String: Any]],
              let firstContent = content.first,
              let text = firstContent["text"] as? String else {
            throw AnthropicError.invalidResponse
        }

        // Extract JSON from the text response (strip any accidental markdown fences)
        let jsonText = extractJSON(from: text)

        guard let jsonData = jsonText.data(using: .utf8) else {
            throw AnthropicError.parseError("Could not encode response text as UTF-8")
        }

        do {
            let decoder = JSONDecoder()
            return try decoder.decode(T.self, from: jsonData)
        } catch {
            throw AnthropicError.parseError(error.localizedDescription)
        }
    }

    private func extractJSON(from text: String) -> String {
        // Strip markdown code fences if present
        var cleaned = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleaned.hasPrefix("```json") {
            cleaned = String(cleaned.dropFirst(7))
        } else if cleaned.hasPrefix("```") {
            cleaned = String(cleaned.dropFirst(3))
        }
        if cleaned.hasSuffix("```") {
            cleaned = String(cleaned.dropLast(3))
        }
        return cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
