package hydra

import (
	"crypto/hmac"
	"encoding/json"
	"fmt"
)

// ============================================
// Enums
// ============================================

// AccountType represents the type of financial account.
type AccountType string

const (
	AccountTypeCompany    AccountType = "company"
	AccountTypePersonal   AccountType = "personal"
	AccountTypeFractional AccountType = "fractional"
)

// TransactionStatus represents the current state of a transaction.
type TransactionStatus string

const (
	TransactionStatusPending   TransactionStatus = "pending"
	TransactionStatusCompleted TransactionStatus = "completed"
	TransactionStatusFailed    TransactionStatus = "failed"
)

// TransactionType represents the direction/kind of transaction.
type TransactionType string

const (
	TransactionTypeTransfer TransactionType = "transfer"
	TransactionTypeCredit   TransactionType = "credit"
	TransactionTypeDebit    TransactionType = "debit"
)

// WalletType represents the custody model of a cryptocurrency wallet.
type WalletType string

const (
	WalletTypeCustodial    WalletType = "custodial"
	WalletTypeNonCustodial WalletType = "non-custodial"
)

// PaymentStatus represents the lifecycle state of a payment intent.
type PaymentStatus string

const (
	PaymentStatusPending        PaymentStatus = "pending"
	PaymentStatusRequiresAction PaymentStatus = "requires_action"
	PaymentStatusSucceeded      PaymentStatus = "succeeded"
	PaymentStatusFailed         PaymentStatus = "failed"
)

// ============================================
// Core Models
// ============================================

// Account represents a financial account in the double-entry ledger.
type Account struct {
	ID          string  `json:"id"`
	OwnerID     string  `json:"owner_id"`
	AccountType string  `json:"account_type"`
	Currency    string  `json:"currency"`
	Balance     string  `json:"balance"`
	Metadata    *string `json:"metadata,omitempty"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   *string `json:"updated_at,omitempty"`
}

// Transaction represents a transfer, credit, or debit between accounts.
type Transaction struct {
	ID                string  `json:"id"`
	SourceAccountID   *string `json:"source_account_id,omitempty"`
	DestAccountID     *string `json:"dest_account_id,omitempty"`
	Amount            string  `json:"amount"`
	Currency          string  `json:"currency"`
	Status            string  `json:"status"`
	TransactionType   string  `json:"transaction_type"`
	Reference         *string `json:"reference,omitempty"`
	Description       *string `json:"description,omitempty"`
	Metadata          *string `json:"metadata,omitempty"`
	PreviousStateHash *string `json:"previous_state_hash,omitempty"`
	CreatedAt         string  `json:"created_at"`
	UpdatedAt         *string `json:"updated_at,omitempty"`
}

// Wallet represents a cryptocurrency wallet for sending/receiving funds.
type Wallet struct {
	ID                  string  `json:"id"`
	OwnerID             string  `json:"owner_id"`
	WalletType          string  `json:"wallet_type"`
	Chain               string  `json:"chain"`
	Address             string  `json:"address"`
	IsCustodial         bool    `json:"is_custodial"`
	EncryptedPrivateKey *string `json:"encrypted_private_key,omitempty"`
	CreatedAt           string  `json:"created_at"`
	UpdatedAt           *string `json:"updated_at,omitempty"`
}

// SplitEntry defines a single recipient's share of a split payment.
type SplitEntry struct {
	AccountID  string  `json:"account_id"`
	Percentage float64 `json:"percentage"`
}

// SplitRule represents a configured split payment rule with multiple recipients.
type SplitRule struct {
	ID             string       `json:"id"`
	TransactionID  *string      `json:"transaction_id,omitempty"`
	Total          string       `json:"total"`
	Currency       string       `json:"currency"`
	Splits         []SplitEntry `json:"splits"`
	SinkAccountID  *string      `json:"sink_account_id,omitempty"`
	Status         string       `json:"status"`
	CreatedAt      string       `json:"created_at"`
}

// ============================================
// Generic API Response
// ============================================

// ApiResponse wraps all core API responses. The generic type T represents
// the shape of the data payload when the request succeeds.
type ApiResponse[T any] struct {
	Success bool   `json:"success"`
	Data    *T     `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

// ============================================
// Health Check
// ============================================

// HealthResponse is returned by the /health endpoint.
type HealthResponse struct {
	Status   string `json:"status"`
	Version  string `json:"version"`
	Database string `json:"database"`
}

// ============================================
// Payment Gateway Types
// ============================================

// CardInput represents raw card details for tokenization.
type CardInput struct {
	Number   string `json:"number"`
	ExpMonth int    `json:"exp_month"`
	ExpYear  int    `json:"exp_year"`
	CVC      string `json:"cvc"`
}

// CardDetails contains the non-sensitive card metadata returned after tokenization.
type CardDetails struct {
	Brand    string `json:"brand"`
	Last4    string `json:"last4"`
	ExpMonth int    `json:"exp_month"`
	ExpYear  int    `json:"exp_year"`
}

// CreateTokenRequest is the payload for card tokenization.
type CreateTokenRequest struct {
	Card       CardInput `json:"card"`
	MerchantID *string   `json:"merchant_id,omitempty"`
}

// CreateTokenResponse is returned after successfully tokenizing a card.
type CreateTokenResponse struct {
	ID        string      `json:"id"`
	Card      CardDetails `json:"card"`
	CreatedAt string      `json:"created_at"`
}

// CreateIntentRequest is the payload for creating a payment intent.
type CreateIntentRequest struct {
	Amount         int     `json:"amount"`
	Currency       string  `json:"currency"`
	Token          *string `json:"token,omitempty"`
	MerchantID     *string `json:"merchant_id,omitempty"`
	IdempotencyKey *string `json:"idempotency_key,omitempty"`
}

// CreateIntentResponse is returned after creating a payment intent.
type CreateIntentResponse struct {
	ID           string `json:"id"`
	Status       string `json:"status"`
	Amount       int    `json:"amount"`
	Currency     string `json:"currency"`
	ClientSecret string `json:"client_secret"`
}

// CreateRefundRequest is the payload for refunding a charge.
type CreateRefundRequest struct {
	ChargeID string `json:"charge_id"`
	Amount   *int   `json:"amount,omitempty"`
}

// CreateRefundResponse is returned after creating a refund.
type CreateRefundResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Amount int    `json:"amount"`
	Charge string `json:"charge"`
}

// CommissionResponse contains the total commission collected.
type CommissionResponse struct {
	TotalCommission int `json:"total_commission"`
}

// ============================================
// Webhook Types
// ============================================

// StripeWebhookEvent represents an incoming Stripe webhook payload.
type StripeWebhookEvent struct {
	ID   string          `json:"id"`
	Type string          `json:"type"`
	Data StripeEventData `json:"data"`
}

// StripeEventData wraps the event object payload.
type StripeEventData struct {
	Object StripeEventObject `json:"object"`
}

// StripeEventObject contains the relevant Stripe resource data.
type StripeEventObject struct {
	ID            *string `json:"id,omitempty"`
	Status        *string `json:"status,omitempty"`
	PaymentIntent *string `json:"payment_intent,omitempty"`
	Charge        *string `json:"charge,omitempty"`
	Amount        *int    `json:"amount,omitempty"`
	Currency      *string `json:"currency,omitempty"`
}

// WebhookResponse is returned after successfully receiving a webhook event.
type WebhookResponse struct {
	Received bool `json:"received"`
}

// ============================================
// Request Types (for core API)
// ============================================

// CreateAccountRequest is the payload for creating a new account.
type CreateAccountRequest struct {
	OwnerID     string  `json:"owner_id"`
	AccountType string  `json:"account_type"`
	Currency    *string `json:"currency,omitempty"`
}

// TransferRequest is the payload for creating a transfer between two accounts.
type TransferRequest struct {
	SourceID  string  `json:"source_id"`
	DestID    string  `json:"dest_id"`
	Amount    string  `json:"amount"`
	Currency  *string `json:"currency,omitempty"`
	Reference *string `json:"reference,omitempty"`
}

// CreateWalletRequest is the payload for creating a new crypto wallet.
type CreateWalletRequest struct {
	OwnerID             string  `json:"owner_id"`
	WalletType          string  `json:"wallet_type"`
	Chain               string  `json:"chain"`
	Address             string  `json:"address"`
	EncryptedPrivateKey *string `json:"encrypted_private_key,omitempty"`
}

// RelayRequest contains the signed transaction data for blockchain relay.
type RelayRequest struct {
	SignedTransaction string `json:"signed_transaction"`
}

// RelayResponse contains the transaction hash returned after a successful relay.
type RelayResponse struct {
	TransactionHash string `json:"transaction_hash"`
}

// CreateSplitRequest is the payload for creating a split payment rule.
type CreateSplitRequest struct {
	Total     string       `json:"total"`
	Currency  *string      `json:"currency,omitempty"`
	Splits    []SplitEntry `json:"splits"`
	Reference *string      `json:"reference,omitempty"`
}

// ============================================
// Error Types
// ============================================

// HydraError is the base error type for all SDK errors.
type HydraError struct {
	Message    string      `json:"message"`
	Code       string      `json:"code"`
	StatusCode int         `json:"status_code,omitempty"`
	Details    interface{} `json:"details,omitempty"`
}

func (e *HydraError) Error() string {
	return e.Message
}

// AuthenticationError is returned when API authentication fails (HTTP 401).
type AuthenticationError struct {
	HydraError
}

// NewAuthenticationError creates a new AuthenticationError with the given message and details.
func NewAuthenticationError(message string, details interface{}) *AuthenticationError {
	return &AuthenticationError{
		HydraError: HydraError{
			Message:    message,
			Code:       "AUTHENTICATION_ERROR",
			StatusCode: 401,
			Details:    details,
		},
	}
}

func (e *AuthenticationError) Unwrap() error { return &e.HydraError }

// ValidationError is returned when a request fails validation (HTTP 400).
type ValidationError struct {
	HydraError
}

// NewValidationError creates a new ValidationError with the given message and details.
func NewValidationError(message string, details interface{}) *ValidationError {
	return &ValidationError{
		HydraError: HydraError{
			Message:    message,
			Code:       "VALIDATION_ERROR",
			StatusCode: 400,
			Details:    details,
		},
	}
}

func (e *ValidationError) Unwrap() error { return &e.HydraError }

// NotFoundError is returned when a resource is not found (HTTP 404).
type NotFoundError struct {
	HydraError
}

// NewNotFoundError creates a new NotFoundError with the given message and details.
func NewNotFoundError(message string, details interface{}) *NotFoundError {
	return &NotFoundError{
		HydraError: HydraError{
			Message:    message,
			Code:       "NOT_FOUND",
			StatusCode: 404,
			Details:    details,
		},
	}
}

func (e *NotFoundError) Unwrap() error { return &e.HydraError }

// parseError maps an HTTP status code and response body to the appropriate error type.
func parseError(statusCode int, body []byte) error {
	var apiResp ApiResponse[json.RawMessage]
	if err := json.Unmarshal(body, &apiResp); err == nil && apiResp.Error != "" {
		switch statusCode {
		case 401:
			return NewAuthenticationError(apiResp.Error, json.RawMessage(body))
		case 404:
			return NewNotFoundError(apiResp.Error, json.RawMessage(body))
		case 400:
			return NewValidationError(apiResp.Error, json.RawMessage(body))
		default:
			return &HydraError{
				Message:    apiResp.Error,
				Code:       "API_ERROR",
				StatusCode: statusCode,
				Details:    json.RawMessage(body),
			}
		}
	}

	return &HydraError{
		Message:    fmt.Sprintf("Request failed with status %d", statusCode),
		Code:       "API_ERROR",
		StatusCode: statusCode,
		Details:    string(body),
	}
}

// compile-time interface checks
var _ error = (*HydraError)(nil)
var _ error = (*AuthenticationError)(nil)
var _ error = (*ValidationError)(nil)
var _ error = (*NotFoundError)(nil)

// ensure hmac is used (import reference for unused dependency)
var _ = hmac.Equal
