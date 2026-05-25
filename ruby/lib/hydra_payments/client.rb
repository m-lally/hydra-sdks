module HydraPayments
  class Client
    attr_reader :base_url, :api_key, :secret_key, :default_currency, :locale

    def initialize(base_url:, api_key:, secret_key:, default_currency: 'GBP', locale: 'en', http_adapter: nil)
      @base_url = base_url
      @api_key = api_key
      @secret_key = secret_key
      @default_currency = default_currency
      @locale = locale
      @http_adapter = http_adapter
    end

    # ── Security ──

    def sign_message(message)
      SigningUtil.sign(@secret_key, message)
    end

    def verify_signature(payload, signature)
      SigningUtil.verify(@secret_key, payload, signature)
    end

    # ── Health ──

    def health_check
      response = send_request(:get, '/health')
      Models::HealthResponse.new(JSON.parse(response))
    end

    # ── Accounts ──

    def create_account(owner_id, account_type, currency = nil)
      body = { owner_id: owner_id, account_type: account_type, currency: currency || @default_currency }
      data = core_request(:post, '/v1/api/accounts', body)
      Models::Account.new(data)
    end

    def get_account(account_id)
      data = core_request(:get, "/v1/api/accounts/#{account_id}")
      Models::Account.new(data)
    end

    def get_accounts_by_owner(owner_id)
      data = core_request(:get, "/v1/api/accounts/owner/#{owner_id}")
      (data || []).map { |a| Models::Account.new(a) }
    end

    # ── Transactions ──

    def transfer(source_id, dest_id, amount, currency = nil, reference = nil)
      body = { source_id: source_id, dest_id: dest_id, amount: amount, currency: currency || @default_currency }
      body[:reference] = reference if reference
      data = core_request(:post, '/v1/api/transactions', body)
      Models::Transaction.new(data)
    end

    def get_transaction(transaction_id)
      data = core_request(:get, "/v1/api/transactions/#{transaction_id}")
      Models::Transaction.new(data)
    end

    def complete_transaction(transaction_id)
      response = send_request(:post, "/v1/api/transactions/#{transaction_id}/complete")
      JSON.parse(response)['success']
    end

    def fail_transaction(transaction_id)
      response = send_request(:post, "/v1/api/transactions/#{transaction_id}/fail")
      JSON.parse(response)['success']
    end

    # ── Wallets ──

    def create_wallet(owner_id, wallet_type, chain, address, encrypted_private_key = nil)
      body = { owner_id: owner_id, wallet_type: wallet_type, chain: chain, address: address }
      body[:encrypted_private_key] = encrypted_private_key if encrypted_private_key
      data = core_request(:post, '/v1/api/wallets', body)
      Models::Wallet.new(data)
    end

    def get_wallets(owner_id)
      data = core_request(:get, "/v1/api/wallets/owner/#{owner_id}")
      (data || []).map { |w| Models::Wallet.new(w) }
    end

    def relay_transaction(wallet_id, signed_transaction)
      body = { signed_transaction: signed_transaction }
      data = core_request(:post, "/v1/api/wallets/#{wallet_id}/relay", body)
      data['transaction_hash']
    end

    # ── Splits ──

    def create_split(total, splits, currency = nil, reference = nil)
      body = {
        total: total,
        splits: splits.map { |s| { account_id: s.account_id, percentage: s.percentage } },
        currency: currency || @default_currency
      }
      body[:reference] = reference if reference
      data = core_request(:post, '/v1/api/splits', body)
      Models::SplitRule.new(data)
    end

    def get_split(split_id)
      data = core_request(:get, "/v1/api/splits/#{split_id}")
      Models::SplitRule.new(data)
    end

    # ── Gateway ──

    def create_card_token(card, merchant_id = nil)
      body = { card: { number: card.number, exp_month: card.exp_month, exp_year: card.exp_year, cvc: card.cvc } }
      body[:merchant_id] = merchant_id if merchant_id
      data = gateway_request(:post, '/v1/payments/tokens', body)
      Models::CreateTokenResponse.new(data)
    end

    def create_payment_intent(amount, currency, token = nil, merchant_id = nil, idempotency_key = nil)
      body = { amount: amount, currency: currency }
      body[:token] = token if token
      body[:merchant_id] = merchant_id if merchant_id
      body[:idempotency_key] = idempotency_key if idempotency_key
      data = gateway_request(:post, '/v1/payments/intents', body)
      Models::CreateIntentResponse.new(data)
    end

    def create_refund(charge_id, amount = nil)
      body = { charge_id: charge_id }
      body[:amount] = amount if amount
      data = gateway_request(:post, '/v1/refunds', body)
      Models::CreateRefundResponse.new(data)
    end

    def get_commission
      data = gateway_request(:get, '/v1/commission')
      Models::CommissionResponse.new(data)
    end

    def send_webhook_event(payload)
      data = gateway_request(:post, '/v1/webhooks/stripe', payload)
      Models::WebhookResponse.new(data)
    end

    def get_metrics
      send_request(:get, '/v1/metrics')
    end

    private

    def core_request(method, path, body = nil)
      response = send_request(method, path, body)
      parsed = JSON.parse(response)

      unless parsed['success'] && parsed['data']
        error_msg = parsed['error'] || 'Request failed'
        raise HydraError.new(error_msg, status_code: 500, error_code: 'API_ERROR')
      end

      parsed['data']
    end

    def gateway_request(method, path, body = nil)
      response = send_request(method, path, body)
      JSON.parse(response)
    end

    def send_request(method, path, body = nil)
      uri = URI("#{@base_url}#{path}")
      timestamp = (Time.now.to_f * 1000).to_i.to_s
      body_json = body ? body.to_json : ''
      message = SigningUtil.build_signing_message(method.to_s.upcase, path, timestamp, body_json)
      signature = SigningUtil.sign(@secret_key, message)

      headers = {
        'X-API-Key' => @api_key,
        'X-Timestamp' => timestamp,
        'X-Signature' => signature,
        'X-Default-Currency' => @default_currency,
        'Accept-Language' => @locale,
        'Accept' => 'application/json'
      }

      unless body_json.empty?
        headers['Content-Type'] = 'application/json'
      end

      response = http_request(method, uri, headers, body_json.empty? ? nil : body_json)

      if response.code.to_i >= 300
        raise parse_error(response.body, response.code.to_i)
      end

      response.body
    end

    def http_request(method, uri, headers, body = nil)
      if @http_adapter
        return @http_adapter.call(method, uri, headers, body)
      end

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == 'https'
      http.open_timeout = 30
      http.read_timeout = 30

      request = case method
      when :get then Net::HTTP::Get.new(uri)
      when :post then Net::HTTP::Post.new(uri)
      when :patch then Net::HTTP::Patch.new(uri)
      when :put then Net::HTTP::Put.new(uri)
      when :delete then Net::HTTP::Delete.new(uri)
      end

      headers.each { |k, v| request[k] = v }
      request.body = body if body

      http.request(request)
    end

    def parse_error(response_body, status_code)
      message = begin
        parsed = JSON.parse(response_body)
        parsed['error'] || "Request failed with status #{status_code}"
      rescue JSON::ParserError
        "Request failed with status #{status_code}"
      end

      case status_code
      when 400 then ValidationError.new(message, details: response_body)
      when 401 then AuthenticationError.new(message, details: response_body)
      when 404 then NotFoundError.new(message, details: response_body)
      else HydraError.new(message, status_code: status_code, details: response_body)
      end
    end
  end
end
