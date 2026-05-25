import XCTest
@testable import HydraPayments

final class ExceptionTests: XCTestCase {
    func testHydraErrorDefaults() {
        let error = HydraError(message: "Something went wrong")
        XCTAssertEqual(error.message, "Something went wrong")
        XCTAssertEqual(error.statusCode, 500)
        XCTAssertEqual(error.errorCode, "API_ERROR")
        XCTAssertNil(error.details)
    }

    func testHydraErrorWithCustomErrorCodeAndDetails() {
        let details = ["field": "amount"]
        let error = HydraError(message: "Custom error", statusCode: 422, errorCode: "CUSTOM_ERROR", details: details)
        XCTAssertEqual(error.statusCode, 422)
        XCTAssertEqual(error.errorCode, "CUSTOM_ERROR")
        XCTAssertEqual(error.details?["field"], "amount")
    }

    func testAuthenticationError() {
        let error = AuthenticationError(message: "Invalid API key")
        XCTAssertEqual(error.statusCode, 401)
        XCTAssertEqual(error.errorCode, "AUTHENTICATION_ERROR")
    }

    func testValidationError() {
        let error = ValidationError(message: "Validation failed")
        XCTAssertEqual(error.statusCode, 400)
        XCTAssertEqual(error.errorCode, "VALIDATION_ERROR")
    }

    func testNotFoundError() {
        let error = NotFoundError(message: "Not found")
        XCTAssertEqual(error.statusCode, 404)
        XCTAssertEqual(error.errorCode, "NOT_FOUND")
    }

    func testAllSubclassesAreHydraError() {
        let errors: [HydraError] = [
            AuthenticationError(message: "a"),
            ValidationError(message: "v"),
            NotFoundError(message: "n"),
            HydraError(message: "h")
        ]
        XCTAssertEqual(errors.count, 4)
        for error in errors {
            XCTAssertEqual(error.statusCode > 0, true)
        }
    }

    func testDetailsPassedToSubclass() {
        let details = ["reason": "test"]
        let error = ValidationError(message: "bad", details: details)
        XCTAssertEqual(error.details?["reason"], "test")
    }
}
