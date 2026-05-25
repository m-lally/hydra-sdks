package main

import (
	"context"

	"github.com/hashicorp/terraform-plugin-sdk/v2/diag"
	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

func resourceAccount() *schema.Resource {
	return &schema.Resource{
		CreateContext: resourceAccountCreate,
		ReadContext:   resourceAccountRead,
		DeleteContext: resourceAccountDelete,
		Importer: &schema.ResourceImporter{
			StateContext: schema.ImportStatePassthroughContext,
		},
		Schema: map[string]*schema.Schema{
			"id": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"owner_id": {
				Type:     schema.TypeString,
				Required: true,
				ForceNew: true,
			},
			"account_type": {
				Type:     schema.TypeString,
				Required: true,
				ForceNew: true,
			},
			"currency": {
				Type:     schema.TypeString,
				Optional: true,
				Computed: true,
				ForceNew: true,
			},
			"balance": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"created_at": {
				Type:     schema.TypeString,
				Computed: true,
			},
		},
	}
}

func resourceAccountCreate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	ownerID := d.Get("owner_id").(string)
	accountType := d.Get("account_type").(string)
	currency := d.Get("currency").(string)

	if currency == "" {
		currency = c.defaultCurrency
	}

	account, err := c.CreateAccount(ownerID, accountType, currency)
	if err != nil {
		return diag.FromErr(err)
	}

	d.SetId(account.ID)
	flattenAccount(d, account)

	return nil
}

func resourceAccountRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	account, err := c.GetAccount(d.Id())
	if err != nil {
		if isNotFound(err) {
			d.SetId("")
			return nil
		}
		return diag.FromErr(err)
	}

	flattenAccount(d, account)
	return nil
}

func resourceAccountDelete(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	d.SetId("")
	return nil
}

func flattenAccount(d *schema.ResourceData, a *Account) {
	d.Set("owner_id", a.OwnerID)
	d.Set("account_type", a.AccountType)
	d.Set("currency", a.Currency)
	d.Set("balance", a.Balance)
	d.Set("created_at", a.CreatedAt)
}

func isNotFound(err error) bool {
	if hErr, ok := err.(*HydraError); ok && hErr.StatusCode == 404 {
		return true
	}
	return false
}
