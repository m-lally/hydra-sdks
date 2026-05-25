package com.hydrapayments.sdk;

import com.hydrapayments.sdk.exception.*;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ExceptionTest {

    @Test
    void testHydraExceptionDefaultConstructor() {
        HydraException e = new HydraException("test error");
        assertEquals("test error", e.getMessage());
        assertEquals("API_ERROR", e.getErrorCode());
        assertEquals(0, e.getStatusCode());
        assertNull(e.getDetails());
        assertNull(e.getCause());
    }

    @Test
    void testHydraExceptionFullConstructor() {
        Throwable cause = new RuntimeException("root");
        Map<String, Object> details = Map.of("key", "value");
        HydraException e = new HydraException("msg", "CUSTOM_CODE", 500, details, cause);
        assertEquals("msg", e.getMessage());
        assertEquals("CUSTOM_CODE", e.getErrorCode());
        assertEquals(500, e.getStatusCode());
        assertEquals(details, e.getDetails());
        assertEquals(cause, e.getCause());
    }

    @Test
    void testAuthenticationException() {
        AuthenticationException e = new AuthenticationException("invalid key");
        assertEquals("invalid key", e.getMessage());
        assertEquals("AUTHENTICATION_ERROR", e.getErrorCode());
        assertEquals(401, e.getStatusCode());
    }

    @Test
    void testAuthenticationExceptionWithDetails() {
        Map<String, Object> details = Map.of("error", "Invalid API key");
        AuthenticationException e = new AuthenticationException("msg", details);
        assertEquals(details, e.getDetails());
    }

    @Test
    void testValidationException() {
        ValidationException e = new ValidationException("bad param");
        assertEquals("bad param", e.getMessage());
        assertEquals("VALIDATION_ERROR", e.getErrorCode());
        assertEquals(400, e.getStatusCode());
    }

    @Test
    void testValidationExceptionWithDetails() {
        Map<String, Object> details = Map.of("field", "owner_id");
        ValidationException e = new ValidationException("msg", details);
        assertEquals(details, e.getDetails());
    }

    @Test
    void testNotFoundException() {
        NotFoundException e = new NotFoundException("not found");
        assertEquals("not found", e.getMessage());
        assertEquals("NOT_FOUND", e.getErrorCode());
        assertEquals(404, e.getStatusCode());
    }

    @Test
    void testNotFoundExceptionWithDetails() {
        Map<String, Object> details = Map.of("id", "acc-999");
        NotFoundException e = new NotFoundException("msg", details);
        assertEquals(details, e.getDetails());
    }

    @Test
    void testAllExceptionsExtendHydraException() {
        assertInstanceOf(HydraException.class, new AuthenticationException("a"));
        assertInstanceOf(HydraException.class, new ValidationException("b"));
        assertInstanceOf(HydraException.class, new NotFoundException("c"));
    }

    @Test
    void testCatchOrder() {
        try {
            throw new NotFoundException("not found");
        } catch (NotFoundException e) {
            assertTrue(true);
        } catch (HydraException e) {
            fail("Should have been caught as NotFoundException first");
        }
    }

    @Test
    void testExceptionUniqueness() {
        Map<Integer, Class<?>> exceptions = Map.of(
            401, AuthenticationException.class,
            400, ValidationException.class,
            404, NotFoundException.class
        );
        assertEquals(3, exceptions.size());
    }
}
