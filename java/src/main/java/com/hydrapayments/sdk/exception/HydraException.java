package com.hydrapayments.sdk.exception;

public class HydraException extends RuntimeException {

    private final String errorCode;
    private final int statusCode;
    private final Object details;

    public HydraException(String message) {
        this(message, "API_ERROR", 0, null, null);
    }

    public HydraException(String message, String errorCode) {
        this(message, errorCode, 0, null, null);
    }

    public HydraException(String message, String errorCode, int statusCode, Object details) {
        this(message, errorCode, statusCode, details, null);
    }

    public HydraException(String message, String errorCode, int statusCode, Object details, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.statusCode = statusCode;
        this.details = details;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public Object getDetails() {
        return details;
    }
}
