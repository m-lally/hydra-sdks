<?php

declare(strict_types=1);

namespace HydraPayments\Sdk;

use Illuminate\Support\ServiceProvider;

/**
 * Laravel service provider for the Hydra Payment SDK.
 *
 * Registers the HydraClient as a singleton in the Laravel service container
 * and publishes the configuration file.
 *
 * Usage (config/hydra.php):
 *     'base_url' => env('HYDRA_BASE_URL', 'http://localhost:8080'),
 *     'api_key' => env('HYDRA_API_KEY'),
 *     'secret_key' => env('HYDRA_SECRET_KEY'),
 *     'default_currency' => env('HYDRA_DEFAULT_CURRENCY', 'GBP'),
 *     'locale' => env('HYDRA_LOCALE', 'en'),
 */
class HydraServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/../config/hydra.php' => config_path('hydra.php'),
        ], 'hydra-config');
    }

    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__ . '/../config/hydra.php',
            'hydra',
        );

        $this->app->singleton(HydraClient::class, function ($app) {
            $config = $app['config']['hydra'];

            return new HydraClient(
                baseUrl: $config['base_url'] ?? 'http://localhost:8080',
                apiKey: $config['api_key'] ?? '',
                secretKey: $config['secret_key'] ?? '',
                timeout: (float) ($config['timeout'] ?? 30.0),
                defaultCurrency: $config['default_currency'] ?? 'GBP',
                locale: $config['locale'] ?? 'en',
            );
        });

        $this->app->alias(HydraClient::class, 'hydra.client');
    }
}
