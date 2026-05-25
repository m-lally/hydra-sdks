// Package hydra provides a Go SDK for the Hydra Payment Service.
//
// The SDK supports both the Core Ledger API (accounts, transactions, wallets, splits)
// and the Payment Gateway API (card tokens, payment intents, refunds, commission)
// with automatic HMAC-SHA256 request signing.
//
// Zero external dependencies — uses only Go standard library.
package hydra

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

// HydraClient is the main HTTP client for the Hydra Payment Service.
// It provides HMAC-SHA256 signed requests to both the Core Ledger API
// and the Payment Gateway API.
//
// Create one via NewClient or HydraClientBuilder:
//
//	client := hydra.NewClient("http://localhost:8080", "pk_xxx", "sk_xxx")
//	// or
//	client := hydra.NewHydraClientBuilder().
//	    BaseURL("http://localhost:8080").
//	    APIKey("pk_xxx").
//	    SecretKey("sk_xxx").
//	    WithDefaultCurrency("USD").
//	    WithLocale("fr").
//	    Build()
type HydraClient struct {
	httpClient      *http.Client
	baseURL         string
	apiKey          string
	secretKey       string
	defaultCurrency string
	locale          string
}

// NewClient creates a new HydraClient with the given base URL, API key, and secret key.
// The API key is sent as the X-API-Key header and the secret key is used for
// HMAC-SHA256 request signing.
func NewClient(baseURL, apiKey, secretKey string) *HydraClient {
	return &HydraClient{
		httpClient:      &http.Client{Timeout: 30 * time.Second},
		baseURL:         baseURL,
		apiKey:          apiKey,
		secretKey:       secretKey,
		defaultCurrency: "GBP",
		locale:          "en",
	}
}

// HydraClientBuilder provides a fluent builder pattern for creating a HydraClient
// with custom configuration.
type HydraClientBuilder struct {
	baseURL         string
	apiKey          string
	secretKey       string
	defaultCurrency string
	locale          string
}

// NewHydraClientBuilder creates a new HydraClientBuilder with default values.
// Default base URL is http://localhost:8080, currency is GBP, locale is en.
func NewHydraClientBuilder() *HydraClientBuilder {
	return &HydraClientBuilder{
		baseURL:         "http://localhost:8080",
		defaultCurrency: "GBP",
		locale:          "en",
	}
}

// BaseURL sets the base URL for the API.
func (b *HydraClientBuilder) BaseURL(url string) *HydraClientBuilder {
	b.baseURL = url
	return b
}

// APIKey sets the API key for authentication.
func (b *HydraClientBuilder) APIKey(key string) *HydraClientBuilder {
	b.apiKey = key
	return b
}

// SecretKey sets the secret key for HMAC signing.
func (b *HydraClientBuilder) SecretKey(key string) *HydraClientBuilder {
	b.secretKey = key
	return b
}

// WithDefaultCurrency sets the default currency for transactions.
// Used as the fallback when no currency is specified in API calls.
func (b *HydraClientBuilder) WithDefaultCurrency(currency string) *HydraClientBuilder {
	b.defaultCurrency = currency
	return b
}

// WithLocale sets the locale for i18n support (e.g., "en", "es", "fr", "de").
func (b *HydraClientBuilder) WithLocale(locale string) *HydraClientBuilder {
	b.locale = locale
	return b
}

// Build creates a new HydraClient from the builder's configuration.
func (b *HydraClientBuilder) Build() *HydraClient {
	return &HydraClient{
		httpClient:      &http.Client{Timeout: 30 * time.Second},
		baseURL:         b.baseURL,
		apiKey:          b.apiKey,
		secretKey:       b.secretKey,
		defaultCurrency: b.defaultCurrency,
		locale:          b.locale,
	}
}

// ============================================
// HMAC Signing
// ============================================

// hmacSign creates an HMAC-SHA256 signature of the message using the given secret.
// The signature is base64-encoded. This matches the HMAC signing used by the
// Hydra Payment Service for request authentication.
func hmacSign(secret, message string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(message))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// signRequest generates the HMAC signature and timestamp for a given HTTP method,
// path, and body. The signature message format is:
//
//	METHOD:PATH:TIMESTAMP:BODY
//
// Both the signature and timestamp are returned and should be included as
// X-Signature and X-Timestamp headers respectively.
func (c *HydraClient) signRequest(method, path string, body []byte) (signature, timestamp string) {
	ts := strconv.FormatInt(time.Now().UnixMilli(), 10)
	message := fmt.Sprintf("%s:%s:%s:%s", method, path, ts, string(body))
	sig := hmacSign(c.secretKey, message)
	return sig, ts
}

// ============================================
// HTTP Helpers
// ============================================

// setHeaders sets all required authentication and metadata headers on a request.
func (c *HydraClient) setHeaders(req *http.Request, signature, timestamp string) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-API-Key", c.apiKey)
	req.Header.Set("X-Timestamp", timestamp)
	req.Header.Set("X-Signature", signature)
	req.Header.Set("X-Default-Currency", c.defaultCurrency)
	req.Header.Set("Accept-Language", c.locale)
}

// newRequest creates an authenticated HTTP request with HMAC-SHA256 headers.
func (c *HydraClient) newRequest(method, path string, body []byte) (*http.Request, error) {
	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}
	req, err := http.NewRequest(method, c.baseURL+path, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	sig, ts := c.signRequest(method, path, body)
	c.setHeaders(req, sig, ts)
	return req, nil
}

// doCoreRequest sends a request to a core API endpoint and parses the
// ApiResponse wrapper. It returns the parsed data or an error on failure.
// Generic type T represents the expected data shape in the response.
func doCoreRequest[T any](c *HydraClient, method, path string, body []byte) (*T, error) {
	req, err := c.newRequest(method, path, body)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, parseError(resp.StatusCode, respBody)
	}

	var apiResp ApiResponse[T]
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if !apiResp.Success {
		errMsg := apiResp.Error
		if errMsg == "" {
			errMsg = "Unknown error"
		}
		return nil, &HydraError{
			Message:    errMsg,
			Code:       "API_ERROR",
			StatusCode: resp.StatusCode,
			Details:    string(respBody),
		}
	}

	if apiResp.Data == nil {
		return nil, &HydraError{
			Message:    "Empty response data",
			StatusCode: resp.StatusCode,
		}
	}

	return apiResp.Data, nil
}

// doGatewayRequest sends a request to a payment gateway endpoint.
// Gateway endpoints return data directly without the ApiResponse wrapper.
func (c *HydraClient) doGatewayRequest(method, path string, body []byte, result interface{}) error {
	req, err := c.newRequest(method, path, body)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return parseError(resp.StatusCode, respBody)
	}

	if err := json.Unmarshal(respBody, result); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	return nil
}

// ============================================
// Health
// ============================================

// HealthCheck checks the API service health.
// Returns the health status, version, and database connectivity info.
func (c *HydraClient) HealthCheck() (*HealthResponse, error) {
	req, err := c.newRequest("GET", "/health", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("health check failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, parseError(resp.StatusCode, body)
	}

	var health HealthResponse
	if err := json.NewDecoder(resp.Body).Decode(&health); err != nil {
		return nil, fmt.Errorf("failed to parse health response: %w", err)
	}

	return &health, nil
}

// ============================================
// Accounts
// ============================================

// CreateAccount creates a new account with the specified owner, type, and currency.
// If currency is nil, the client's default currency is used.
func (c *HydraClient) CreateAccount(ownerID, accountType string, currency *string) (*Account, error) {
	cur := currency
	if cur == nil {
		cur = &c.defaultCurrency
	}
	reqBody := CreateAccountRequest{
		OwnerID:     ownerID,
		AccountType: accountType,
		Currency:    cur,
	}
	body, _ := json.Marshal(reqBody)
	return doCoreRequest[Account](c, "POST", "/v1/api/accounts", body)
}

// GetAccount retrieves an account by its unique ID.
func (c *HydraClient) GetAccount(accountID string) (*Account, error) {
	return doCoreRequest[Account](c, "GET", "/v1/api/accounts/"+accountID, nil)
}

// GetAccountsByOwner retrieves all accounts belonging to a specific owner.
func (c *HydraClient) GetAccountsByOwner(ownerID string) ([]Account, error) {
	accounts, err := doCoreRequest[[]Account](c, "GET", "/v1/api/accounts/owner/"+ownerID, nil)
	if err != nil {
		return nil, err
	}
	if accounts == nil {
		return []Account{}, nil
	}
	return *accounts, nil
}

// ============================================
// Transactions
// ============================================

// Transfer creates a transfer transaction from source account to destination account.
func (c *HydraClient) Transfer(sourceID, destID, amount string, currency *string, reference *string) (*Transaction, error) {
	cur := currency
	if cur == nil {
		cur = &c.defaultCurrency
	}
	reqBody := TransferRequest{
		SourceID:  sourceID,
		DestID:    destID,
		Amount:    amount,
		Currency:  cur,
		Reference: reference,
	}
	body, _ := json.Marshal(reqBody)
	return doCoreRequest[Transaction](c, "POST", "/v1/api/transactions", body)
}

// GetTransaction retrieves a transaction by its unique ID.
func (c *HydraClient) GetTransaction(transactionID string) (*Transaction, error) {
	return doCoreRequest[Transaction](c, "GET", "/v1/api/transactions/"+transactionID, nil)
}

// CompleteTransaction marks a pending transaction as completed.
// Returns the success field from the API response.
func (c *HydraClient) CompleteTransaction(transactionID string) (bool, error) {
	req, err := c.newRequest("POST", "/v1/api/transactions/"+transactionID+"/complete", nil)
	if err != nil {
		return false, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return false, parseError(resp.StatusCode, respBody)
	}

	var apiResp struct {
		Success bool `json:"success"`
	}
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return false, fmt.Errorf("failed to parse response: %w", err)
	}

	return apiResp.Success, nil
}

// FailTransaction marks a pending transaction as failed.
// Returns the success field from the API response.
func (c *HydraClient) FailTransaction(transactionID string) (bool, error) {
	req, err := c.newRequest("POST", "/v1/api/transactions/"+transactionID+"/fail", nil)
	if err != nil {
		return false, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return false, parseError(resp.StatusCode, respBody)
	}

	var apiResp struct {
		Success bool `json:"success"`
	}
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return false, fmt.Errorf("failed to parse response: %w", err)
	}

	return apiResp.Success, nil
}

// ============================================
// Wallets
// ============================================

// CreateWallet creates a new cryptocurrency wallet for the specified owner.
func (c *HydraClient) CreateWallet(ownerID, walletType, chain, address string, encryptedPrivateKey *string) (*Wallet, error) {
	reqBody := CreateWalletRequest{
		OwnerID:             ownerID,
		WalletType:          walletType,
		Chain:               chain,
		Address:             address,
		EncryptedPrivateKey: encryptedPrivateKey,
	}
	body, _ := json.Marshal(reqBody)
	return doCoreRequest[Wallet](c, "POST", "/v1/api/wallets", body)
}

// GetWallets retrieves all wallets belonging to a specific owner.
func (c *HydraClient) GetWallets(ownerID string) ([]Wallet, error) {
	wallets, err := doCoreRequest[[]Wallet](c, "GET", "/v1/api/wallets/owner/"+ownerID, nil)
	if err != nil {
		return nil, err
	}
	if wallets == nil {
		return []Wallet{}, nil
	}
	return *wallets, nil
}

// RelayTransaction submits a signed blockchain transaction for relay.
// Returns the transaction hash from the blockchain.
func (c *HydraClient) RelayTransaction(walletID, signedTransaction string) (string, error) {
	reqBody := RelayRequest{SignedTransaction: signedTransaction}
	body, _ := json.Marshal(reqBody)

	result, err := doCoreRequest[RelayResponse](c, "POST", "/v1/api/wallets/"+walletID+"/relay", body)
	if err != nil {
		return "", err
	}
	return result.TransactionHash, nil
}

// ============================================
// Splits
// ============================================

// CreateSplit creates a split payment rule that distributes funds across
// multiple accounts according to the specified percentages.
func (c *HydraClient) CreateSplit(total string, splits []SplitEntry, currency *string, reference *string) (*SplitRule, error) {
	cur := currency
	if cur == nil {
		cur = &c.defaultCurrency
	}
	reqBody := CreateSplitRequest{
		Total:     total,
		Currency:  cur,
		Splits:    splits,
		Reference: reference,
	}
	body, _ := json.Marshal(reqBody)
	return doCoreRequest[SplitRule](c, "POST", "/v1/api/splits", body)
}

// GetSplit retrieves a split rule by its unique ID.
func (c *HydraClient) GetSplit(splitID string) (*SplitRule, error) {
	return doCoreRequest[SplitRule](c, "GET", "/v1/api/splits/"+splitID, nil)
}

// ============================================
// Security
// ============================================

// VerifySignature performs constant-time verification of an HMAC-SHA256 signature.
// Used to verify webhook payloads from the Hydra service.
func (c *HydraClient) VerifySignature(payload, signature string) bool {
	expected := hmacSign(c.secretKey, payload)
	expectedSig, err1 := base64.StdEncoding.DecodeString(expected)
	givenSig, err2 := base64.StdEncoding.DecodeString(signature)
	if err1 != nil || err2 != nil {
		return false
	}
	if len(expectedSig) != len(givenSig) {
		return false
	}
	return hmac.Equal(expectedSig, givenSig)
}

// SignMessage generates an HMAC-SHA256 signature for a given message.
// Useful for client-side signing operations.
func (c *HydraClient) SignMessage(message string) string {
	return hmacSign(c.secretKey, message)
}

// ============================================
// Payment Gateway
// ============================================

// CreateCardToken tokenizes raw card data into a secure token.
// The token can then be used to create payment intents without
// handling raw card details.
func (c *HydraClient) CreateCardToken(card CardInput, merchantID *string) (*CreateTokenResponse, error) {
	reqBody := CreateTokenRequest{
		Card:       card,
		MerchantID: merchantID,
	}
	body, _ := json.Marshal(reqBody)
	var result CreateTokenResponse
	if err := c.doGatewayRequest("POST", "/v1/payments/tokens", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// CreatePaymentIntent creates a payment intent to initiate a payment.
// The intent represents a single payment transaction from a customer.
func (c *HydraClient) CreatePaymentIntent(amount int, currency string, token, merchantID, idempotencyKey *string) (*CreateIntentResponse, error) {
	reqBody := CreateIntentRequest{
		Amount:         amount,
		Currency:       currency,
		Token:          token,
		MerchantID:     merchantID,
		IdempotencyKey: idempotencyKey,
	}
	body, _ := json.Marshal(reqBody)
	var result CreateIntentResponse
	if err := c.doGatewayRequest("POST", "/v1/payments/intents", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// CreateRefund refunds a previous charge, partially or in full.
// If amount is nil, the full charge amount is refunded.
func (c *HydraClient) CreateRefund(chargeID string, amount *int) (*CreateRefundResponse, error) {
	reqBody := CreateRefundRequest{
		ChargeID: chargeID,
		Amount:   amount,
	}
	body, _ := json.Marshal(reqBody)
	var result CreateRefundResponse
	if err := c.doGatewayRequest("POST", "/v1/refunds", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetCommission returns the total commission collected across all transactions.
func (c *HydraClient) GetCommission() (*CommissionResponse, error) {
	var result CommissionResponse
	if err := c.doGatewayRequest("GET", "/v1/commission", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// SendWebhookEvent sends a Stripe webhook event to the API for testing purposes.
func (c *HydraClient) SendWebhookEvent(payload map[string]interface{}) (*WebhookResponse, error) {
	body, _ := json.Marshal(payload)
	var result WebhookResponse
	if err := c.doGatewayRequest("POST", "/v1/webhooks/stripe", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetMetrics returns Prometheus-format metrics from the API.
func (c *HydraClient) GetMetrics() (string, error) {
	req, err := c.newRequest("GET", "/v1/metrics", nil)
	if err != nil {
		return "", err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("metrics request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return "", parseError(resp.StatusCode, body)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read metrics response: %w", err)
	}

	return string(body), nil
}
