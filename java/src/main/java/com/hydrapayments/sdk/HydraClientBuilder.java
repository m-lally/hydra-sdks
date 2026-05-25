package com.hydrapayments.sdk;

import java.net.http.HttpClient;
import java.time.Duration;

public class HydraClientBuilder {

    private String baseUrl = "http://localhost:8080";
    private String apiKey = "";
    private String secretKey = "";
    private String defaultCurrency = "GBP";
    private String locale = "en";
    private Duration timeout = Duration.ofSeconds(30);
    private HttpClient httpClient;

    public HydraClientBuilder baseUrl(String baseUrl) {
        if (baseUrl != null) {
            this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        }
        return this;
    }

    public HydraClientBuilder apiKey(String apiKey) {
        this.apiKey = apiKey;
        return this;
    }

    public HydraClientBuilder secretKey(String secretKey) {
        this.secretKey = secretKey;
        return this;
    }

    public HydraClientBuilder withDefaultCurrency(String defaultCurrency) {
        this.defaultCurrency = defaultCurrency;
        return this;
    }

    public HydraClientBuilder withLocale(String locale) {
        this.locale = locale;
        return this;
    }

    public HydraClientBuilder timeout(Duration timeout) {
        this.timeout = timeout;
        return this;
    }

    public HydraClientBuilder httpClient(HttpClient httpClient) {
        this.httpClient = httpClient;
        return this;
    }

    public HydraClient build() {
        return new HydraClientImpl(baseUrl, apiKey, secretKey, defaultCurrency, locale, timeout, httpClient);
    }
}
