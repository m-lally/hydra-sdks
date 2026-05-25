package main

import (
	"context"

	"github.com/hashicorp/terraform-plugin-sdk/v2/diag"
	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

func dataSourceHealth() *schema.Resource {
	return &schema.Resource{
		ReadContext: dataSourceHealthRead,
		Schema: map[string]*schema.Schema{
			"status": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"version": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"database": {
				Type:     schema.TypeString,
				Computed: true,
			},
		},
	}
}

func dataSourceHealthRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	health, err := c.HealthCheck()
	if err != nil {
		return diag.FromErr(err)
	}

	d.SetId("hydra_health")
	d.Set("status", health.Status)
	d.Set("version", health.Version)
	d.Set("database", health.Database)

	return nil
}
