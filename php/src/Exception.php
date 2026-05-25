<?php

declare(strict_types=1);

namespace HydraPayments\Sdk;

/**
 * Base exception for all Hydra SDK errors.
 */
class HydraException extends \RuntimeException
{
    public function __construct(
        string $message = '',
        public readonly string $errorCode = 'API_ERROR',
        ?int $statusCode = null,
        public readonly mixed $details = null,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, $statusCode ?? 0, $previous);
    }
}

/**
 * Thrown when API authentication fails (HTTP 401).
 */
class AuthenticationException extends HydraException
{
    public function __construct(
        string $message = 'Authentication failed',
        mixed $details = null,
        ?\Throwable $previous = null,
    ) {
        parent::__construct(
            message: $message,
            errorCode: 'AUTHENTICATION_ERROR',
            statusCode: 401,
            details: $details,
            previous: $previous,
        );
    }
}

/**
 * Thrown when a request fails validation (HTTP 400).
 */
class ValidationException extends HydraException
{
    public function __construct(
        string $message = 'Validation failed',
        mixed $details = null,
        ?\Throwable $previous = null,
    ) {
        parent::__construct(
            message: $message,
            errorCode: 'VALIDATION_ERROR',
            statusCode: 400,
            details: $details,
            previous: $previous,
        );
    }
}

/**
 * Thrown when a resource is not found (HTTP 404).
 */
class NotFoundException extends HydraException
{
    public function __construct(
        string $message = 'Resource not found',
        mixed $details = null,
        ?\Throwable $previous = null,
    ) {
        parent::__construct(
            message: $message,
            errorCode: 'NOT_FOUND',
            statusCode: 404,
            details: $details,
            previous: $previous,
        );
    }
}
