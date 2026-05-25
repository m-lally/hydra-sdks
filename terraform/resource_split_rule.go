package main

import (
	"context"

	"github.com/hashicorp/terraform-plugin-sdk/v2/diag"
	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

func resourceSplitRule() *schema.Resource {
	return &schema.Resource{
		CreateContext: resourceSplitRuleCreate,
		ReadContext:   resourceSplitRuleRead,
		DeleteContext: resourceSplitRuleDelete,
		Importer: &schema.ResourceImporter{
			StateContext: schema.ImportStatePassthroughContext,
		},
		Schema: map[string]*schema.Schema{
			"id": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"total": {
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
			"reference": {
				Type:     schema.TypeString,
				Optional: true,
				ForceNew: true,
			},
			"split": {
				Type:     schema.TypeList,
				Required: true,
				ForceNew: true,
				Elem: &schema.Resource{
					Schema: map[string]*schema.Schema{
						"account_id": {
							Type:     schema.TypeString,
							Required: true,
						},
						"percentage": {
							Type:     schema.TypeFloat,
							Required: true,
						},
					},
				},
			},
			"status": {
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

func resourceSplitRuleCreate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	total := d.Get("total").(string)
	currency := d.Get("currency").(string)
	reference := d.Get("reference").(string)

	if currency == "" {
		currency = c.defaultCurrency
	}

	splitsRaw := d.Get("split").([]interface{})
	splits := make([]SplitEntry, len(splitsRaw))
	for i, raw := range splitsRaw {
		s := raw.(map[string]interface{})
		splits[i] = SplitEntry{
			AccountID:  s["account_id"].(string),
			Percentage: s["percentage"].(float64),
		}
	}

	rule, err := c.CreateSplit(total, splits, currency, reference)
	if err != nil {
		return diag.FromErr(err)
	}

	d.SetId(rule.ID)
	flattenSplitRule(d, rule)

	return nil
}

func resourceSplitRuleRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	rule, err := c.GetSplit(d.Id())
	if err != nil {
		if isNotFound(err) {
			d.SetId("")
			return nil
		}
		return diag.FromErr(err)
	}

	flattenSplitRule(d, rule)
	return nil
}

func resourceSplitRuleDelete(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	d.SetId("")
	return nil
}

func flattenSplitRule(d *schema.ResourceData, r *SplitRule) {
	d.Set("total", r.Total)
	d.Set("currency", r.Currency)
	d.Set("status", r.Status)
	d.Set("created_at", r.CreatedAt)

	splits := make([]interface{}, len(r.Splits))
	for i, s := range r.Splits {
		splits[i] = map[string]interface{}{
			"account_id": s.AccountID,
			"percentage": s.Percentage,
		}
	}
	d.Set("split", splits)
}
