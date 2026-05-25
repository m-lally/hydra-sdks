require_relative '../spec_helper'

class TestException < Minitest::Test
  def test_hydra_error_has_correct_defaults
    ex = HydraPayments::HydraError.new('Something went wrong', status_code: 500)
    assert_equal 500, ex.status_code
    assert_equal 'API_ERROR', ex.error_code
    assert_equal 'Something went wrong', ex.message
    assert_nil ex.details
  end

  def test_hydra_error_with_custom_error_code
    ex = HydraPayments::HydraError.new('Bad gateway', status_code: 502, error_code: 'BAD_GATEWAY', details: 'details here')
    assert_equal 502, ex.status_code
    assert_equal 'BAD_GATEWAY', ex.error_code
    assert_equal 'Bad gateway', ex.message
    assert_equal 'details here', ex.details
  end

  def test_authentication_error
    ex = HydraPayments::AuthenticationError.new('Invalid API key')
    assert_equal 401, ex.status_code
    assert_equal 'AUTHENTICATION_ERROR', ex.error_code
    assert_equal 'Invalid API key', ex.message
  end

  def test_validation_error
    ex = HydraPayments::ValidationError.new('Invalid input')
    assert_equal 400, ex.status_code
    assert_equal 'VALIDATION_ERROR', ex.error_code
  end

  def test_not_found_error
    ex = HydraPayments::NotFoundError.new('Resource not found')
    assert_equal 404, ex.status_code
    assert_equal 'NOT_FOUND', ex.error_code
  end

  def test_authentication_is_hydra_error
    ex = HydraPayments::AuthenticationError.new('test')
    assert_kind_of HydraPayments::HydraError, ex
  end

  def test_validation_is_hydra_error
    ex = HydraPayments::ValidationError.new('test')
    assert_kind_of HydraPayments::HydraError, ex
  end

  def test_not_found_is_hydra_error
    ex = HydraPayments::NotFoundError.new('test')
    assert_kind_of HydraPayments::HydraError, ex
  end

  def test_authentication_is_standard_error
    ex = HydraPayments::AuthenticationError.new('test')
    assert_kind_of StandardError, ex
  end

  def test_details_are_passed_through
    ex = HydraPayments::ValidationError.new('bad input', details: '{"field":"amount"}')
    assert_equal 'bad input', ex.message
    assert_equal '{"field":"amount"}', ex.details
  end
end
