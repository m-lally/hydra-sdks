module HydraPayments
  class ClientBuilder
    def initialize
      @base_url = 'http://localhost:8080'
      @api_key = ''
      @secret_key = ''
      @default_currency = 'GBP'
      @locale = 'en'
      @http_adapter = nil
    end

    def base_url(url)
      @base_url = url.sub(/\/+$/, '')
      self
    end

    def api_key(key)
      @api_key = key
      self
    end

    def secret_key(key)
      @secret_key = key
      self
    end

    def default_currency(currency)
      @default_currency = currency
      self
    end

    def locale(locale)
      @locale = locale
      self
    end

    def http_adapter(adapter)
      @http_adapter = adapter
      self
    end

    def build
      Client.new(
        base_url: @base_url,
        api_key: @api_key,
        secret_key: @secret_key,
        default_currency: @default_currency,
        locale: @locale,
        http_adapter: @http_adapter
      )
    end
  end
end
