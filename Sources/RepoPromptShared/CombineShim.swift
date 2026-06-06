import Dispatch
import Foundation

#if !canImport(Combine)
    public final class AnyCancellable: Hashable, @unchecked Sendable {
        private let _cancel: @Sendable () -> Void
        public init(_ cancel: @escaping @Sendable () -> Void) {
            _cancel = cancel
        }

        public func cancel() {
            _cancel()
        }

        public func store(in set: inout Set<AnyCancellable>) {
            set.insert(self)
        }

        public static func == (lhs: AnyCancellable, rhs: AnyCancellable) -> Bool {
            ObjectIdentifier(lhs) == ObjectIdentifier(rhs)
        }

        public func hash(into hasher: inout Hasher) {
            hasher.combine(ObjectIdentifier(self))
        }
    }

    public struct AnyPublisher<Output, Failure: Error> {
        private let _subscribe: @Sendable (@escaping @Sendable (Output) -> Void) -> AnyCancellable
        init(subscribe: @escaping @Sendable (@escaping @Sendable (Output) -> Void) -> AnyCancellable) {
            _subscribe = subscribe
        }

        public func sink(
            receiveValue: @escaping @Sendable (Output) -> Void
        ) -> AnyCancellable {
            _subscribe(receiveValue)
        }
    }

    public final class PassthroughSubject<Output, Failure: Error>: @unchecked Sendable {
        private let lock = NSLock()
        private var subscribers: [UUID: @Sendable (Output) -> Void] = [:]

        public init() {}

        public func send(_ value: Output) {
            lock.lock()
            let subs = Array(subscribers.values)
            lock.unlock()
            for sub in subs {
                sub(value)
            }
        }

        public func eraseToAnyPublisher() -> AnyPublisher<Output, Failure> {
            AnyPublisher { [weak self] receiveValue in
                let id = UUID()
                self?.lock.lock()
                self?.subscribers[id] = receiveValue
                self?.lock.unlock()
                return AnyCancellable { [weak self] in
                    self?.lock.lock()
                    self?.subscribers.removeValue(forKey: id)
                    self?.lock.unlock()
                }
            }
        }
    }

    @propertyWrapper
    public struct Published<Value>: Sendable where Value: Sendable {
        private final class Storage: @unchecked Sendable {
            var value: Value
            let subject = PassthroughSubject<Value, Never>()
            init(value: Value) {
                self.value = value
            }
        }

        private let storage: Storage

        public init(wrappedValue: Value) {
            storage = Storage(value: wrappedValue)
        }

        public var wrappedValue: Value {
            get { storage.value }
            set {
                storage.value = newValue
                storage.subject.send(newValue)
            }
        }

        public struct Publisher {
            private let subject: PassthroughSubject<Value, Never>
            init(subject: PassthroughSubject<Value, Never>) {
                self.subject = subject
            }

            public func removeDuplicates() -> Publisher { self }
            public func receive(on queue: DispatchQueue) -> Publisher { self }
            public func sink(receiveValue: @escaping @Sendable (Value) -> Void) -> AnyCancellable {
                subject.eraseToAnyPublisher().sink(receiveValue: receiveValue)
            }
        }

        public var projectedValue: Publisher {
            Publisher(subject: storage.subject)
        }
    }

    public final class ObservableObjectPublisher: @unchecked Sendable {
        public init() {}
        public func send() {}
    }

    public protocol ObservableObject: AnyObject {
        var objectWillChange: ObservableObjectPublisher { get }
    }

    public extension ObservableObject {
        var objectWillChange: ObservableObjectPublisher {
            ObservableObjectPublisher()
        }
    }

    @propertyWrapper
    public struct Binding<Value> {
        private let getter: () -> Value
        private let setter: (Value) -> Void
        public init(get: @escaping () -> Value, set: @escaping (Value) -> Void) {
            getter = get
            setter = set
        }

        public var wrappedValue: Value {
            get { getter() }
            set { setter(newValue) }
        }

        public var projectedValue: Binding<Value> { self }

        public static func constant(_ value: Value) -> Binding<Value> {
            Binding(get: { value }, set: { _ in })
        }
    }
#endif

#if !canImport(CoreServices)
    public typealias FSEventStreamRef = OpaquePointer
    public typealias FSEventStreamEventFlags = UInt32
    public typealias FSEventStreamEventId = UInt64

    public let kFSEventStreamEventFlagMustScanSubDirs = 1
    public let kFSEventStreamEventFlagRootChanged = 2
    public let kFSEventStreamEventFlagItemIsDir = 4
    public let kFSEventStreamEventFlagItemIsFile = 8
    public let kFSEventStreamEventFlagItemIsSymlink = 16
    public let kFSEventStreamEventFlagItemCreated = 32
    public let kFSEventStreamEventFlagItemRemoved = 64
    public let kFSEventStreamEventFlagItemRenamed = 128
    public let kFSEventStreamEventFlagItemModified = 256
    public let kFSEventStreamEventFlagItemXattrMod = 512
    public let kFSEventStreamEventFlagItemInodeMetaMod = 1024
    public let kFSEventStreamEventFlagItemFinderInfoMod = 2048
    public let kFSEventStreamEventFlagItemChangeOwner = 4096
    public let kFSEventStreamEventFlagUserDropped = 8192
    public let kFSEventStreamEventFlagKernelDropped = 16384
    public let kFSEventStreamEventIdSinceNow: FSEventStreamEventId = 18_446_744_073_709_551_615

    public struct FSEventStreamContext {
        public var version: Int
        public var info: UnsafeMutableRawPointer?
        public var retain: UnsafeRawPointer?
        public var release: UnsafeRawPointer?
        public var copyDescription: UnsafeRawPointer?
        public init(version: Int, info: UnsafeMutableRawPointer?, retain: UnsafeRawPointer?, release: UnsafeRawPointer?, copyDescription: UnsafeRawPointer?) {
            self.version = version
            self.info = info
            self.retain = retain
            self.release = release
            self.copyDescription = copyDescription
        }
    }

    public typealias FSEventStreamCallback = @convention(c) (
        OpaquePointer,
        UnsafeMutableRawPointer?,
        Int,
        UnsafeMutableRawPointer,
        UnsafePointer<UInt32>,
        UnsafePointer<UInt64>
    ) -> Void

    public func FSEventStreamCreate(
        _ allocator: OpaquePointer?,
        _ callback: @escaping FSEventStreamCallback,
        _ context: UnsafeMutablePointer<FSEventStreamContext>?,
        _ pathsToWatch: OpaquePointer?,
        _ sinceWhen: UInt64,
        _ latency: Double,
        _ flags: UInt32
    ) -> FSEventStreamRef? {
        nil
    }

    public func FSEventStreamSetDispatchQueue(
        _ streamRef: FSEventStreamRef,
        _ queue: DispatchQueue
    ) {}

    public func FSEventStreamStart(_ streamRef: FSEventStreamRef) -> Bool {
        false
    }

    public func FSEventStreamStop(_ streamRef: FSEventStreamRef) {}

    public func FSEventStreamFlushSync(_ streamRef: FSEventStreamRef) {}

    public func FSEventStreamInvalidate(_ streamRef: FSEventStreamRef) {}

    public func FSEventStreamRelease(_ streamRef: FSEventStreamRef) {}

    public let kCFAllocatorDefault: OpaquePointer? = nil
    public typealias CFArray = OpaquePointer
    public typealias CFString = OpaquePointer
    public typealias CFTypeRef = OpaquePointer

    public func CFArrayGetCount(_ theArray: CFArray) -> Int {
        0
    }

    public func CFArrayGetValueAtIndex(_ theArray: CFArray, _ idx: Int) -> UnsafeRawPointer? {
        nil
    }

    public func CFGetTypeID(_ cf: CFTypeRef) -> UInt {
        0
    }

    public func CFStringGetTypeID() -> UInt {
        0
    }

    public func CFStringGetLength(_ theString: CFString) -> Int {
        0
    }

    public enum CFStringBuiltInEncodings: UInt32 {
        case UTF8 = 0x0800_0100
    }

    public func CFStringGetCStringPtr(_ theString: CFString, _ encoding: UInt32) -> UnsafePointer<CChar>? {
        nil
    }

    public func CFStringGetMaximumSizeForEncoding(_ length: Int, _ encoding: UInt32) -> Int {
        0
    }

    public func CFStringGetCString(_ theString: CFString, _ buffer: UnsafeMutablePointer<CChar>?, _ bufferSize: Int, _ encoding: UInt32) -> Bool {
        false
    }

    public struct CFRange {
        public var location: Int
        public var length: Int
        public init(location: Int, length: Int) {
            self.location = location
            self.length = length
        }
    }

    public typealias UniChar = UInt16

    public func CFStringGetCharacters(_ theString: CFString, _ range: CFRange, _ buffer: UnsafeMutablePointer<UniChar>?) {}
#endif
