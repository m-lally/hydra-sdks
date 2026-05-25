// swift-tools-version: 5.5
import PackageDescription

let package = Package(
    name: "HydraPayments",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
        .tvOS(.v15),
        .watchOS(.v8)
    ],
    products: [
        .library(
            name: "HydraPayments",
            targets: ["HydraPayments"]
        )
    ],
    targets: [
        .target(
            name: "HydraPayments"
        ),
        .testTarget(
            name: "HydraPaymentsTests",
            dependencies: ["HydraPayments"]
        )
    ]
)
