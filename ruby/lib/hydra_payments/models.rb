module HydraPayments
  module Models
    class HealthResponse
      attr_reader :status, :version, :database

      def initialize(attrs = {})
        @status = attrs['status']
        @version = attrs['version']
        @database = attrs['database']
      end

      def is_healthy?
        @status == 'healthy'
      end
    end

    class ApiResponse
      attr_reader :success, :data, :error

      def initialize(attrs = {})
        @success = attrs['success']
        @data = attrs['data']
        @error = attrs['error']
      end
    end

    class Account
      attr_reader :id, :owner_id, :account_type, :currency, :balance, :metadata, :created_at, :updated_at

      def initialize(attrs = {})
        @id = attrs['id']
        @owner_id = attrs['owner_id']
        @account_type = attrs['account_type']
        @currency = attrs['currency']
        @balance = attrs['balance']
        @metadata = attrs['metadata']
        @created_at = attrs['created_at']
        @updated_at = attrs['updated_at']
      end
    end

    class Transaction
      attr_reader :id, :source_account_id, :dest_account_id, :amount, :currency,
                  :status, :transaction_type, :reference, :description, :metadata,
                  :previous_state_hash, :created_at, :updated_at

      def initialize(attrs = {})
        @id = attrs['id']
        @source_account_id = attrs['source_account_id']
        @dest_account_id = attrs['dest_account_id']
        @amount = attrs['amount']
        @currency = attrs['currency']
        @status = attrs['status']
        @transaction_type = attrs['transaction_type']
        @reference = attrs['reference']
        @description = attrs['description']
        @metadata = attrs['metadata']
        @previous_state_hash = attrs['previous_state_hash']
        @created_at = attrs['created_at']
        @updated_at = attrs['updated_at']
      end
    end

    class Wallet
      attr_reader :id, :owner_id, :wallet_type, :chain, :address, :is_custodial,
                  :encrypted_private_key, :created_at, :updated_at

      def initialize(attrs = {})
        @id = attrs['id']
        @owner_id = attrs['owner_id']
        @wallet_type = attrs['wallet_type']
        @chain = attrs['chain']
        @address = attrs['address']
        @is_custodial = attrs['is_custodial']
        @encrypted_private_key = attrs['encrypted_private_key']
        @created_at = attrs['created_at']
        @updated_at = attrs['updated_at']
      end
    end

    class SplitEntry
      attr_reader :account_id, :percentage

      def initialize(attrs = {})
        @account_id = attrs['account_id']
        @percentage = attrs['percentage']
      end
    end

    class SplitRule
      attr_reader :id, :transaction_id, :total, :currency, :splits, :sink_account_id, :status, :created_at

      def initialize(attrs = {})
        @id = attrs['id']
        @transaction_id = attrs['transaction_id']
        @total = attrs['total']
        @currency = attrs['currency']
        @splits = (attrs['splits'] || []).map { |s| SplitEntry.new(s) }
        @sink_account_id = attrs['sink_account_id']
        @status = attrs['status']
        @created_at = attrs['created_at']
      end
    end

    class CardInput
      attr_reader :number, :exp_month, :exp_year, :cvc

      def initialize(number:, exp_month:, exp_year:, cvc:)
        @number = number
        @exp_month = exp_month
        @exp_year = exp_year
        @cvc = cvc
      end
    end

    class CardDetails
      attr_reader :brand, :last4, :exp_month, :exp_year

      def initialize(attrs = {})
        @brand = attrs['brand']
        @last4 = attrs['last4']
        @exp_month = attrs['exp_month']
        @exp_year = attrs['exp_year']
      end
    end

    class CreateTokenResponse
      attr_reader :id, :card, :created_at

      def initialize(attrs = {})
        @id = attrs['id']
        @card = CardDetails.new(attrs['card'] || {})
        @created_at = attrs['created_at']
      end
    end

    class CreateIntentResponse
      attr_reader :id, :status, :amount, :currency, :client_secret

      def initialize(attrs = {})
        @id = attrs['id']
        @status = attrs['status']
        @amount = attrs['amount']
        @currency = attrs['currency']
        @client_secret = attrs['client_secret']
      end
    end

    class CreateRefundResponse
      attr_reader :id, :status, :amount, :charge

      def initialize(attrs = {})
        @id = attrs['id']
        @status = attrs['status']
        @amount = attrs['amount']
        @charge = attrs['charge']
      end
    end

    class CommissionResponse
      attr_reader :total_commission

      def initialize(attrs = {})
        @total_commission = attrs['total_commission']
      end
    end

    class WebhookResponse
      attr_reader :received

      def initialize(attrs = {})
        @received = attrs['received']
      end
    end
  end
end
