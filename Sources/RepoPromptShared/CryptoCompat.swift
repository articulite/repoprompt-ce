#if !canImport(CryptoKit)
    import Foundation

    public struct SHA256Digest: Sequence, Collection, RandomAccessCollection {
        public typealias Element = UInt8
        public typealias Index = Int

        private let bytes: [UInt8]

        init(bytes: [UInt8]) {
            self.bytes = bytes
        }

        public var startIndex: Int {
            bytes.startIndex
        }

        public var endIndex: Int {
            bytes.endIndex
        }

        public subscript(position: Int) -> UInt8 {
            bytes[position]
        }

        public func index(after i: Int) -> Int {
            bytes.index(after: i)
        }

        public func makeIterator() -> IndexingIterator<[UInt8]> {
            bytes.makeIterator()
        }
    }

    public enum SHA256 {
        public static func hash(data: some DataProtocol) -> SHA256Digest {
            let inputBytes = Array(data)
            var message = inputBytes

            // padding
            let bitLength = UInt64(inputBytes.count) * 8
            message.append(0x80)

            while (message.count * 8) % 512 != 448 {
                message.append(0)
            }

            // append length in bits as 64-bit big-endian integer
            var lenBytes = [UInt8](repeating: 0, count: 8)
            for i in 0 ..< 8 {
                lenBytes[i] = UInt8((bitLength >> (56 - i * 8)) & 0xFF)
            }
            message.append(contentsOf: lenBytes)

            // Constants (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19)
            var h0: UInt32 = 0x6A09_E667
            var h1: UInt32 = 0xBB67_AE85
            var h2: UInt32 = 0x3C6E_F372
            var h3: UInt32 = 0xA54F_F53A
            var h4: UInt32 = 0x510E_527F
            var h5: UInt32 = 0x9B05_688C
            var h6: UInt32 = 0x1F83_D9AB
            var h7: UInt32 = 0x5BE0_CD19

            // Constants (first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
            let k: [UInt32] = [
                0x428A_2F98, 0x7137_4491, 0xB5C0_FBCF, 0xE9B5_DBA5, 0x3956_C25B, 0x59F1_11F1, 0x923F_82A4, 0xAB1C_5ED5,
                0xD807_AA98, 0x1283_5B01, 0x2431_85BE, 0x550C_7DC3, 0x72BE_5D74, 0x80DE_B1FE, 0x9BDC_06A7, 0xC19B_F174,
                0xE49B_69C1, 0xEFBE_4786, 0x0FC1_9DC6, 0x240C_A1CC, 0x2DE9_2C6F, 0x4A74_84AA, 0x5CB0_A9DC, 0x76F9_88DA,
                0x983E_5152, 0xA831_C66D, 0xB003_27C8, 0xBF59_7FC7, 0xC6E0_0BF3, 0xD5A7_9147, 0x06CA_6351, 0x1429_2967,
                0x27B7_0A85, 0x2E1B_2138, 0x4D2C_6DFC, 0x5338_0D13, 0x650A_7354, 0x766A_0ABB, 0x81C2_C92E, 0x9272_2C85,
                0xA2BF_E8A1, 0xA81A_664B, 0xC24B_8B70, 0xC76C_51A3, 0xD192_E819, 0xD699_0624, 0xF40E_3585, 0x106A_A070,
                0x19A4_C116, 0x1E37_6C08, 0x2748_774C, 0x34B0_BCB5, 0x391C_0CB3, 0x4ED8_AA4A, 0x5B9C_CA4F, 0x682E_6FF3,
                0x748F_82EE, 0x78A5_636F, 0x84C8_7814, 0x8CC7_0208, 0x90BE_FFFA, 0xA450_6CEB, 0xBEF9_A3F7, 0xC671_78F2
            ]

            let chunkCount = message.count / 64
            for chunkIndex in 0 ..< chunkCount {
                let offset = chunkIndex * 64
                var w = [UInt32](repeating: 0, count: 64)
                for t in 0 ..< 16 {
                    let idx = offset + t * 4
                    w[t] = (UInt32(message[idx]) << 24) |
                        (UInt32(message[idx + 1]) << 16) |
                        (UInt32(message[idx + 2]) << 8) |
                        UInt32(message[idx + 3])
                }

                for t in 16 ..< 64 {
                    let s0 = (w[t - 15] >> 7 | w[t - 15] << 25) ^ (w[t - 15] >> 18 | w[t - 15] << 14) ^ (w[t - 15] >> 3)
                    let s1 = (w[t - 2] >> 17 | w[t - 2] << 15) ^ (w[t - 2] >> 19 | w[t - 2] << 13) ^ (w[t - 2] >> 10)
                    w[t] = w[t - 16] &+ s0 &+ w[t - 7] &+ s1
                }

                var a = h0
                var b = h1
                var c = h2
                var d = h3
                var e = h4
                var f = h5
                var g = h6
                var h = h7

                for t in 0 ..< 64 {
                    let s1 = (e >> 6 | e << 26) ^ (e >> 11 | e << 21) ^ (e >> 25 | e << 7)
                    let ch = (e & f) ^ (~e & g)
                    let temp1 = h &+ s1 &+ ch &+ k[t] &+ w[t]
                    let s0 = (a >> 2 | a << 30) ^ (a >> 13 | a << 19) ^ (a >> 22 | a << 10)
                    let maj = (a & b) ^ (a & c) ^ (b & c)
                    let temp2 = s0 &+ maj

                    h = g
                    g = f
                    f = e
                    e = d &+ temp1
                    d = c
                    c = b
                    b = a
                    a = temp1 &+ temp2
                }

                h0 = h0 &+ a
                h1 = h1 &+ b
                h2 = h2 &+ c
                h3 = h3 &+ d
                h4 = h4 &+ e
                h5 = h5 &+ f
                h6 = h6 &+ g
                h7 = h7 &+ h
            }

            var result = [UInt8](repeating: 0, count: 32)
            let hashValues = [h0, h1, h2, h3, h4, h5, h6, h7]
            for i in 0 ..< 8 {
                let val = hashValues[i]
                result[i * 4] = UInt8((val >> 24) & 0xFF)
                result[i * 4 + 1] = UInt8((val >> 16) & 0xFF)
                result[i * 4 + 2] = UInt8((val >> 8) & 0xFF)
                result[i * 4 + 3] = UInt8(val & 0xFF)
            }

            return SHA256Digest(bytes: result)
        }
    }
#endif
