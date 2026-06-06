#if canImport(Darwin)
    import Darwin
#elseif canImport(Glibc)
    import Glibc
#endif
import Foundation

enum ProcessDebugLogging {
    static func log(
        prefix: String,
        _ message: @autoclosure () -> String,
        enabled: Bool = true,
        flushStdout: Bool = false
    ) {
        #if DEBUG
            guard enabled else { return }
            print("[\(prefix)] \(message())")
            if flushStdout {
                fflush(stdout)
            }
        #endif
    }
}
