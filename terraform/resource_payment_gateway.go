package main

import (
	"context"

	"github.com/hashicorp/terraform-plugin-sdk/v2/diag"
	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

// ============================================
// hydra_payment_token
// ============================================

func resourcePaymentToken() *schema.Resource {
	return &schema.Resource{
		CreateContext: resourcePaymentTokenCreate,
		ReadContext:   resourcePaymentTokenRead,
		DeleteContext: resourcePaymentTokenDelete,
		Schema: map[string]*schema.Schema{
			"id": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"card_number": {
				Type:      schema.TypeString,
				Required:  true,
				ForceNew:  true,
				Sensitive: true,
			},
			"exp_month": {
				Type:     schema.TypeInt,
				Required: true,
				ForceNew: true,
			},
			"exp_year": {
				Type:     schema.TypeInt,
				Required: true,
				ForceNew: true,
			},
			"cvc": {
				Type:      schema.TypeString,
				Required:  true,
				ForceNew:  true,
				Sensitive: true,
			},
			"merchant_id": {
				Type:     schema.TypeString,
				Optional: true,
				ForceNew: true,
			},
			"card_brand": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"card_last4": {
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

func resourcePaymentTokenCreate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	card := CardInput{
		Number:   d.Get("card_number").(string),
		ExpMonth: d.Get("exp_month").(int),
		ExpYear:  d.Get("exp_year").(int),
		CVC:      d.Get("cvc").(string),
	}

	var merchantID *string
	if v, ok := d.GetOk("merchant_id"); ok {
		s := v.(string)
		merchantID = &s
	}

	token, err := c.CreateCardToken(card, merchantID)
	if err != nil {
		return diag.FromErr(err)
	}

	d.SetId(token.ID)
	d.Set("card_brand", token.Card.Brand)
	d.Set("card_last4", token.Card.Last4)
	d.Set("created_at", token.CreatedAt)

	return nil
}

func resourcePaymentTokenRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	return nil
}

func resourcePaymentTokenDelete(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	d.SetId("")
	return nil
}

// ============================================
// hydra_payment_intent
// ============================================

func resourcePaymentIntent() *schema.Resource {
	return &schema.Resource{
		CreateContext: resourcePaymentIntentCreate,
		ReadContext:   resourcePaymentIntentRead,
		DeleteContext: resourcePaymentIntentDelete,
		Schema: map[string]*schema.Schema{
			"id": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"amount": {
				Type:     schema.TypeInt,
				Required: true,
				ForceNew: true,
			},
			"currency": {
				Type:     schema.TypeString,
				Required: true,
				ForceNew: true,
			},
			"token": {
				Type:     schema.TypeString,
				Optional: true,
				ForceNew: true,
			},
			"merchant_id": {
				Type:     schema.TypeString,
				Optional: true,
				ForceNew: true,
			},
			"idempotency_key": {
				Type:     schema.TypeString,
				Optional: true,
				ForceNew: true,
			},
			"status": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"client_secret": {
				Type:      schema.TypeString,
				Computed:  true,
				Sensitive: true,
			},
		},
	}
}

func resourcePaymentIntentCreate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	amount := d.Get("amount").(int)
	currency := d.Get("currency").(string)
	token := d.Get("token").(string)
	merchantID := d.Get("merchant_id").(string)
	idempotencyKey := d.Get("idempotency_key").(string)

	intent, err := c.CreatePaymentIntent(amount, currency, token, merchantID, idempotencyKey)
	if err != nil {
		return diag.FromErr(err)
	}

	d.SetId(intent.ID)
	d.Set("status", intent.Status)
	d.Set("client_secret", intent.ClientSecret)
	d.Set("amount", intent.Amount)
	d.Set("currency", intent.Currency)

	return nil
}

func resourcePaymentIntentRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	return nil
}

func resourcePaymentIntentDelete(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	d.SetId("")
	return nil
}

// ============================================
// hydra_refund
// ============================================

func resourceRefund() *schema.Resource {
	return &schema.Resource{
		CreateContext: resourceRefundCreate,
		ReadContext:   resourceRefundRead,
		DeleteContext: resourceRefundDelete,
		Schema: map[string]*schema.Schema{
			"id": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"charge_id": {
				Type:     schema.TypeString,
				Required: true,
				ForceNew: true,
			},
			"amount": {
				Type:     schema.TypeInt,
				Optional: true,
				ForceNew: true,
			},
			"status": {
				Type:     schema.TypeString,
				Computed: true,
			},
			"refunded_amount": {
				Type:     schema.TypeInt,
				Computed: true,
			},
			"charge": {
				Type:     schema.TypeString,
				Computed: true,
			},
		},
	}
}

func resourceRefundCreate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	chargeID := d.Get("charge_id").(string)

	var amount *int
	if v, ok := d.GetOk("amount"); ok {
		a := v.(int)
		amount = &a
	}

	refund, err := c.CreateRefund(chargeID, amount)
	if err != nil {
		return diag.FromErr(err)
	}

	d.SetId(refund.ID)
	d.Set("status", refund.Status)
	d.Set("refunded_amount", refund.Amount)
	d.Set("charge", refund.Charge)

	return nil
}

func resourceRefundRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	return nil
}

func resourceRefundDelete(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	d.SetId("")
	return nil
}
