package com.hydrapayments.sdk.exception;

public class AuthenticationException extends HydraException {

    private static final String ERROR_CODE = "AUTHENTICATION_ERROR";
    private static final int STATUS_CODE = 401;

    public AuthenticationException(String message) {
        super(message, ERROR_CODE, STATUS_CODE, null);
    }

    public AuthenticationException(String message, Object details) {
        super(message, ERROR_CODE, STATUS_CODE, details);
    }
}
