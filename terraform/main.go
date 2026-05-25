package main

import (
	"context"
	"flag"

	"github.com/hashicorp/terraform-plugin-sdk/v2/plugin"
)

func main() {
	var debug bool
	flag.BoolVar(&debug, "debug", false, "run provider in debug mode for attachable binaries")
	flag.Parse()

	opts := &plugin.ServeOpts{
		ProviderFunc: Provider,
		ProviderAddr: "registry.terraform.io/hydra-payments/hydra",
	}

	if debug {
		plugin.Debug(context.Background(), "registry.terraform.io/hydra-payments/hydra", opts)
		return
	}

	plugin.Serve(opts)
}
