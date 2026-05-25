package main

import (
	"context"

	"github.com/hashicorp/terraform-plugin-sdk/v2/diag"
	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

func dataSourceWallets() *schema.Resource {
	return &schema.Resource{
		ReadContext: dataSourceWalletsRead,
		Schema: map[string]*schema.Schema{
			"owner_id": {
				Type:     schema.TypeString,
				Required: true,
			},
			"wallets": {
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
						"wallet_type": {
							Type:     schema.TypeString,
							Computed: true,
						},
						"chain": {
							Type:     schema.TypeString,
							Computed: true,
						},
						"address": {
							Type:     schema.TypeString,
							Computed: true,
						},
						"is_custodial": {
							Type:     schema.TypeBool,
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

func dataSourceWalletsRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	ownerID := d.Get("owner_id").(string)
	wallets, err := c.GetWallets(ownerID)
	if err != nil {
		return diag.FromErr(err)
	}

	d.SetId(ownerID)

	flattened := make([]interface{}, len(wallets))
	for i, w := range wallets {
		flattened[i] = map[string]interface{}{
			"id":           w.ID,
			"owner_id":     w.OwnerID,
			"wallet_type":  w.WalletType,
			"chain":        w.Chain,
			"address":      w.Address,
			"is_custodial": w.IsCustodial,
			"created_at":   w.CreatedAt,
		}
	}
	d.Set("wallets", flattened)

	return nil
}
