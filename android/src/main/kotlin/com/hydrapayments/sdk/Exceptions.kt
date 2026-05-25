package com.hydrapayments.sdk

open class HydraError(
    override val message: String,
    val statusCode: Int = 500,
    val errorCode: String = "API_ERROR",
    val details: Map<String, Any?>? = null
) : RuntimeException(message)

class AuthenticationError(
    message: String,
    details: Map<String, Any?>? = null
) : HydraError(message, statusCode = 401, errorCode = "AUTHENTICATION_ERROR", details = details)

class ValidationError(
    message: String,
    details: Map<String, Any?>? = null
) : HydraError(message, statusCode = 400, errorCode = "VALIDATION_ERROR", details = details)

class NotFoundError(
    message: String,
    details: Map<String, Any?>? = null
) : HydraError(message, statusCode = 404, errorCode = "NOT_FOUND", details = details)
