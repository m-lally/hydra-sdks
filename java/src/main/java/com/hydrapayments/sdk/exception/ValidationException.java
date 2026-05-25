package com.hydrapayments.sdk.exception;

public class ValidationException extends HydraException {

    private static final String ERROR_CODE = "VALIDATION_ERROR";
    private static final int STATUS_CODE = 400;

    public ValidationException(String message) {
        super(message, ERROR_CODE, STATUS_CODE, null);
    }

    public ValidationException(String message, Object details) {
        super(message, ERROR_CODE, STATUS_CODE, details);
    }
}
