package main

import (
	"context"

	"github.com/hashicorp/terraform-plugin-sdk/v2/diag"
	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

var providerVersion = "0.1.0"

func Provider() *schema.Provider {
	return &schema.Provider{
		Schema: map[string]*schema.Schema{
			"base_url": {
				Type:        schema.TypeString,
				Optional:    true,
				Default:     "http://localhost:8080",
				Description: "Hydra API base URL",
			},
			"api_key": {
				Type:        schema.TypeString,
				Required:    true,
				Sensitive:   true,
				Description: "Hydra API publishable key",
			},
			"secret_key": {
				Type:        schema.TypeString,
				Required:    true,
				Sensitive:   true,
				Description: "Hydra API secret key for HMAC signing",
			},
			"default_currency": {
				Type:        schema.TypeString,
				Optional:    true,
				Default:     "GBP",
				Description: "Default currency for transactions",
			},
			"locale": {
				Type:        schema.TypeString,
				Optional:    true,
				Default:     "en",
				Description: "Locale for i18n support",
			},
		},
		ResourcesMap: map[string]*schema.Resource{
			"hydra_account":        resourceAccount(),
			"hydra_transaction":    resourceTransaction(),
			"hydra_wallet":         resourceWallet(),
			"hydra_split_rule":     resourceSplitRule(),
			"hydra_payment_token":  resourcePaymentToken(),
			"hydra_payment_intent": resourcePaymentIntent(),
			"hydra_refund":         resourceRefund(),
		},
		DataSourcesMap: map[string]*schema.Resource{
			"hydra_account":    dataSourceAccount(),
			"hydra_accounts":   dataSourceAccounts(),
			"hydra_transaction": dataSourceTransaction(),
			"hydra_wallets":    dataSourceWallets(),
			"hydra_split_rule": dataSourceSplitRule(),
			"hydra_commission": dataSourceCommission(),
			"hydra_health":     dataSourceHealth(),
		},
		ConfigureContextFunc: providerConfigure,
	}
}

func providerConfigure(ctx context.Context, d *schema.ResourceData) (interface{}, diag.Diagnostics) {
	baseURL := d.Get("base_url").(string)
	apiKey := d.Get("api_key").(string)
	secretKey := d.Get("secret_key").(string)
	defaultCurrency := d.Get("default_currency").(string)
	locale := d.Get("locale").(string)

	client := NewClient(baseURL, apiKey, secretKey, defaultCurrency, locale)

	return client, nil
}
