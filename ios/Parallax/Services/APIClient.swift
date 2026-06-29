import Foundation
import Observation

@Observable
final class APIClient {
    enum AnalysisState: Equatable {
        case idle
        case searching
        case foundRestaurant(RestaurantEvent)
        case decomposing(RestaurantEvent)
        case completed(AnalysisResult)
        case error(String, suggestion: String?)

        static func == (lhs: AnalysisState, rhs: AnalysisState) -> Bool {
            switch (lhs, rhs) {
            case (.idle, .idle), (.searching, .searching): return true
            case (.foundRestaurant(let a), .foundRestaurant(let b)): return a.name == b.name
            case (.decomposing(let a), .decomposing(let b)): return a.name == b.name
            case (.completed, .completed): return true
            case (.error(let a, _), .error(let b, _)): return a == b
            default: return false
            }
        }
    }

    private(set) var state: AnalysisState = .idle
    private(set) var rateLimitRemaining: Int?
    private var currentTask: Task<Void, Never>?

    private static let baseURL = "https://parallax-ten-sigma.vercel.app"
    private static let apiKey = "" // Set via config or Keychain for production

    struct AnalyzeRequest: Encodable {
        let query: String
        let intent: String
    }

    @MainActor
    func analyze(query: String, intent: String) {
        currentTask?.cancel()
        state = .searching

        if DemoData.isDemo(query: query) {
            state = .completed(DemoData.result)
            return
        }

        currentTask = Task {
            await performAnalysis(query: query, intent: intent)
        }
    }

    func cancel() {
        currentTask?.cancel()
        currentTask = nil
        Task { @MainActor in state = .idle }
    }

    private func performAnalysis(query: String, intent: String) async {
        let url = URL(string: "\(Self.baseURL)/api/analyze")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !Self.apiKey.isEmpty {
            request.setValue("Bearer \(Self.apiKey)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try? JSONEncoder().encode(AnalyzeRequest(query: query, intent: intent))
        request.timeoutInterval = 90

        do {
            let (asyncBytes, response) = try await URLSession.shared.bytes(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                await setError("Invalid response from server")
                return
            }

            if let remaining = httpResponse.value(forHTTPHeaderField: "X-RateLimit-Remaining") {
                await MainActor.run { rateLimitRemaining = Int(remaining) }
            }

            guard httpResponse.statusCode == 200 else {
                let body = try await collectBody(asyncBytes)
                let apiError = try? JSONDecoder().decode(APIError.self, from: Data(body.utf8))
                await setError(
                    apiError?.error ?? "Request failed (HTTP \(httpResponse.statusCode))",
                    suggestion: apiError?.suggestion
                )
                return
            }

            let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type") ?? ""

            if contentType.contains("application/json") {
                let body = try await collectBody(asyncBytes)
                let result = try JSONDecoder().decode(AnalysisResult.self, from: Data(body.utf8))
                await MainActor.run { state = .completed(result) }
                return
            }

            for try await line in asyncBytes.lines {
                if Task.isCancelled { return }
                guard !line.isEmpty else { continue }

                guard let event = StreamEventParser.parse(line: line) else { continue }

                await MainActor.run {
                    switch event {
                    case .restaurant(let data):
                        state = .foundRestaurant(data)
                    case .decomposed:
                        if case .foundRestaurant(let r) = state {
                            state = .decomposing(r)
                        }
                    case .result(let result):
                        state = .completed(result)
                    case .error(let err):
                        state = .error(err.error, suggestion: err.suggestion)
                    }
                }
            }
        } catch is CancellationError {
            return
        } catch {
            await setError("Connection failed. Check your internet and try again.")
        }
    }

    private func collectBody(_ bytes: URLSession.AsyncBytes) async throws -> String {
        var body = ""
        for try await line in bytes.lines {
            body += line
        }
        return body
    }

    @MainActor
    private func setError(_ message: String, suggestion: String? = nil) {
        state = .error(message, suggestion: suggestion)
    }
}
