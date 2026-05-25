package main

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

// ============================================
// API Response Wrapper
// ============================================

type apiResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data,omitempty"`
	Error   string          `json:"error,omitempty"`
}

// ============================================
// Core Models
// ============================================

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

type Transaction struct {
	ID              string  `json:"id"`
	SourceAccountID *string `json:"source_account_id,omitempty"`
	DestAccountID   *string `json:"dest_account_id,omitempty"`
	Amount          string  `json:"amount"`
	Currency        string  `json:"currency"`
	Status          string  `json:"status"`
	TransactionType string  `json:"transaction_type"`
	Reference       *string `json:"reference,omitempty"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       *string `json:"updated_at,omitempty"`
}

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

type SplitEntry struct {
	AccountID  string  `json:"account_id"`
	Percentage float64 `json:"percentage"`
}

type SplitRule struct {
	ID            string       `json:"id"`
	TransactionID *string      `json:"transaction_id,omitempty"`
	Total         string       `json:"total"`
	Currency      string       `json:"currency"`
	Splits        []SplitEntry `json:"splits"`
	Status        string       `json:"status"`
	CreatedAt     string       `json:"created_at"`
}

type HealthResponse struct {
	Status   string `json:"status"`
	Version  string `json:"version"`
	Database string `json:"database"`
}

type CardInput struct {
	Number   string `json:"number"`
	ExpMonth int    `json:"exp_month"`
	ExpYear  int    `json:"exp_year"`
	CVC      string `json:"cvc"`
}

type CardDetails struct {
	Brand    string `json:"brand"`
	Last4    string `json:"last4"`
	ExpMonth int    `json:"exp_month"`
	ExpYear  int    `json:"exp_year"`
}

type CreateTokenResponse struct {
	ID        string      `json:"id"`
	Card      CardDetails `json:"card"`
	CreatedAt string      `json:"created_at"`
}

type CreateIntentResponse struct {
	ID           string `json:"id"`
	Status       string `json:"status"`
	Amount       int    `json:"amount"`
	Currency     string `json:"currency"`
	ClientSecret string `json:"client_secret"`
}

type CreateRefundResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Amount int    `json:"amount"`
	Charge string `json:"charge"`
}

type CommissionResponse struct {
	TotalCommission int `json:"total_commission"`
}

// ============================================
// HTTP Client
// ============================================

type Client struct {
	httpClient      *http.Client
	baseURL         string
	apiKey          string
	secretKey       string
	defaultCurrency string
	locale          string
}

func NewClient(baseURL, apiKey, secretKey, defaultCurrency, locale string) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		baseURL:         baseURL,
		apiKey:          apiKey,
		secretKey:       secretKey,
		defaultCurrency: defaultCurrency,
		locale:          locale,
	}
}

// ============================================
// HMAC Signing
// ============================================

func hmacSign(secret, message string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(message))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func (c *Client) signRequest(method, path string, body []byte) (signature, timestamp string) {
	timestamp = strconv.FormatInt(time.Now().UnixMilli(), 10)
	msg := fmt.Sprintf("%s:%s:%s:%s", method, path, timestamp, string(body))
	signature = hmacSign(c.secretKey, msg)
	return
}

// ============================================
// HTTP Helpers
// ============================================

func (c *Client) newRequest(method, path string, body []byte) (*http.Request, error) {
	url := c.baseURL + path
	var reqBody io.Reader
	if body != nil {
		reqBody = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	signature, timestamp := c.signRequest(method, path, body)

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", c.apiKey)
	req.Header.Set("X-Signature", signature)
	req.Header.Set("X-Timestamp", timestamp)
	req.Header.Set("X-Currency", c.defaultCurrency)
	req.Header.Set("Accept-Language", c.locale)

	return req, nil
}

func (c *Client) doRequest(method, path string, body interface{}) ([]byte, error) {
	var bodyBytes []byte
	var err error

	if body != nil {
		bodyBytes, err = json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
	}

	req, err := c.newRequest(method, path, bodyBytes)
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

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, parseError(resp.StatusCode, respBody)
	}

	return respBody, nil
}

func (c *Client) doCoreRequest(method, path string, body interface{}, result interface{}) error {
	respBody, err := c.doRequest(method, path, body)
	if err != nil {
		return err
	}

	var env apiResponse
	if err := json.Unmarshal(respBody, &env); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if !env.Success {
		return fmt.Errorf("API error: %s", env.Error)
	}

	if result != nil && env.Data != nil {
		if err := json.Unmarshal(env.Data, result); err != nil {
			return fmt.Errorf("failed to parse data: %w", err)
		}
	}

	return nil
}

func (c *Client) doGatewayRequest(method, path string, body interface{}, result interface{}) error {
	respBody, err := c.doRequest(method, path, body)
	if err != nil {
		return err
	}

	if result != nil {
		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("failed to parse response: %w", err)
		}
	}

	return nil
}

// ============================================
// Error Handling
// ============================================

type HydraError struct {
	Message    string
	Code       string
	StatusCode int
}

func (e *HydraError) Error() string {
	return fmt.Sprintf("Hydra API error [%d] %s: %s", e.StatusCode, e.Code, e.Message)
}

func parseError(statusCode int, body []byte) error {
	var env apiResponse
	msg := string(body)
	if json.Unmarshal(body, &env) == nil && env.Error != "" {
		msg = env.Error
	}

	switch statusCode {
	case 400:
		return &HydraError{Message: msg, Code: "VALIDATION_ERROR", StatusCode: 400}
	case 401:
		return &HydraError{Message: msg, Code: "AUTHENTICATION_ERROR", StatusCode: 401}
	case 404:
		return &HydraError{Message: msg, Code: "NOT_FOUND", StatusCode: 404}
	default:
		return &HydraError{Message: msg, Code: "API_ERROR", StatusCode: statusCode}
	}
}

// ============================================
// API Methods — Health
// ============================================

func (c *Client) HealthCheck() (*HealthResponse, error) {
	var result HealthResponse
	if err := c.doCoreRequest("GET", "/health", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ============================================
// API Methods — Accounts
// ============================================

func (c *Client) CreateAccount(ownerID, accountType, currency string) (*Account, error) {
	body := map[string]interface{}{
		"owner_id":     ownerID,
		"account_type": accountType,
		"currency":     currency,
	}
	var result Account
	if err := c.doCoreRequest("POST", "/v1/api/accounts", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) GetAccount(id string) (*Account, error) {
	var result Account
	if err := c.doCoreRequest("GET", "/v1/api/accounts/"+id, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) GetAccountsByOwner(ownerID string) ([]Account, error) {
	var result []Account
	if err := c.doCoreRequest("GET", "/v1/api/accounts/owner/"+ownerID, nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// ============================================
// API Methods — Transactions
// ============================================

func (c *Client) Transfer(sourceID, destID, amount, currency, reference string) (*Transaction, error) {
	body := map[string]interface{}{
		"source_id": sourceID,
		"dest_id":   destID,
		"amount":    amount,
		"currency":  currency,
		"reference": reference,
	}
	var result Transaction
	if err := c.doCoreRequest("POST", "/v1/api/transactions", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) GetTransaction(id string) (*Transaction, error) {
	var result Transaction
	if err := c.doCoreRequest("GET", "/v1/api/transactions/"+id, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) CompleteTransaction(id string) error {
	return c.doCoreRequest("POST", fmt.Sprintf("/v1/api/transactions/%s/complete", id), nil, nil)
}

func (c *Client) FailTransaction(id string) error {
	return c.doCoreRequest("POST", fmt.Sprintf("/v1/api/transactions/%s/fail", id), nil, nil)
}

// ============================================
// API Methods — Wallets
// ============================================

func (c *Client) CreateWallet(ownerID, walletType, chain, address string, encryptedPrivateKey *string) (*Wallet, error) {
	body := map[string]interface{}{
		"owner_id":     ownerID,
		"wallet_type":  walletType,
		"chain":        chain,
		"address":      address,
	}
	if encryptedPrivateKey != nil {
		body["encrypted_private_key"] = *encryptedPrivateKey
	}
	var result Wallet
	if err := c.doCoreRequest("POST", "/v1/api/wallets", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) GetWallets(ownerID string) ([]Wallet, error) {
	var result []Wallet
	if err := c.doCoreRequest("GET", "/v1/api/wallets/owner/"+ownerID, nil, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func (c *Client) RelayTransaction(walletID, signedTransaction string) (string, error) {
	body := map[string]interface{}{
		"signed_transaction": signedTransaction,
	}
	var result struct {
		TransactionHash string `json:"transaction_hash"`
	}
	if err := c.doCoreRequest("POST", fmt.Sprintf("/v1/api/wallets/%s/relay", walletID), body, &result); err != nil {
		return "", err
	}
	return result.TransactionHash, nil
}

// ============================================
// API Methods — Split Rules
// ============================================

func (c *Client) CreateSplit(total string, splits []SplitEntry, currency, reference string) (*SplitRule, error) {
	body := map[string]interface{}{
		"total":   total,
		"splits":  splits,
		"currency": currency,
	}
	if reference != "" {
		body["reference"] = reference
	}
	var result SplitRule
	if err := c.doCoreRequest("POST", "/v1/api/splits", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) GetSplit(id string) (*SplitRule, error) {
	var result SplitRule
	if err := c.doCoreRequest("GET", "/v1/api/splits/"+id, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ============================================
// API Methods — Payment Gateway
// ============================================

func (c *Client) CreateCardToken(card CardInput, merchantID *string) (*CreateTokenResponse, error) {
	body := map[string]interface{}{
		"card": card,
	}
	if merchantID != nil {
		body["merchant_id"] = *merchantID
	}
	var result CreateTokenResponse
	if err := c.doGatewayRequest("POST", "/v1/payments/tokens", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) CreatePaymentIntent(amount int, currency, token, merchantID, idempotencyKey string) (*CreateIntentResponse, error) {
	body := map[string]interface{}{
		"amount":   amount,
		"currency": currency,
	}
	if token != "" {
		body["token"] = token
	}
	if merchantID != "" {
		body["merchant_id"] = merchantID
	}
	if idempotencyKey != "" {
		body["idempotency_key"] = idempotencyKey
	}
	var result CreateIntentResponse
	if err := c.doGatewayRequest("POST", "/v1/payments/intents", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) CreateRefund(chargeID string, amount *int) (*CreateRefundResponse, error) {
	body := map[string]interface{}{
		"charge_id": chargeID,
	}
	if amount != nil {
		body["amount"] = *amount
	}
	var result CreateRefundResponse
	if err := c.doGatewayRequest("POST", "/v1/refunds", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) GetCommission() (*CommissionResponse, error) {
	var result CommissionResponse
	if err := c.doGatewayRequest("GET", "/v1/commission", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) SendWebhookEvent(payload map[string]interface{}) error {
	return c.doGatewayRequest("POST", "/v1/webhooks/stripe", payload, nil)
}

func (c *Client) GetMetrics() (string, error) {
	body, err := c.doRequest("GET", "/v1/metrics", nil)
	if err != nil {
		return "", err
	}
	return string(body), nil
}
