require_relative '../spec_helper'

class FakeHttp
  attr_reader :last_method, :last_uri, :last_headers, :last_body

  def initialize
    @responses = []
  end

  def stub_response(status, body)
    @responses << [status.to_s, body]
  end

  def call(method, uri, headers, body = nil)
    @last_method = method
    @last_uri = uri
    @last_headers = headers
    @last_body = body
    status, body_text = @responses.shift || ['200', '{}']
    OpenStruct.new(code: status, body: body_text)
  end
end

class TestClient < Minitest::Test
  include HydraPayments::Models

  def setup
    @fake = FakeHttp.new
    @client = HydraPayments::ClientBuilder.new
      .base_url('http://localhost:9999')
      .api_key('test-api-key')
      .secret_key('test-secret-key')
      .http_adapter(@fake)
      .build
  end

  # ── Builder Tests ──

  def test_builder_defaults
    c = HydraPayments::ClientBuilder.new
      .api_key('k')
      .secret_key('s')
      .build

    assert_kind_of HydraPayments::Client, c
  end

  def test_builder_trailing_slash_stripped
    fake = FakeHttp.new
    fake.stub_response(200, '{"status":"healthy","version":"1.0","database":"ok"}')

    c = HydraPayments::ClientBuilder.new
      .base_url('http://localhost:9999/')
      .api_key('k')
      .secret_key('s')
      .http_adapter(fake)
      .build

    c.health_check
    assert_match %r{^http://localhost:9999/health\b}, fake.last_uri.to_s
  end

  # ── HMAC Signing Tests ──

  def test_sign_message_returns_non_empty_base64
    sig = @client.sign_message('GET:/health:1234567890:')
    refute sig.nil?
    refute sig.empty?
  end

  def test_sign_message_empty_secret_returns_empty
    fake = FakeHttp.new
    c = HydraPayments::ClientBuilder.new
      .api_key('k')
      .secret_key('')
      .http_adapter(fake)
      .build

    assert_equal '', c.sign_message('test')
  end

  def test_sign_message_is_deterministic
    sig1 = @client.sign_message('GET:/health:1234567890:')
    sig2 = @client.sign_message('GET:/health:1234567890:')
    assert_equal sig1, sig2
  end

  def test_sign_message_different_messages_different_signatures
    sig1 = @client.sign_message('GET:/health:1234567890:')
    sig2 = @client.sign_message('POST:/api/accounts:1234567890:')
    refute_equal sig1, sig2
  end

  def test_sign_message_different_keys_different_signatures
    fake = FakeHttp.new
    c1 = HydraPayments::ClientBuilder.new.api_key('k1').secret_key('key1').http_adapter(fake).build
    c2 = HydraPayments::ClientBuilder.new.api_key('k2').secret_key('key2').http_adapter(fake).build

    refute_equal c1.sign_message('test'), c2.sign_message('test')
  end

  # ── Signature Verification Tests ──

  def test_verify_signature_valid
    sig = @client.sign_message('test')
    assert @client.verify_signature('test', sig)
  end

  def test_verify_signature_tampered_payload
    sig = @client.sign_message('test')
    refute @client.verify_signature('tampered', sig)
  end

  def test_verify_signature_wrong_key
    fake = FakeHttp.new
    c1 = HydraPayments::ClientBuilder.new.api_key('k').secret_key('key-a').http_adapter(fake).build
    c2 = HydraPayments::ClientBuilder.new.api_key('k').secret_key('key-b').http_adapter(fake).build

    sig = c1.sign_message('test')
    refute c2.verify_signature('test', sig)
  end

  def test_verify_signature_empty_key_empty_sig
    fake = FakeHttp.new
    c = HydraPayments::ClientBuilder.new.api_key('k').secret_key('').http_adapter(fake).build
    assert c.verify_signature('test', '')
  end

  # ── Health Check Tests ──

  def test_health_check_returns_healthy
    @fake.stub_response(200, '{"status":"healthy","version":"1.0.0","database":"connected"}')

    health = @client.health_check

    assert_equal 'healthy', health.status
    assert health.is_healthy?
    assert_equal :get, @fake.last_method
    assert_equal '/health', @fake.last_uri.path
  end

  def test_health_check_returns_unhealthy
    @fake.stub_response(200, '{"status":"unhealthy","version":"1.0.0","database":"disconnected"}')

    health = @client.health_check

    assert_equal 'unhealthy', health.status
    refute health.is_healthy?
  end

  def test_health_check_server_error
    @fake.stub_response(500, '{"error":"Internal server error"}')

    assert_raises HydraPayments::HydraError do
      @client.health_check
    end
  end

  # ── Account Tests ──

  def test_create_account_with_currency
    @fake.stub_response(200, '{"success":true,"data":{"id":"acc_123","owner_id":"owner_1","account_type":"business","currency":"USD","balance":"0.00","created_at":"2024-01-01T00:00:00Z"}}')

    account = @client.create_account('owner_1', 'business', 'USD')

    assert_equal 'acc_123', account.id
    assert_equal 'USD', account.currency
  end

  def test_create_account_null_currency_uses_default
    @fake.stub_response(200, '{"success":true,"data":{"id":"acc_456","owner_id":"owner_2","account_type":"business","currency":"GBP","balance":"0.00","created_at":"2024-01-01T00:00:00Z"}}')

    account = @client.create_account('owner_2', 'business')

    assert_equal 'GBP', account.currency
  end

  def test_get_account
    @fake.stub_response(200, '{"success":true,"data":{"id":"acc_123","owner_id":"owner_1","account_type":"business","currency":"GBP","balance":"500.00","created_at":"2024-01-01T00:00:00Z"}}')

    account = @client.get_account('acc_123')

    assert_equal 'acc_123', account.id
    assert_equal '500.00', account.balance
  end

  def test_get_accounts_by_owner
    @fake.stub_response(200, '{"success":true,"data":[{"id":"acc_1","owner_id":"owner_1","account_type":"business","currency":"GBP","balance":"100.00","created_at":"2024-01-01T00:00:00Z"}]}')

    accounts = @client.get_accounts_by_owner('owner_1')

    assert_equal 1, accounts.size
    assert_equal 'acc_1', accounts[0].id
  end

  def test_get_accounts_by_owner_empty
    @fake.stub_response(200, '{"success":true,"data":[]}')

    accounts = @client.get_accounts_by_owner('owner_1')

    assert_equal 0, accounts.size
  end

  # ── Transaction Tests ──

  def test_transfer
    @fake.stub_response(200, '{"success":true,"data":{"id":"txn_123","source_account_id":"acc_1","dest_account_id":"acc_2","amount":"100.00","currency":"GBP","status":"pending","transaction_type":"transfer","created_at":"2024-01-01T00:00:00Z"}}')

    tx = @client.transfer('acc_1', 'acc_2', '100.00', 'GBP', 'ref_1')

    assert_equal 'txn_123', tx.id
    assert_equal '100.00', tx.amount
  end

  def test_get_transaction
    @fake.stub_response(200, '{"success":true,"data":{"id":"txn_123","amount":"50.00","currency":"USD","status":"completed","transaction_type":"transfer","created_at":"2024-01-01T00:00:00Z"}}')

    tx = @client.get_transaction('txn_123')

    assert_equal 'txn_123', tx.id
    assert_equal 'completed', tx.status
  end

  def test_complete_transaction_true
    @fake.stub_response(200, '{"success":true}')

    assert @client.complete_transaction('txn_123')
  end

  def test_complete_transaction_false
    @fake.stub_response(200, '{"success":false}')

    refute @client.complete_transaction('txn_123')
  end

  def test_fail_transaction_true
    @fake.stub_response(200, '{"success":true}')

    assert @client.fail_transaction('txn_123')
  end

  # ── Wallet Tests ──

  def test_create_wallet_custodial
    @fake.stub_response(200, '{"success":true,"data":{"id":"wal_123","owner_id":"owner_1","wallet_type":"custodial","chain":"ethereum","address":"0xabc","is_custodial":true,"created_at":"2024-01-01T00:00:00Z"}}')

    wallet = @client.create_wallet('owner_1', 'custodial', 'ethereum', '0xabc')

    assert_equal 'wal_123', wallet.id
    assert wallet.is_custodial
  end

  def test_create_wallet_non_custodial_with_encrypted_key
    @fake.stub_response(200, '{"success":true,"data":{"id":"wal_456","owner_id":"owner_2","wallet_type":"non-custodial","chain":"solana","address":"0xdef","is_custodial":false,"encrypted_private_key":"enc_key","created_at":"2024-01-01T00:00:00Z"}}')

    wallet = @client.create_wallet('owner_2', 'non-custodial', 'solana', '0xdef', 'enc_key')

    refute wallet.is_custodial
    assert_equal 'enc_key', wallet.encrypted_private_key
  end

  def test_get_wallets
    @fake.stub_response(200, '{"success":true,"data":[{"id":"wal_1","owner_id":"owner_1","wallet_type":"custodial","chain":"ethereum","address":"0xabc","is_custodial":true,"created_at":"2024-01-01T00:00:00Z"}]}')

    wallets = @client.get_wallets('owner_1')

    assert_equal 1, wallets.size
    assert_equal 'wal_1', wallets[0].id
  end

  def test_get_wallets_empty
    @fake.stub_response(200, '{"success":true,"data":[]}')

    wallets = @client.get_wallets('owner_1')

    assert_equal 0, wallets.size
  end

  def test_relay_transaction
    @fake.stub_response(200, '{"success":true,"data":{"transaction_hash":"0xhash123"}}')

    hash = @client.relay_transaction('wal_123', 'signed_tx')

    assert_equal '0xhash123', hash
  end

  # ── Split Tests ──

  def test_create_split
    @fake.stub_response(200, '{"success":true,"data":{"id":"split_123","total":"100.00","currency":"GBP","splits":[{"account_id":"acc_1","percentage":60.0},{"account_id":"acc_2","percentage":40.0}],"status":"active","created_at":"2024-01-01T00:00:00Z"}}')

    splits = [
      SplitEntry.new({ 'account_id' => 'acc_1', 'percentage' => 60.0 }),
      SplitEntry.new({ 'account_id' => 'acc_2', 'percentage' => 40.0 })
    ]
    split = @client.create_split('100.00', splits, 'GBP', 'ref_split')

    assert_equal 'split_123', split.id
    assert_equal 2, split.splits.size
  end

  def test_get_split
    @fake.stub_response(200, '{"success":true,"data":{"id":"split_123","total":"100.00","currency":"GBP","splits":[],"status":"active","created_at":"2024-01-01T00:00:00Z"}}')

    split = @client.get_split('split_123')

    assert_equal 'split_123', split.id
  end

  # ── Gateway Tests ──

  def test_create_card_token
    @fake.stub_response(200, '{"id":"tok_123","card":{"brand":"Visa","last4":"1111","exp_month":12,"exp_year":2026},"created_at":"2024-01-01T00:00:00Z"}')

    card = CardInput.new(number: '4111111111111111', exp_month: 12, exp_year: 2026, cvc: '123')
    token = @client.create_card_token(card, 'merchant_1')

    assert_equal 'tok_123', token.id
    assert_equal 'Visa', token.card.brand
  end

  def test_create_payment_intent
    @fake.stub_response(200, '{"id":"pi_123","status":"requires_payment_method","amount":2000,"currency":"GBP","client_secret":"sec_123"}')

    intent = @client.create_payment_intent(2000, 'GBP', 'tok_123', 'merchant_1', 'idem_1')

    assert_equal 'pi_123', intent.id
    assert_equal 2000, intent.amount
  end

  def test_create_refund_full
    @fake.stub_response(200, '{"id":"ref_123","status":"succeeded","amount":1000,"charge":"ch_123"}')

    refund = @client.create_refund('ch_123')

    assert_equal 'ref_123', refund.id
    assert_equal 1000, refund.amount
  end

  def test_create_refund_partial
    @fake.stub_response(200, '{"id":"ref_456","status":"succeeded","amount":500,"charge":"ch_123"}')

    refund = @client.create_refund('ch_123', 500)

    assert_equal 'ref_456', refund.id
    assert_equal 500, refund.amount
  end

  def test_get_commission
    @fake.stub_response(200, '{"total_commission":5000}')

    commission = @client.get_commission

    assert_equal 5000, commission.total_commission
  end

  def test_send_webhook_event
    @fake.stub_response(200, '{"received":true}')

    response = @client.send_webhook_event({ 'event' => 'charge.succeeded', 'amount' => 1000 })

    assert response.received
  end

  def test_get_metrics
    @fake.stub_response(200, 'http_requests_total{method="GET"} 100')

    metrics = @client.get_metrics

    assert_match(/http_requests_total/, metrics)
  end

  # ── Error Mapping Tests ──

  def test_error_401_authentication_error
    @fake.stub_response(401, '{"error":"Invalid API key"}')

    assert_raises HydraPayments::AuthenticationError do
      @client.get_account('acc_123')
    end
  end

  def test_error_404_not_found_error
    @fake.stub_response(404, '{"error":"Account not found"}')

    assert_raises HydraPayments::NotFoundError do
      @client.get_account('nonexistent')
    end
  end

  def test_error_400_validation_error
    @fake.stub_response(400, '{"error":"Invalid input"}')

    assert_raises HydraPayments::ValidationError do
      @client.create_account('', '')
    end
  end

  def test_error_402_hydra_error
    @fake.stub_response(402, '{"error":"Payment required"}')

    ex = assert_raises HydraPayments::HydraError do
      @client.get_commission
    end
    assert_equal 402, ex.status_code
  end

  def test_error_hydra_error_from_unsuccessful_api_response
    @fake.stub_response(200, '{"success":false,"data":null,"error":"Account not found"}')

    assert_raises HydraPayments::HydraError do
      @client.get_account('acc_123')
    end
  end

  # ── Header Verification Tests ──

  def test_request_contains_required_headers
    @fake.stub_response(200, '{"success":true,"data":{"id":"acc_1","owner_id":"o","account_type":"b","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}')

    @client.get_account('acc_1')

    headers = @fake.last_headers
    assert headers.key?('X-API-Key')
    assert headers.key?('X-Timestamp')
    assert headers.key?('X-Signature')
    assert headers.key?('X-Default-Currency')
  end

  def test_request_has_correct_api_key
    @fake.stub_response(200, '{"success":true,"data":{"id":"acc_1","owner_id":"o","account_type":"b","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}')

    @client.get_account('acc_1')

    assert_equal 'test-api-key', @fake.last_headers['X-API-Key']
  end

  def test_request_has_correct_default_currency
    @fake.stub_response(200, '{"success":true,"data":{"id":"acc_1","owner_id":"o","account_type":"b","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}')

    @client.get_account('acc_1')

    assert_equal 'GBP', @fake.last_headers['X-Default-Currency']
  end

  def test_request_has_correct_locale
    fake = FakeHttp.new
    c = HydraPayments::ClientBuilder.new
      .base_url('http://localhost:9999')
      .api_key('k')
      .secret_key('s')
      .locale('en_GB')
      .http_adapter(fake)
      .build

    fake.stub_response(200, '{"success":true,"data":{"id":"acc_1","owner_id":"o","account_type":"b","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}')

    c.get_account('acc_1')

    assert_equal 'en_GB', fake.last_headers['Accept-Language']
  end

  def test_request_body_contains_expected_fields
    @fake.stub_response(200, '{"success":true,"data":{"id":"acc_1","owner_id":"test_owner","account_type":"business","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}')

    @client.create_account('test_owner', 'business', 'GBP')

    body = JSON.parse(@fake.last_body)
    assert_equal 'test_owner', body['owner_id']
    assert_equal 'business', body['account_type']
    assert_equal 'GBP', body['currency']
  end

  def test_request_signature_is_valid_hmac
    @fake.stub_response(200, '{"success":true,"data":{"id":"acc_1","owner_id":"o","account_type":"b","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}')

    @client.get_account('acc_1')

    timestamp = @fake.last_headers['X-Timestamp']
    signature = @fake.last_headers['X-Signature']
    message = "GET:/v1/api/accounts/acc_1:#{timestamp}:"
    expected = @client.sign_message(message)

    assert_equal expected, signature
  end

  def test_post_request_has_content_type
    @fake.stub_response(200, '{"success":true,"data":{"id":"acc_1","owner_id":"o","account_type":"b","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}')

    @client.create_account('o', 'b')

    assert_equal 'application/json', @fake.last_headers['Content-Type']
  end
end
