package main

import (
	"context"

	"github.com/hashicorp/terraform-plugin-sdk/v2/diag"
	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

func resourceWallet() *schema.Resource {
	return &schema.Resource{
		CreateContext: resourceWalletCreate,
		ReadContext:   resourceWalletRead,
		DeleteContext: resourceWalletDelete,
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
			"wallet_type": {
				Type:     schema.TypeString,
				Required: true,
				ForceNew: true,
			},
			"chain": {
				Type:     schema.TypeString,
				Required: true,
				ForceNew: true,
			},
			"address": {
				Type:     schema.TypeString,
				Required: true,
				ForceNew: true,
			},
			"encrypted_private_key": {
				Type:      schema.TypeString,
				Optional:  true,
				ForceNew:  true,
				Sensitive: true,
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
	}
}

func resourceWalletCreate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	ownerID := d.Get("owner_id").(string)
	walletType := d.Get("wallet_type").(string)
	chain := d.Get("chain").(string)
	address := d.Get("address").(string)

	var encryptedPrivateKey *string
	if v, ok := d.GetOk("encrypted_private_key"); ok {
		s := v.(string)
		encryptedPrivateKey = &s
	}

	wallet, err := c.CreateWallet(ownerID, walletType, chain, address, encryptedPrivateKey)
	if err != nil {
		return diag.FromErr(err)
	}

	d.SetId(wallet.ID)
	flattenWallet(d, wallet)

	return nil
}

func resourceWalletRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	c := m.(*Client)

	wallets, err := c.GetWallets(d.Get("owner_id").(string))
	if err != nil {
		if isNotFound(err) {
			d.SetId("")
			return nil
		}
		return diag.FromErr(err)
	}

	for _, w := range wallets {
		if w.ID == d.Id() {
			flattenWallet(d, &w)
			return nil
		}
	}

	d.SetId("")
	return nil
}

func resourceWalletDelete(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	d.SetId("")
	return nil
}

func flattenWallet(d *schema.ResourceData, w *Wallet) {
	d.Set("owner_id", w.OwnerID)
	d.Set("wallet_type", w.WalletType)
	d.Set("chain", w.Chain)
	d.Set("address", w.Address)
	d.Set("is_custodial", w.IsCustodial)
	d.Set("created_at", w.CreatedAt)
}
