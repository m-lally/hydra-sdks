package main

import (
	"context"

	"github.com/hashicorp/terraform-plugin-sdk/v2/diag"
	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

func resourceTransaction() *schema.Resource {
	return &schema.Resource{
		CreateContext: resourceTransactionCreate,
		ReadContext:   resourceTransactionRead,
		UpdateContext: resourceTransactionUpdate,
		DeleteContext: resourceTransactionDelete,
		Importer: &schema.ResourceImporter{
			StateContext: schema.ImportStatePassthroughContext,
		},
		Schema: map[string]*schema.Schema{
			"id": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"source_id": {
				Type:     schema.TypeString,
				Required: true,
				ForceNew: true,
			},
			"dest_id": {
				Type:     schema.TypeString,
				Required: true,
				ForceNew: true,
			},
			"amount": {
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
			"status": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"action": {
				Type:     schema.TypeString,
				Optional: true,
				Default:  "transfer",
				ForceNew: false,
				Description: "Action to perform: 'transfer' (default), 'complete', or 'fail'",
			},
			"created_at": {
				Type:     schema.TypeString,
				Computed: true,
			},
		},
	}
}

func resourceTransactionCreate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	sourceID := d.Get("source_id").(string)
	destID := d.Get("dest_id").(string)
	amount := d.Get("amount").(string)
	currency := d.Get("currency").(string)
	reference := d.Get("reference").(string)

	if currency == "" {
		currency = c.defaultCurrency
	}

	tx, err := c.Transfer(sourceID, destID, amount, currency, reference)
	if err != nil {
		return diag.FromErr(err)
	}

	d.SetId(tx.ID)
	flattenTransaction(d, tx)

	action := d.Get("action").(string)
	if action == "complete" {
		if err := c.CompleteTransaction(tx.ID); err != nil {
			return diag.FromErr(err)
		}
		d.Set("status", "completed")
	} else if action == "fail" {
		if err := c.FailTransaction(tx.ID); err != nil {
			return diag.FromErr(err)
		}
		d.Set("status", "failed")
	}

	return nil
}

func resourceTransactionRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	tx, err := c.GetTransaction(d.Id())
	if err != nil {
		if isNotFound(err) {
			d.SetId("")
			return nil
		}
		return diag.FromErr(err)
	}

	flattenTransaction(d, tx)
	return nil
}

func resourceTransactionUpdate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	if d.HasChange("action") {
		action := d.Get("action").(string)
		switch action {
		case "complete":
			if err := c.CompleteTransaction(d.Id()); err != nil {
				return diag.FromErr(err)
			}
			d.Set("status", "completed")
		case "fail":
			if err := c.FailTransaction(d.Id()); err != nil {
				return diag.FromErr(err)
			}
			d.Set("status", "failed")
		}
	}

	return resourceTransactionRead(ctx, d, m)
}

func resourceTransactionDelete(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	d.SetId("")
	return nil
}

func flattenTransaction(d *schema.ResourceData, tx *Transaction) {
	d.Set("source_id", tx.SourceAccountID)
	d.Set("dest_id", tx.DestAccountID)
	d.Set("amount", tx.Amount)
	d.Set("currency", tx.Currency)
	d.Set("status", tx.Status)
	d.Set("reference", tx.Reference)
	d.Set("created_at", tx.CreatedAt)
	if tx.TransactionType != "" {
		d.Set("action", tx.TransactionType)
	}
}
