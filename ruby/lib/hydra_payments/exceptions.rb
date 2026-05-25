module HydraPayments
  class HydraError < StandardError
    attr_reader :error_code, :status_code, :details

    def initialize(message, status_code:, error_code: 'API_ERROR', details: nil)
      super(message)
      @error_code = error_code
      @status_code = status_code
      @details = details
    end
  end

  class AuthenticationError < HydraError
    def initialize(message, details: nil)
      super(message, status_code: 401, error_code: 'AUTHENTICATION_ERROR', details: details)
    end
  end

  class ValidationError < HydraError
    def initialize(message, details: nil)
      super(message, status_code: 400, error_code: 'VALIDATION_ERROR', details: details)
    end
  end

  class NotFoundError < HydraError
    def initialize(message, details: nil)
      super(message, status_code: 404, error_code: 'NOT_FOUND', details: details)
    end
  end
end
