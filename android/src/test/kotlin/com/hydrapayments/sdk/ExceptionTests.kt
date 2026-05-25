package com.hydrapayments.sdk

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ExceptionTests {
    @Test
    fun hydraErrorDefaults() {
        val error = HydraError("Something went wrong")
        assertEquals("Something went wrong", error.message)
        assertEquals(500, error.statusCode)
        assertEquals("API_ERROR", error.errorCode)
        assertNull(error.details)
    }

    @Test
    fun hydraErrorWithCustomErrorCodeAndDetails() {
        val details = mapOf("field" to "amount")
        val error = HydraError("Custom error", 422, "CUSTOM_ERROR", details)
        assertEquals(422, error.statusCode)
        assertEquals("CUSTOM_ERROR", error.errorCode)
        assertEquals("amount", error.details?.get("field"))
    }

    @Test
    fun authenticationError() {
        val error = AuthenticationError("Invalid API key")
        assertEquals(401, error.statusCode)
        assertEquals("AUTHENTICATION_ERROR", error.errorCode)
    }

    @Test
    fun validationError() {
        val error = ValidationError("Validation failed")
        assertEquals(400, error.statusCode)
        assertEquals("VALIDATION_ERROR", error.errorCode)
    }

    @Test
    fun notFoundError() {
        val error = NotFoundError("Not found")
        assertEquals(404, error.statusCode)
        assertEquals("NOT_FOUND", error.errorCode)
    }

    @Test
    fun allSubclassesAreHydraError() {
        val errors: List<HydraError> = listOf(
            AuthenticationError("a"),
            ValidationError("v"),
            NotFoundError("n"),
            HydraError("h")
        )
        assertEquals(4, errors.size)
        errors.forEach { assertTrue(it is HydraError) }
    }

    @Test
    fun detailsPassedToSubclass() {
        val details = mapOf("reason" to "test")
        val error = ValidationError("bad", details)
        assertEquals("test", error.details?.get("reason"))
    }
}
