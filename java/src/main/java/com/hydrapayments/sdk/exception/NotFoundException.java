package com.hydrapayments.sdk.exception;

public class NotFoundException extends HydraException {

    private static final String ERROR_CODE = "NOT_FOUND";
    private static final int STATUS_CODE = 404;

    public NotFoundException(String message) {
        super(message, ERROR_CODE, STATUS_CODE, null);
    }

    public NotFoundException(String message, Object details) {
        super(message, ERROR_CODE, STATUS_CODE, details);
    }
}
