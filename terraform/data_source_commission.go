package main

import (
	"context"

	"github.com/hashicorp/terraform-plugin-sdk/v2/diag"
	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

func dataSourceCommission() *schema.Resource {
	return &schema.Resource{
		ReadContext: dataSourceCommissionRead,
		Schema: map[string]*schema.Schema{
			"total_commission": {
				Type:     schema.TypeInt,
				Computed: true,
			},
		},
	}
}

func dataSourceCommissionRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	commission, err := c.GetCommission()
	if err != nil {
		return diag.FromErr(err)
	}

	d.SetId("hydra_commission")
	d.Set("total_commission", commission.TotalCommission)

	return nil
}
