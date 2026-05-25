require_relative '../spec_helper'

class TestModel < Minitest::Test
  include HydraPayments::Models

  def test_account_deserialization
    json = '{"id":"acc_123","owner_id":"owner_456","account_type":"business","currency":"GBP","balance":"500.00","metadata":"extra","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-02T00:00:00Z"}'
    account = Account.new(JSON.parse(json))

    assert_equal 'acc_123', account.id
    assert_equal 'owner_456', account.owner_id
    assert_equal 'business', account.account_type
    assert_equal 'GBP', account.currency
    assert_equal '500.00', account.balance
    assert_equal 'extra', account.metadata
    assert_equal '2024-01-01T00:00:00Z', account.created_at
    assert_equal '2024-01-02T00:00:00Z', account.updated_at
  end

  def test_account_optional_fields_default_to_nil
    json = '{"id":"acc_123","owner_id":"o","account_type":"b","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}'
    account = Account.new(JSON.parse(json))

    assert_nil account.metadata
    assert_nil account.updated_at
  end

  def test_transaction_deserialization
    json = '{"id":"txn_123","source_account_id":"acc_1","dest_account_id":"acc_2","amount":"100.00","currency":"GBP","status":"completed","transaction_type":"transfer","reference":"ref_1","description":"payment","previous_state_hash":"abc123","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-02T00:00:00Z"}'
    tx = Transaction.new(JSON.parse(json))

    assert_equal 'txn_123', tx.id
    assert_equal 'acc_1', tx.source_account_id
    assert_equal 'acc_2', tx.dest_account_id
    assert_equal '100.00', tx.amount
    assert_equal 'completed', tx.status
    assert_equal 'transfer', tx.transaction_type
    assert_equal 'ref_1', tx.reference
  end

  def test_transaction_optional_fields_default_to_nil
    json = '{"id":"txn_123","amount":"50.00","currency":"USD","status":"pending","transaction_type":"transfer","created_at":"2024-01-01T00:00:00Z"}'
    tx = Transaction.new(JSON.parse(json))

    assert_nil tx.source_account_id
    assert_nil tx.dest_account_id
    assert_nil tx.reference
  end

  def test_wallet_deserialization
    json = '{"id":"wal_123","owner_id":"owner_456","wallet_type":"custodial","chain":"ethereum","address":"0xabc","is_custodial":true,"encrypted_private_key":"enc_key","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-02T00:00:00Z"}'
    wallet = Wallet.new(JSON.parse(json))

    assert_equal 'wal_123', wallet.id
    assert_equal 'custodial', wallet.wallet_type
    assert wallet.is_custodial
    assert_equal 'enc_key', wallet.encrypted_private_key
  end

  def test_wallet_non_custodial
    json = '{"id":"wal_456","owner_id":"owner_789","wallet_type":"non-custodial","chain":"solana","address":"0xdef","is_custodial":false,"created_at":"2024-01-01T00:00:00Z"}'
    wallet = Wallet.new(JSON.parse(json))

    refute wallet.is_custodial
    assert_nil wallet.encrypted_private_key
    assert_nil wallet.updated_at
  end

  def test_split_rule_with_nested_splits
    json = '{"id":"split_123","transaction_id":"txn_123","total":"100.00","currency":"GBP","splits":[{"account_id":"acc_1","percentage":60.0},{"account_id":"acc_2","percentage":40.0}],"sink_account_id":"acc_3","status":"active","created_at":"2024-01-01T00:00:00Z"}'
    split = SplitRule.new(JSON.parse(json))

    assert_equal 'split_123', split.id
    assert_equal 2, split.splits.size
    assert_equal 'acc_1', split.splits[0].account_id
    assert_equal 60.0, split.splits[0].percentage
    assert_equal 40.0, split.splits[1].percentage
    assert_equal 'acc_3', split.sink_account_id
  end

  def test_create_token_response_with_nested_card
    json = '{"id":"tok_123","card":{"brand":"Visa","last4":"1111","exp_month":12,"exp_year":2026},"created_at":"2024-01-01T00:00:00Z"}'
    response = CreateTokenResponse.new(JSON.parse(json))

    assert_equal 'tok_123', response.id
    assert_equal 'Visa', response.card.brand
    assert_equal '1111', response.card.last4
  end

  def test_create_intent_response
    json = '{"id":"pi_123","status":"requires_payment_method","amount":2000,"currency":"GBP","client_secret":"sec_123"}'
    response = CreateIntentResponse.new(JSON.parse(json))

    assert_equal 'pi_123', response.id
    assert_equal 2000, response.amount
    assert_equal 'sec_123', response.client_secret
  end

  def test_create_refund_response
    json = '{"id":"ref_123","status":"succeeded","amount":1000,"charge":"ch_123"}'
    response = CreateRefundResponse.new(JSON.parse(json))

    assert_equal 'ref_123', response.id
    assert_equal 1000, response.amount
    assert_equal 'ch_123', response.charge
  end

  def test_health_response
    json = '{"status":"healthy","version":"1.0.0","database":"connected"}'
    health = HealthResponse.new(JSON.parse(json))

    assert_equal 'healthy', health.status
    assert health.is_healthy?
  end

  def test_health_response_unhealthy
    json = '{"status":"unhealthy","version":"1.0.0","database":"disconnected"}'
    health = HealthResponse.new(JSON.parse(json))

    refute health.is_healthy?
  end

  def test_api_response_success
    json = '{"success":true,"data":{"id":"acc_123"},"error":null}'
    response = ApiResponse.new(JSON.parse(json))

    assert response.success
    assert_equal 'acc_123', response.data['id']
    assert_nil response.error
  end

  def test_api_response_error
    json = '{"success":false,"data":null,"error":"Something went wrong"}'
    response = ApiResponse.new(JSON.parse(json))

    refute response.success
    assert_nil response.data
    assert_equal 'Something went wrong', response.error
  end

  def test_commission_response
    json = '{"total_commission":5000}'
    commission = CommissionResponse.new(JSON.parse(json))

    assert_equal 5000, commission.total_commission
  end

  def test_webhook_response
    json = '{"received":true}'
    webhook = WebhookResponse.new(JSON.parse(json))

    assert webhook.received
  end
end
