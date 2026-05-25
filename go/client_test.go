package hydra

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// ============================================
// Client Construction Tests
// ============================================

func TestNewClient(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	if client == nil {
		t.Fatal("NewClient returned nil")
	}
	if client.baseURL != "http://localhost:8080" {
		t.Errorf("expected baseURL http://localhost:8080, got %s", client.baseURL)
	}
	if client.apiKey != "pk_test" {
		t.Errorf("expected apiKey pk_test, got %s", client.apiKey)
	}
	if client.secretKey != "sk_test" {
		t.Errorf("expected secretKey sk_test, got %s", client.secretKey)
	}
	if client.defaultCurrency != "GBP" {
		t.Errorf("expected defaultCurrency GBP, got %s", client.defaultCurrency)
	}
	if client.locale != "en" {
		t.Errorf("expected locale en, got %s", client.locale)
	}
	if client.httpClient == nil {
		t.Error("expected non-nil httpClient")
	}
	if client.httpClient.Timeout != 30*time.Second {
		t.Errorf("expected timeout 30s, got %v", client.httpClient.Timeout)
	}
}

func TestNewClientEmptyBaseURL(t *testing.T) {
	client := NewClient("", "pk_test", "sk_test")
	if client.baseURL != "" {
		t.Errorf("expected empty baseURL, got %s", client.baseURL)
	}
}

// ============================================
// Builder Tests
// ============================================

func TestHydraClientBuilder_Defaults(t *testing.T) {
	builder := NewHydraClientBuilder()
	if builder.baseURL != "http://localhost:8080" {
		t.Errorf("expected default baseURL http://localhost:8080, got %s", builder.baseURL)
	}
	if builder.defaultCurrency != "GBP" {
		t.Errorf("expected default currency GBP, got %s", builder.defaultCurrency)
	}
	if builder.locale != "en" {
		t.Errorf("expected default locale en, got %s", builder.locale)
	}
}

func TestHydraClientBuilder_Chain(t *testing.T) {
	client := NewHydraClientBuilder().
		BaseURL("https://api.hydra.com").
		APIKey("pk_custom").
		SecretKey("sk_custom").
		WithDefaultCurrency("EUR").
		WithLocale("de").
		Build()

	if client.baseURL != "https://api.hydra.com" {
		t.Errorf("baseURL = %s, want https://api.hydra.com", client.baseURL)
	}
	if client.apiKey != "pk_custom" {
		t.Errorf("apiKey = %s, want pk_custom", client.apiKey)
	}
	if client.secretKey != "sk_custom" {
		t.Errorf("secretKey = %s, want sk_custom", client.secretKey)
	}
	if client.defaultCurrency != "EUR" {
		t.Errorf("defaultCurrency = %s, want EUR", client.defaultCurrency)
	}
	if client.locale != "de" {
		t.Errorf("locale = %s, want de", client.locale)
	}
}

func TestHydraClientBuilder_PartialConfig(t *testing.T) {
	client := NewHydraClientBuilder().
		BaseURL("http://localhost:9090").
		APIKey("pk_partial").
		SecretKey("sk_partial").
		Build()

	if client.baseURL != "http://localhost:9090" {
		t.Errorf("baseURL = %s, want http://localhost:9090", client.baseURL)
	}
	if client.defaultCurrency != "GBP" {
		t.Errorf("defaultCurrency = %s, want GBP", client.defaultCurrency)
	}
	if client.locale != "en" {
		t.Errorf("locale = %s, want en", client.locale)
	}
}

// ============================================
// HMAC Signing Tests
// ============================================

func TestSignMessage_ProducesNonEmptyBase64(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	sig := client.SignMessage("test message")
	if sig == "" {
		t.Error("expected non-empty signature")
	}
	decoded, err := base64.StdEncoding.DecodeString(sig)
	if err != nil {
		t.Fatalf("invalid base64: %v", err)
	}
	if len(decoded) != sha256.Size {
		t.Errorf("expected %d bytes, got %d", sha256.Size, len(decoded))
	}
}

func TestSignMessage_Deterministic(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	sig1 := client.SignMessage("test")
	sig2 := client.SignMessage("test")
	if sig1 != sig2 {
		t.Error("expected deterministic signatures for same key and message")
	}
}

func TestSignMessage_DifferentMessages(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	sig1 := client.SignMessage("message one")
	sig2 := client.SignMessage("message two")
	if sig1 == sig2 {
		t.Error("expected different signatures for different messages")
	}
}

func TestSignMessage_DifferentKeys(t *testing.T) {
	c1 := NewClient("http://localhost:8080", "pk_test", "sk_key1")
	c2 := NewClient("http://localhost:8080", "pk_test", "sk_key2")
	sig1 := c1.SignMessage("test")
	sig2 := c2.SignMessage("test")
	if sig1 == sig2 {
		t.Error("expected different signatures for different secret keys")
	}
}

func TestSignMessage_DifferentAPIKeys(t *testing.T) {
	c1 := NewClient("http://localhost:8080", "pk_one", "sk_test")
	c2 := NewClient("http://localhost:8080", "pk_two", "sk_test")
	sig1 := c1.SignMessage("test")
	sig2 := c2.SignMessage("test")
	// API key should not affect signing, only secret key
	if sig1 != sig2 {
		t.Error("SignMessage should not depend on API key")
	}
}

func TestSignMessage_EmptyString(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	sig := client.SignMessage("")
	if sig == "" {
		t.Error("expected non-empty signature for empty message")
	}
	decoded, err := base64.StdEncoding.DecodeString(sig)
	if err != nil {
		t.Fatalf("invalid base64: %v", err)
	}
	if len(decoded) != sha256.Size {
		t.Errorf("expected %d bytes, got %d", sha256.Size, len(decoded))
	}
}

func TestSignMessage_MatchesHMACSHA256(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	sig := client.SignMessage("test")
	// Compute expected HMAC using stdlib directly
	mac := hmac.New(sha256.New, []byte("sk_test"))
	mac.Write([]byte("test"))
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	if sig != expected {
		t.Errorf("signature mismatch:\ngot:      %s\nexpected: %s", sig, expected)
	}
}

// ============================================
// Signature Verification Tests
// ============================================

func TestVerifySignature_Valid(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	sig := client.SignMessage("payload")
	if !client.VerifySignature("payload", sig) {
		t.Error("expected valid signature to verify")
	}
}

func TestVerifySignature_TamperedPayload(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	sig := client.SignMessage("original payload")
	if client.VerifySignature("tampered payload", sig) {
		t.Error("expected tampered payload to fail verification")
	}
}

func TestVerifySignature_RandomString(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	if client.VerifySignature("payload", "aaaaaaaa") {
		t.Error("expected random signature to fail verification")
	}
}

func TestVerifySignature_EmptySignature(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	if client.VerifySignature("payload", "") {
		t.Error("expected empty signature to fail verification")
	}
}

func TestVerifySignature_InvalidBase64(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	if client.VerifySignature("payload", "!!!not-base64!!!") {
		t.Error("expected invalid base64 to fail verification")
	}
}

func TestVerifySignature_WrongKey(t *testing.T) {
	c1 := NewClient("http://localhost:8080", "pk_test", "sk_key1")
	c2 := NewClient("http://localhost:8080", "pk_test", "sk_key2")
	sig := c1.SignMessage("payload")
	if c2.VerifySignature("payload", sig) {
		t.Error("expected signature from different key to fail verification")
	}
}

// ============================================
// Error Type Tests
// ============================================

func TestHydraError_ImplementsError(t *testing.T) {
	err := &HydraError{Message: "test error"}
	var target error = err
	if target.Error() != "test error" {
		t.Errorf("Error() = %s, want 'test error'", target.Error())
	}
}

func TestHydraError_Fields(t *testing.T) {
	err := &HydraError{
		Message:    "something went wrong",
		Code:       "API_ERROR",
		StatusCode: 500,
		Details:    map[string]string{"key": "value"},
	}
	if err.Message != "something went wrong" {
		t.Errorf("Message = %s", err.Message)
	}
	if err.Code != "API_ERROR" {
		t.Errorf("Code = %s", err.Code)
	}
	if err.StatusCode != 500 {
		t.Errorf("StatusCode = %d", err.StatusCode)
	}
	details := err.Details.(map[string]string)
	if details["key"] != "value" {
		t.Errorf("Details key = %s", details["key"])
	}
}

func TestAuthenticationError_Defaults(t *testing.T) {
	err := NewAuthenticationError("invalid key", nil)
	if err.Message != "invalid key" {
		t.Errorf("Message = %s, want 'invalid key'", err.Message)
	}
	if err.Code != "AUTHENTICATION_ERROR" {
		t.Errorf("Code = %s", err.Code)
	}
	if err.StatusCode != 401 {
		t.Errorf("StatusCode = %d, want 401", err.StatusCode)
	}
	var target *AuthenticationError
	if !errors.As(err, &target) {
		t.Error("expected error to be an AuthenticationError")
	}
	var base *HydraError
	if !errors.As(err, &base) {
		t.Error("expected AuthenticationError to be a HydraError")
	}
}

func TestValidationError_Defaults(t *testing.T) {
	err := NewValidationError("bad request", nil)
	if err.Message != "bad request" {
		t.Errorf("Message = %s", err.Message)
	}
	if err.Code != "VALIDATION_ERROR" {
		t.Errorf("Code = %s", err.Code)
	}
	if err.StatusCode != 400 {
		t.Errorf("StatusCode = %d, want 400", err.StatusCode)
	}
	var target *ValidationError
	if !errors.As(err, &target) {
		t.Error("expected error to be a ValidationError")
	}
}

func TestNotFoundError_Defaults(t *testing.T) {
	err := NewNotFoundError("not found", nil)
	if err.Message != "not found" {
		t.Errorf("Message = %s", err.Message)
	}
	if err.Code != "NOT_FOUND" {
		t.Errorf("Code = %s", err.Code)
	}
	if err.StatusCode != 404 {
		t.Errorf("StatusCode = %d, want 404", err.StatusCode)
	}
	var target *NotFoundError
	if !errors.As(err, &target) {
		t.Error("expected error to be a NotFoundError")
	}
}

func TestErrorDetails(t *testing.T) {
	details := map[string]string{"field": "amount", "reason": "invalid"}
	err := NewValidationError("validation error", details)
	if err.Details == nil {
		t.Fatal("expected non-nil details")
	}
	d := err.Details.(map[string]string)
	if d["field"] != "amount" {
		t.Errorf("field = %s", d["field"])
	}
	if d["reason"] != "invalid" {
		t.Errorf("reason = %s", d["reason"])
	}
}

// ============================================
// Parse Error Tests
// ============================================

func TestParseError_Authentication(t *testing.T) {
	body := `{"success":false,"error":"Invalid API key"}`
	err := parseError(401, []byte(body))
	var authErr *AuthenticationError
	if !errors.As(err, &authErr) {
		t.Fatal("expected AuthenticationError")
	}
	if authErr.Message != "Invalid API key" {
		t.Errorf("Message = %s", authErr.Message)
	}
}

func TestParseError_NotFound(t *testing.T) {
	body := `{"success":false,"error":"Account not found"}`
	err := parseError(404, []byte(body))
	var notFound *NotFoundError
	if !errors.As(err, &notFound) {
		t.Fatal("expected NotFoundError")
	}
	if notFound.Message != "Account not found" {
		t.Errorf("Message = %s", notFound.Message)
	}
}

func TestParseError_Validation(t *testing.T) {
	body := `{"success":false,"error":"Invalid account type"}`
	err := parseError(400, []byte(body))
	var valErr *ValidationError
	if !errors.As(err, &valErr) {
		t.Fatal("expected ValidationError")
	}
	if valErr.Message != "Invalid account type" {
		t.Errorf("Message = %s", valErr.Message)
	}
}

func TestParseError_Generic(t *testing.T) {
	body := `{"success":false,"error":"Server error"}`
	err := parseError(500, []byte(body))
	var hydraErr *HydraError
	if !errors.As(err, &hydraErr) {
		t.Fatal("expected HydraError")
	}
	if hydraErr.Message != "Server error" {
		t.Errorf("Message = %s", hydraErr.Message)
	}
	if hydraErr.StatusCode != 500 {
		t.Errorf("StatusCode = %d, want 500", hydraErr.StatusCode)
	}
	if hydraErr.Code != "API_ERROR" {
		t.Errorf("Code = %s", hydraErr.Code)
	}
}

func TestParseError_NoBody(t *testing.T) {
	err := parseError(500, []byte{})
	var hydraErr *HydraError
	if !errors.As(err, &hydraErr) {
		t.Fatal("expected HydraError")
	}
	if hydraErr.Message != "Request failed with status 500" {
		t.Errorf("Message = %s", hydraErr.Message)
	}
}

// ============================================
// signRequest Unit Tests
// ============================================

func TestSignRequest_EmptyBody(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	sig, ts := client.signRequest("GET", "/health", nil)
	if sig == "" {
		t.Error("expected non-empty signature")
	}
	if ts == "" {
		t.Error("expected non-empty timestamp")
	}

	// Verify the signature
	mac := hmac.New(sha256.New, []byte("sk_test"))
	message := fmt.Sprintf("GET:/health:%s:", ts)
	mac.Write([]byte(message))
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	if sig != expected {
		t.Errorf("signature mismatch:\ngot:      %s\nexpected: %s", sig, expected)
	}
}

func TestSignRequest_WithBody(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	body := []byte(`{"key":"value"}`)
	sig, ts := client.signRequest("POST", "/v1/api/accounts", body)
	if sig == "" {
		t.Error("expected non-empty signature")
	}

	mac := hmac.New(sha256.New, []byte("sk_test"))
	message := fmt.Sprintf("POST:/v1/api/accounts:%s:{\"key\":\"value\"}", ts)
	mac.Write([]byte(message))
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	if sig != expected {
		t.Errorf("signature mismatch:\ngot:      %s\nexpected: %s", sig, expected)
	}
}

func TestSignRequest_DifferentTimestamps(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	sig1, ts1 := client.signRequest("GET", "/health", nil)
	time.Sleep(time.Millisecond)
	sig2, ts2 := client.signRequest("GET", "/health", nil)
	// Signatures should differ because timestamps differ
	if ts1 == ts2 {
		t.Skip("timestamps were the same (sub-millisecond timing)")
	}
	if sig1 == sig2 {
		t.Error("expected different signatures for different timestamps")
	}
}

// ============================================
// API Method Existence Tests
// ============================================

func TestClient_MethodsExist(t *testing.T) {
	client := NewClient("http://localhost:8080", "pk_test", "sk_test")
	if client == nil {
		t.Fatal("client is nil")
	}

	tests := []struct {
		name string
		fn   interface{}
	}{
		{"HealthCheck", client.HealthCheck},
		{"CreateAccount", client.CreateAccount},
		{"GetAccount", client.GetAccount},
		{"GetAccountsByOwner", client.GetAccountsByOwner},
		{"Transfer", client.Transfer},
		{"GetTransaction", client.GetTransaction},
		{"CompleteTransaction", client.CompleteTransaction},
		{"FailTransaction", client.FailTransaction},
		{"CreateWallet", client.CreateWallet},
		{"GetWallets", client.GetWallets},
		{"RelayTransaction", client.RelayTransaction},
		{"CreateSplit", client.CreateSplit},
		{"GetSplit", client.GetSplit},
		{"CreateCardToken", client.CreateCardToken},
		{"CreatePaymentIntent", client.CreatePaymentIntent},
		{"CreateRefund", client.CreateRefund},
		{"GetCommission", client.GetCommission},
		{"SendWebhookEvent", client.SendWebhookEvent},
		{"GetMetrics", client.GetMetrics},
		{"VerifySignature", client.VerifySignature},
		{"SignMessage", client.SignMessage},
	}

	for _, tt := range tests {
		if tt.fn == nil {
			t.Errorf("method %s is nil", tt.name)
		}
	}
}

// ============================================
// JSON Serialization Tests
// ============================================

func TestAccount_JSONRoundTrip(t *testing.T) {
	original := Account{
		ID:          "acc-123",
		OwnerID:     "owner-456",
		AccountType: "personal",
		Currency:    "GBP",
		Balance:     "100.50",
		CreatedAt:   "2024-01-01T00:00:00Z",
	}
	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	var decoded Account
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if decoded.ID != original.ID {
		t.Errorf("ID = %s, want %s", decoded.ID, original.ID)
	}
	if decoded.Balance != original.Balance {
		t.Errorf("Balance = %s, want %s", decoded.Balance, original.Balance)
	}
}

func TestAccount_JSONOptionalFields(t *testing.T) {
	// Test that optional fields are omitted when empty
	data, err := json.Marshal(Account{
		ID:      "acc-1",
		OwnerID: "owner-1",
	})
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	if strings.Contains(string(data), "metadata") {
		t.Error("metadata field should be omitted when nil")
	}
}

func TestApiResponse_JSONRoundTrip(t *testing.T) {
	original := ApiResponse[Account]{
		Success: true,
		Data: &Account{
			ID:      "acc-1",
			OwnerID: "owner-1",
		},
	}
	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	var decoded ApiResponse[Account]
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if decoded.Success != true {
		t.Error("success should be true")
	}
	if decoded.Data == nil {
		t.Fatal("data should not be nil")
	}
	if decoded.Data.ID != "acc-1" {
		t.Errorf("ID = %s, want acc-1", decoded.Data.ID)
	}
}

func TestApiResponse_ErrorResponse(t *testing.T) {
	original := ApiResponse[Account]{
		Success: false,
		Error:   "Account not found",
	}
	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	var decoded ApiResponse[Account]
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if decoded.Success != false {
		t.Error("success should be false")
	}
	if decoded.Error != "Account not found" {
		t.Errorf("Error = %s", decoded.Error)
	}
	if decoded.Data != nil {
		t.Error("data should be nil on error")
	}
}

// ============================================
// Integration Tests (Mock HTTP Server)
// ============================================

func setupTestServer(responseStatus int, responseBody string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(responseStatus)
		fmt.Fprint(w, responseBody)
	}))
}

func setupTestServerWithHandler(handler http.HandlerFunc) *httptest.Server {
	return httptest.NewServer(handler)
}

func TestIntegration_HealthCheck(t *testing.T) {
	server := setupTestServer(http.StatusOK, `{"status":"healthy","version":"1.0.0","database":"connected"}`)
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	health, err := client.HealthCheck()
	if err != nil {
		t.Fatalf("HealthCheck failed: %v", err)
	}
	if health.Status != "healthy" {
		t.Errorf("Status = %s, want healthy", health.Status)
	}
	if health.Version != "1.0.0" {
		t.Errorf("Version = %s, want 1.0.0", health.Version)
	}
	if health.Database != "connected" {
		t.Errorf("Database = %s, want connected", health.Database)
	}
}

func TestIntegration_CreateAccount(t *testing.T) {
	var requestBody string
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("method = %s, want POST", r.Method)
		}
		if r.URL.Path != "/v1/api/accounts" {
			t.Errorf("path = %s, want /v1/api/accounts", r.URL.Path)
		}
		if r.Header.Get("X-API-Key") != "pk_test" {
			t.Errorf("X-API-Key = %s", r.Header.Get("X-API-Key"))
		}
		if r.Header.Get("X-Signature") == "" {
			t.Error("missing X-Signature header")
		}
		if r.Header.Get("X-Timestamp") == "" {
			t.Error("missing X-Timestamp header")
		}
		body, _ := io.ReadAll(r.Body)
		requestBody = string(body)
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true,"data":{"id":"acc-1","owner_id":"owner-123","account_type":"personal","currency":"GBP","balance":"0.00","created_at":"2024-01-01T00:00:00Z"}}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	account, err := client.CreateAccount("owner-123", "personal", strPtr("GBP"))
	if err != nil {
		t.Fatalf("CreateAccount failed: %v", err)
	}
	if account.ID != "acc-1" {
		t.Errorf("ID = %s, want acc-1", account.ID)
	}
	if account.OwnerID != "owner-123" {
		t.Errorf("OwnerID = %s, want owner-123", account.OwnerID)
	}
	if account.Balance != "0.00" {
		t.Errorf("Balance = %s, want 0.00", account.Balance)
	}

	var req CreateAccountRequest
	if err := json.Unmarshal([]byte(requestBody), &req); err != nil {
		t.Fatalf("failed to parse request body: %v", err)
	}
	if req.OwnerID != "owner-123" {
		t.Errorf("request OwnerID = %s", req.OwnerID)
	}
	if req.AccountType != "personal" {
		t.Errorf("request AccountType = %s", req.AccountType)
	}
	if req.Currency == nil || *req.Currency != "GBP" {
		t.Errorf("request Currency = %v", req.Currency)
	}
}

func TestIntegration_CreateAccount_DefaultCurrency(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		var req CreateAccountRequest
		json.Unmarshal(body, &req)
		if req.Currency == nil || *req.Currency != "GBP" {
			t.Errorf("expected default currency GBP, got %v", req.Currency)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true,"data":{"id":"acc-1"}}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	_, err := client.CreateAccount("owner-123", "personal", nil)
	if err != nil {
		t.Fatalf("CreateAccount failed: %v", err)
	}
}

func TestIntegration_GetAccount(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			t.Errorf("method = %s, want GET", r.Method)
		}
		if r.URL.Path != "/v1/api/accounts/acc-1" {
			t.Errorf("path = %s, want /v1/api/accounts/acc-1", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true,"data":{"id":"acc-1","owner_id":"owner-123","balance":"50.00"}}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	account, err := client.GetAccount("acc-1")
	if err != nil {
		t.Fatalf("GetAccount failed: %v", err)
	}
	if account.ID != "acc-1" {
		t.Errorf("ID = %s", account.ID)
	}
	if account.Balance != "50.00" {
		t.Errorf("Balance = %s", account.Balance)
	}
}

func TestIntegration_GetAccountsByOwner(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/api/accounts/owner/owner-123" {
			t.Errorf("path = %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true,"data":[{"id":"acc-1","balance":"10.00"},{"id":"acc-2","balance":"20.00"}]}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	accounts, err := client.GetAccountsByOwner("owner-123")
	if err != nil {
		t.Fatalf("GetAccountsByOwner failed: %v", err)
	}
	if len(accounts) != 2 {
		t.Fatalf("expected 2 accounts, got %d", len(accounts))
	}
	if accounts[0].ID != "acc-1" {
		t.Errorf("accounts[0].ID = %s", accounts[0].ID)
	}
	if accounts[1].ID != "acc-2" {
		t.Errorf("accounts[1].ID = %s", accounts[1].ID)
	}
}

func TestIntegration_Transfer(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("method = %s, want POST", r.Method)
		}
		body, _ := io.ReadAll(r.Body)
		var req TransferRequest
		json.Unmarshal(body, &req)
		if req.SourceID != "src-1" {
			t.Errorf("SourceID = %s", req.SourceID)
		}
		if req.Amount != "100.00" {
			t.Errorf("Amount = %s", req.Amount)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true,"data":{"id":"tx-1","amount":"100.00","status":"pending"}}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	tx, err := client.Transfer("src-1", "dst-1", "100.00", strPtr("GBP"), strPtr("REF-1"))
	if err != nil {
		t.Fatalf("Transfer failed: %v", err)
	}
	if tx.ID != "tx-1" {
		t.Errorf("ID = %s", tx.ID)
	}
	if tx.Amount != "100.00" {
		t.Errorf("Amount = %s", tx.Amount)
	}
}

func TestIntegration_CompleteTransaction(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/api/transactions/tx-1/complete" {
			t.Errorf("path = %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	success, err := client.CompleteTransaction("tx-1")
	if err != nil {
		t.Fatalf("CompleteTransaction failed: %v", err)
	}
	if !success {
		t.Error("expected success=true")
	}
}

func TestIntegration_FailTransaction(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/api/transactions/tx-1/fail" {
			t.Errorf("path = %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	success, err := client.FailTransaction("tx-1")
	if err != nil {
		t.Fatalf("FailTransaction failed: %v", err)
	}
	if !success {
		t.Error("expected success=true")
	}
}

func TestIntegration_CreateWallet(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/api/wallets" {
			t.Errorf("unexpected: %s %s", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true,"data":{"id":"wallet-1","address":"0x123","chain":"ethereum"}}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	wallet, err := client.CreateWallet("owner-1", "evm", "ethereum", "0x123", nil)
	if err != nil {
		t.Fatalf("CreateWallet failed: %v", err)
	}
	if wallet.ID != "wallet-1" {
		t.Errorf("ID = %s", wallet.ID)
	}
}

func TestIntegration_GetWallets(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true,"data":[{"id":"w-1","address":"0x111"},{"id":"w-2","address":"0x222"}]}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	wallets, err := client.GetWallets("owner-1")
	if err != nil {
		t.Fatalf("GetWallets failed: %v", err)
	}
	if len(wallets) != 2 {
		t.Fatalf("expected 2 wallets, got %d", len(wallets))
	}
}

func TestIntegration_RelayTransaction(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/api/wallets/w-1/relay" {
			t.Errorf("path = %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true,"data":{"transaction_hash":"0xabc123"}}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	hash, err := client.RelayTransaction("w-1", "signed-tx-data")
	if err != nil {
		t.Fatalf("RelayTransaction failed: %v", err)
	}
	if hash != "0xabc123" {
		t.Errorf("hash = %s, want 0xabc123", hash)
	}
}

func TestIntegration_CreateSplit(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/api/splits" {
			t.Errorf("unexpected: %s %s", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true,"data":{"id":"split-1","total":"100.00","splits":[{"account_id":"a-1","percentage":60},{"account_id":"a-2","percentage":40}]}}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	splits := []SplitEntry{
		{AccountID: "a-1", Percentage: 60},
		{AccountID: "a-2", Percentage: 40},
	}
	rule, err := client.CreateSplit("100.00", splits, strPtr("GBP"), nil)
	if err != nil {
		t.Fatalf("CreateSplit failed: %v", err)
	}
	if rule.ID != "split-1" {
		t.Errorf("ID = %s", rule.ID)
	}
	if len(rule.Splits) != 2 {
		t.Errorf("expected 2 splits, got %d", len(rule.Splits))
	}
}

func TestIntegration_GetSplit(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/api/splits/split-1" {
			t.Errorf("path = %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":true,"data":{"id":"split-1"}}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	rule, err := client.GetSplit("split-1")
	if err != nil {
		t.Fatalf("GetSplit failed: %v", err)
	}
	if rule.ID != "split-1" {
		t.Errorf("ID = %s", rule.ID)
	}
}

func TestIntegration_CreateCardToken(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/payments/tokens" {
			t.Errorf("unexpected: %s %s", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"id":"tok_123","card":{"brand":"visa","last4":"4242","exp_month":12,"exp_year":2026},"created_at":"2024-01-01T00:00:00Z"}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	card := CardInput{Number: "4111111111111111", ExpMonth: 12, ExpYear: 2026, CVC: "123"}
	token, err := client.CreateCardToken(card, nil)
	if err != nil {
		t.Fatalf("CreateCardToken failed: %v", err)
	}
	if token.ID != "tok_123" {
		t.Errorf("ID = %s", token.ID)
	}
	if token.Card.Brand != "visa" {
		t.Errorf("Brand = %s", token.Card.Brand)
	}
	if token.Card.Last4 != "4242" {
		t.Errorf("Last4 = %s", token.Card.Last4)
	}
}

func TestIntegration_CreatePaymentIntent(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/payments/intents" {
			t.Errorf("unexpected: %s %s", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"id":"pi_123","status":"succeeded","amount":2000,"currency":"GBP","client_secret":"secret_abc"}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	intent, err := client.CreatePaymentIntent(2000, "GBP", strPtr("tok_123"), nil, nil)
	if err != nil {
		t.Fatalf("CreatePaymentIntent failed: %v", err)
	}
	if intent.ID != "pi_123" {
		t.Errorf("ID = %s", intent.ID)
	}
	if intent.ClientSecret != "secret_abc" {
		t.Errorf("ClientSecret = %s", intent.ClientSecret)
	}
}

func TestIntegration_CreateRefund(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/refunds" {
			t.Errorf("unexpected: %s %s", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"id":"re_123","status":"succeeded","amount":1000,"charge":"ch_456"}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	refund, err := client.CreateRefund("ch_456", intPtr(1000))
	if err != nil {
		t.Fatalf("CreateRefund failed: %v", err)
	}
	if refund.ID != "re_123" {
		t.Errorf("ID = %s", refund.ID)
	}
	if refund.Charge != "ch_456" {
		t.Errorf("Charge = %s", refund.Charge)
	}
}

func TestIntegration_GetCommission(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/commission" {
			t.Errorf("path = %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"total_commission":5000}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	commission, err := client.GetCommission()
	if err != nil {
		t.Fatalf("GetCommission failed: %v", err)
	}
	if commission.TotalCommission != 5000 {
		t.Errorf("TotalCommission = %d, want 5000", commission.TotalCommission)
	}
}

func TestIntegration_SendWebhookEvent(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/webhooks/stripe" {
			t.Errorf("unexpected: %s %s", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"received":true}`)
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	payload := map[string]interface{}{
		"type": "payment_intent.succeeded",
		"data": map[string]interface{}{
			"object": map[string]interface{}{
				"id": "pi_123",
			},
		},
	}
	result, err := client.SendWebhookEvent(payload)
	if err != nil {
		t.Fatalf("SendWebhookEvent failed: %v", err)
	}
	if !result.Received {
		t.Error("expected received=true")
	}
}

func TestIntegration_GetMetrics(t *testing.T) {
	server := setupTestServerWithHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" || r.URL.Path != "/v1/metrics" {
			t.Errorf("unexpected: %s %s", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total 100\n")
	})
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	metrics, err := client.GetMetrics()
	if err != nil {
		t.Fatalf("GetMetrics failed: %v", err)
	}
	if !strings.Contains(metrics, "http_requests_total") {
		t.Error("expected metrics to contain http_requests_total")
	}
}

// ============================================
// Error Response Integration Tests
// ============================================

func TestIntegration_AuthenticationError(t *testing.T) {
	server := setupTestServer(http.StatusUnauthorized, `{"success":false,"error":"Invalid API key"}`)
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	_, err := client.GetAccount("any")
	if err == nil {
		t.Fatal("expected error")
	}
	var authErr *AuthenticationError
	if !errors.As(err, &authErr) {
		t.Fatalf("expected AuthenticationError, got %T", err)
	}
	if authErr.Message != "Invalid API key" {
		t.Errorf("Message = %s", authErr.Message)
	}
	if authErr.StatusCode != 401 {
		t.Errorf("StatusCode = %d", authErr.StatusCode)
	}
}

func TestIntegration_NotFoundError(t *testing.T) {
	server := setupTestServer(http.StatusNotFound, `{"success":false,"error":"Account not found"}`)
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	_, err := client.GetAccount("non-existent")
	if err == nil {
		t.Fatal("expected error")
	}
	var notFound *NotFoundError
	if !errors.As(err, &notFound) {
		t.Fatalf("expected NotFoundError, got %T", err)
	}
	if notFound.Message != "Account not found" {
		t.Errorf("Message = %s", notFound.Message)
	}
}

func TestIntegration_ValidationError(t *testing.T) {
	server := setupTestServer(http.StatusBadRequest, `{"success":false,"error":"Invalid account type"}`)
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	_, err := client.CreateAccount("owner-1", "invalid-type", nil)
	if err == nil {
		t.Fatal("expected error")
	}
	var valErr *ValidationError
	if !errors.As(err, &valErr) {
		t.Fatalf("expected ValidationError, got %T", err)
	}
	if valErr.Message != "Invalid account type" {
		t.Errorf("Message = %s", valErr.Message)
	}
}

func TestIntegration_GatewayError(t *testing.T) {
	server := setupTestServer(http.StatusPaymentRequired, `{"error":"Insufficient funds"}`)
	defer server.Close()

	client := NewClient(server.URL, "pk_test", "sk_test")
	_, err := client.CreateCardToken(CardInput{}, nil)
	if err == nil {
		t.Fatal("expected error")
	}
	var hydraErr *HydraError
	if !errors.As(err, &hydraErr) {
		t.Fatalf("expected HydraError, got %T", err)
	}
}

// ============================================
// Helpers
// ============================================

func strPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}
