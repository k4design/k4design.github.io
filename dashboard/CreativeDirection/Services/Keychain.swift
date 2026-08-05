import Foundation
import Security

/// The dashboard access key is a credential granting read access to the whole
/// board, so it lives in the Keychain rather than UserDefaults — encrypted at
/// rest, excluded from iTunes/iCloud backups, and not readable by simply dumping
/// the app container.
enum Keychain {
    private static let service = "design.k4.CreativeDirection"

    static func set(_ value: String, for account: String) {
        // Always delete first: SecItemAdd fails with errSecDuplicateItem on
        // update, and SecItemUpdate needs a different query shape.
        delete(account)
        guard !value.isEmpty, let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            // Never syncs to other devices, never leaves an unlocked device.
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    static func get(_ account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var out: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data,
              let string = String(data: data, encoding: .utf8),
              !string.isEmpty
        else { return nil }
        return string
    }

    static func delete(_ account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
