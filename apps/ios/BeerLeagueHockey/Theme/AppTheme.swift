import SwiftUI

enum AppTheme {
    static let background = Color(hex: "#07111E")
    static let backgroundSecondary = Color(hex: "#0D1A2B")
    static let surface = Color.white.opacity(0.08)
    static let elevatedSurface = Color.white.opacity(0.12)
    static let stroke = Color.white.opacity(0.14)
    static let strongStroke = Color.white.opacity(0.22)
    static let accent = Color(hex: "#4FD8FF")
    static let accentSecondary = Color(hex: "#7A8CFF")
    static let success = Color(hex: "#3FE08B")
    static let warning = Color(hex: "#F4B75F")
    static let danger = Color(hex: "#F05A67")
    static let textPrimary = Color(hex: "#F7FBFF")
    static let textSecondary = Color(hex: "#9CB0C8")
    static let textMuted = Color(hex: "#71839B")
}

extension Color {
    init(hex: String) {
        let cleaned = hex.replacingOccurrences(of: "#", with: "")
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)

        let red = Double((value >> 16) & 0xFF) / 255
        let green = Double((value >> 8) & 0xFF) / 255
        let blue = Double(value & 0xFF) / 255

        self.init(red: red, green: green, blue: blue)
    }
}

enum BLHFormatters {
    static func gameDate(_ date: Date) -> String {
        date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day().hour().minute())
    }

    static func gameTime(_ date: Date) -> String {
        date.formatted(.dateTime.hour().minute())
    }

    static func shortDate(_ date: Date) -> String {
        date.formatted(.dateTime.month(.abbreviated).day())
    }
}
