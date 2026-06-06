#if os(macOS)
    import Darwin
    import Darwin.POSIX.fcntl
#elseif os(Linux)
    import Glibc

    public enum Darwin {
        @inline(__always) public static func close(_ fd: Int32) -> Int32 {
            Glibc.close(fd)
        }

        @inline(__always) public static func read(_ fd: Int32, _ buf: UnsafeMutableRawPointer?, _ nbyte: Int) -> Int {
            Glibc.read(fd, buf, nbyte)
        }

        @inline(__always) public static func write(_ fd: Int32, _ buf: UnsafeRawPointer?, _ nbyte: Int) -> Int {
            Glibc.write(fd, buf, nbyte)
        }

        @inline(__always) public static func connect(_ fd: Int32, _ addr: UnsafePointer<sockaddr>?, _ len: socklen_t) -> Int32 {
            Glibc.connect(fd, addr, len)
        }

        @inline(__always) public static func recv(_ fd: Int32, _ buf: UnsafeMutableRawPointer?, _ len: Int, _ flags: Int32) -> Int {
            Glibc.recv(fd, buf, len, flags)
        }

        @inline(__always) public static func poll(_ fds: UnsafeMutablePointer<pollfd>?, _ nfds: nfds_t, _ timeout: Int32) -> Int32 {
            Glibc.poll(fds, nfds, timeout)
        }

        @inline(__always) public static func socketpair(_ domain: Int32, _ type: Int32, _ protocol: Int32, _ sv: UnsafeMutablePointer<Int32>?) -> Int32 {
            Glibc.socketpair(domain, type, `protocol`, sv)
        }

        public static var stdout: UnsafeMutablePointer<FILE> {
            Glibc.stdout
        }

        public static var stderr: UnsafeMutablePointer<FILE> {
            Glibc.stderr
        }
    }

    public let SOCK_STREAM = Int32(Glibc.SOCK_STREAM.rawValue)
#endif

public enum POSIXDescriptorConfigurationError: Error, Equatable, Sendable {
    case invalidFileDescriptor(fd: Int32)
    case getDescriptorFlagsFailed(fd: Int32, errno: Int32)
    case setDescriptorFlagsFailed(fd: Int32, errno: Int32)

    public var errnoValue: Int32 {
        switch self {
        case .invalidFileDescriptor:
            EBADF
        case let .getDescriptorFlagsFailed(_, errno), let .setDescriptorFlagsFailed(_, errno):
            errno
        }
    }
}

public enum POSIXDescriptorSupport {
    public static func setCloseOnExec(_ fd: Int32) throws {
        guard fd >= 0 else {
            throw POSIXDescriptorConfigurationError.invalidFileDescriptor(fd: fd)
        }

        let flags = fcntl(fd, F_GETFD)
        guard flags != -1 else {
            throw POSIXDescriptorConfigurationError.getDescriptorFlagsFailed(fd: fd, errno: errno)
        }

        guard fcntl(fd, F_SETFD, flags | FD_CLOEXEC) != -1 else {
            throw POSIXDescriptorConfigurationError.setDescriptorFlagsFailed(fd: fd, errno: errno)
        }
    }

    public static func shutdownSocketReadWrite(_ fd: Int32) {
        guard fd >= 0 else { return }
        _ = shutdown(fd, Int32(SHUT_RDWR))
    }
}
