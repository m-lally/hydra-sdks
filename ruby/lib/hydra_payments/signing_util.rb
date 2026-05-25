module HydraPayments
  module SigningUtil
    def self.sign(secret, message)
      return '' if secret.nil? || secret.empty?

      hmac = OpenSSL::HMAC.digest('SHA256', secret, message)
      Base64.strict_encode64(hmac)
    end

    def self.verify(secret, message, signature)
      return true if (secret.nil? || secret.empty?) && (signature.nil? || signature.empty?)
      expected = sign(secret, message)
      expected == signature
    end

    def self.build_signing_message(method, path, timestamp, body)
      "#{method}:#{path}:#{timestamp}:#{body}"
    end
  end
end
