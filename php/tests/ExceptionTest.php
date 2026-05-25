<?php

declare(strict_types=1);

namespace HydraPayments\Sdk\Tests;

use HydraPayments\Sdk\AuthenticationException;
use HydraPayments\Sdk\HydraException;
use HydraPayments\Sdk\NotFoundException;
use HydraPayments\Sdk\ValidationException;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;

#[CoversClass(HydraException::class)]
#[CoversClass(AuthenticationException::class)]
#[CoversClass(ValidationException::class)]
#[CoversClass(NotFoundException::class)]
class ExceptionTest extends TestCase
{
    // ============================================
    // HydraException (Base)
    // ============================================

    public function test_hydra_exception_extends_runtime_exception(): void
    {
        $exception = new HydraException();
        $this->assertInstanceOf(\RuntimeException::class, $exception);
        $this->assertInstanceOf(HydraException::class, $exception);
    }

    public function test_hydra_exception_default_values(): void
    {
        $exception = new HydraException();
        $this->assertSame('', $exception->getMessage());
        $this->assertSame('API_ERROR', $exception->errorCode);
        $this->assertSame(0, $exception->getCode());
        $this->assertNull($exception->details);
    }

    public function test_hydra_exception_custom_values(): void
    {
        $details = ['field' => 'amount'];
        $previous = new \Exception('previous');
        $exception = new HydraException(
            message: 'Custom error',
            errorCode: 'CUSTOM_CODE',
            statusCode: 418,
            details: $details,
            previous: $previous,
        );

        $this->assertSame('Custom error', $exception->getMessage());
        $this->assertSame('CUSTOM_CODE', $exception->errorCode);
        $this->assertSame(418, $exception->getCode());
        $this->assertSame($details, $exception->details);
        $this->assertSame($previous, $exception->getPrevious());
    }

    public function test_hydra_exception_zero_status_code(): void
    {
        $exception = new HydraException(statusCode: 0);
        $this->assertSame(0, $exception->getCode());
    }

    // ============================================
    // AuthenticationException
    // ============================================

    public function test_authentication_exception_defaults(): void
    {
        $exception = new AuthenticationException();

        $this->assertInstanceOf(HydraException::class, $exception);
        $this->assertInstanceOf(AuthenticationException::class, $exception);
        $this->assertSame('Authentication failed', $exception->getMessage());
        $this->assertSame('AUTHENTICATION_ERROR', $exception->errorCode);
        $this->assertSame(401, $exception->getCode());
        $this->assertNull($exception->details);
    }

    public function test_authentication_exception_custom_message(): void
    {
        $exception = new AuthenticationException(message: 'Invalid API key');
        $this->assertSame('Invalid API key', $exception->getMessage());
        $this->assertSame(401, $exception->getCode());
    }

    public function test_authentication_exception_with_details(): void
    {
        $details = ['key' => 'pk_test', 'reason' => 'expired'];
        $exception = new AuthenticationException(
            message: 'Key expired',
            details: $details,
        );

        $this->assertSame(401, $exception->getCode());
        $this->assertSame($details, $exception->details);
    }

    public function test_authentication_exception_with_previous(): void
    {
        $previous = new \Exception('underlying');
        $exception = new AuthenticationException(previous: $previous);

        $this->assertSame($previous, $exception->getPrevious());
    }

    // ============================================
    // ValidationException
    // ============================================

    public function test_validation_exception_defaults(): void
    {
        $exception = new ValidationException();

        $this->assertInstanceOf(HydraException::class, $exception);
        $this->assertInstanceOf(ValidationException::class, $exception);
        $this->assertSame('Validation failed', $exception->getMessage());
        $this->assertSame('VALIDATION_ERROR', $exception->errorCode);
        $this->assertSame(400, $exception->getCode());
        $this->assertNull($exception->details);
    }

    public function test_validation_exception_custom_message(): void
    {
        $exception = new ValidationException(message: 'Invalid account type');
        $this->assertSame('Invalid account type', $exception->getMessage());
        $this->assertSame(400, $exception->getCode());
    }

    public function test_validation_exception_with_details(): void
    {
        $details = ['field' => 'currency', 'value' => 'XYZ'];
        $exception = new ValidationException(
            message: 'Invalid currency',
            details: $details,
        );

        $this->assertSame(400, $exception->getCode());
        $this->assertSame($details, $exception->details);
    }

    // ============================================
    // NotFoundException
    // ============================================

    public function test_not_found_exception_defaults(): void
    {
        $exception = new NotFoundException();

        $this->assertInstanceOf(HydraException::class, $exception);
        $this->assertInstanceOf(NotFoundException::class, $exception);
        $this->assertSame('Resource not found', $exception->getMessage());
        $this->assertSame('NOT_FOUND', $exception->errorCode);
        $this->assertSame(404, $exception->getCode());
        $this->assertNull($exception->details);
    }

    public function test_not_found_exception_custom_message(): void
    {
        $exception = new NotFoundException(message: 'Account not found');
        $this->assertSame('Account not found', $exception->getMessage());
        $this->assertSame(404, $exception->getCode());
    }

    public function test_not_found_exception_with_details(): void
    {
        $details = ['id' => 'acc-999'];
        $exception = new NotFoundException(
            message: 'Not found',
            details: $details,
        );

        $this->assertSame(404, $exception->getCode());
        $this->assertSame($details, $exception->details);
    }

    // ============================================
    // Exception Hierarchy
    // ============================================

    public function test_all_exceptions_are_hydra_exceptions(): void
    {
        $exceptions = [
            new AuthenticationException(),
            new ValidationException(),
            new NotFoundException(),
        ];

        foreach ($exceptions as $exception) {
            $this->assertInstanceOf(HydraException::class, $exception);
            $this->assertInstanceOf(\RuntimeException::class, $exception);
            $this->assertInstanceOf(\Exception::class, $exception);
            $this->assertInstanceOf(\Throwable::class, $exception);
        }
    }

    public function test_exception_catch_order(): void
    {
        // Verify that catching HydraException catches all typed exceptions
        $caught = false;
        try {
            throw new NotFoundException(message: 'test');
        } catch (HydraException $e) {
            $caught = true;
            $this->assertInstanceOf(NotFoundException::class, $e);
        }

        $this->assertTrue($caught, 'NotFoundException should be caught as HydraException');
    }

    public function test_exception_status_codes_are_unique(): void
    {
        $this->assertNotSame(
            (new AuthenticationException())->getCode(),
            (new ValidationException())->getCode(),
        );
        $this->assertNotSame(
            (new AuthenticationException())->getCode(),
            (new NotFoundException())->getCode(),
        );
        $this->assertNotSame(
            (new ValidationException())->getCode(),
            (new NotFoundException())->getCode(),
        );
    }

    public function test_exception_error_codes_are_unique(): void
    {
        $codes = [
            (new AuthenticationException())->errorCode,
            (new ValidationException())->errorCode,
            (new NotFoundException())->errorCode,
        ];

        $this->assertSame($codes, array_unique($codes));
    }
}
