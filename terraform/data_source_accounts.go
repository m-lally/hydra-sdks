package main

import (
	"context"

	"github.com/hashicorp/terraform-plugin-sdk/v2/diag"
	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

func dataSourceAccounts() *schema.Resource {
	return &schema.Resource{
		ReadContext: dataSourceAccountsRead,
		Schema: map[string]*schema.Schema{
			"owner_id": {
				Type:     schema.TypeString,
				Required: true,
			},
			"accounts": {
				Type:     schema.TypeList,
				Computed: true,
				Elem: &schema.Resource{
					Schema: map[string]*schema.Schema{
						"id": {
							Type:     schema.TypeString,
							Computed: true,
						},
						"owner_id": {
							Type:     schema.TypeString,
							Computed: true,
						},
						"account_type": {
							Type:     schema.TypeString,
							Computed: true,
						},
						"currency": {
							Type:     schema.TypeString,
							Computed: true,
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
				},
			},
		},
	}
}

func dataSourceAccountsRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	ownerID := d.Get("owner_id").(string)
	accounts, err := c.GetAccountsByOwner(ownerID)
	if err != nil {
		return diag.FromErr(err)
	}

	d.SetId(ownerID)

	flattened := make([]interface{}, len(accounts))
	for i, a := range accounts {
		flattened[i] = map[string]interface{}{
			"id":           a.ID,
			"owner_id":     a.OwnerID,
			"account_type": a.AccountType,
			"currency":     a.Currency,
			"balance":      a.Balance,
			"created_at":   a.CreatedAt,
		}
	}
	d.Set("accounts", flattened)

	return nil
}
