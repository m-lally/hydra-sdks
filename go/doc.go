/*
Package hydra provides a Go SDK for the Hydra Payment Service.

The SDK supports both the Core Ledger API (accounts, transactions, wallets, splits)
and the Payment Gateway API (card tokens, payment intents, refunds, commission)
with automatic HMAC-SHA256 request signing.

# Quick Start

	import "github.com/hydra-payments/go-sdk"

	func main() {
		client := hydra.NewClient("http://localhost:8080", "pk_xxx", "sk_xxx")

		// Health check
		health, err := client.HealthCheck()
		if err != nil {
			panic(err)
		}

		// Create an account
		account, err := client.CreateAccount("user-123", "personal", nil)
		if err != nil {
			panic(err)
		}
	}

# Using the Builder

	client := hydra.NewHydraClientBuilder().
		BaseURL("http://localhost:8080").
		APIKey("pk_xxx").
		SecretKey("sk_xxx").
		WithDefaultCurrency("USD").
		WithLocale("fr").
		Build()

# Error Handling

The SDK returns typed errors that can be checked with type assertions:

	result, err := client.GetAccount("non-existent")
	if err != nil {
		var notFound *hydra.NotFoundError
		if errors.As(err, &notFound) {
			// Handle not found
		}
	}
*/
package hydra
