<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Hydra Payment Service Configuration
    |--------------------------------------------------------------------------
    |
    | Configure the connection to the Hydra Payment Service API.
    | These values can be set via environment variables.
    |
    */

    // Base URL of the Hydra API server.
    'base_url' => env('HYDRA_BASE_URL', 'http://localhost:8080'),

    // Your API publishable key (X-API-Key header).
    'api_key' => env('HYDRA_API_KEY', ''),

    // Your API secret key (used for HMAC-SHA256 request signing).
    'secret_key' => env('HYDRA_SECRET_KEY', ''),

    // Request timeout in seconds.
    'timeout' => env('HYDRA_TIMEOUT', 30.0),

    // Default currency for transactions.
    'default_currency' => env('HYDRA_DEFAULT_CURRENCY', 'GBP'),

    // Locale for i18n support (e.g., "en", "es", "fr", "de").
    'locale' => env('HYDRA_LOCALE', 'en'),
];
