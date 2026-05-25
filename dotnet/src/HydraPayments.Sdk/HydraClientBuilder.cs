namespace HydraPayments.Sdk;

public class HydraClientBuilder
{
    private string _baseUrl = "http://localhost:8080";
    private string _apiKey = string.Empty;
    private string _secretKey = string.Empty;
    private string _defaultCurrency = "GBP";
    private string _locale = "en";
    private TimeSpan _timeout = TimeSpan.FromSeconds(30);
    private HttpClient? _httpClient;

    public HydraClientBuilder BaseUrl(string baseUrl)
    {
        _baseUrl = baseUrl.TrimEnd('/');
        return this;
    }

    public HydraClientBuilder ApiKey(string apiKey)
    {
        _apiKey = apiKey;
        return this;
    }

    public HydraClientBuilder SecretKey(string secretKey)
    {
        _secretKey = secretKey;
        return this;
    }

    public HydraClientBuilder DefaultCurrency(string defaultCurrency)
    {
        _defaultCurrency = defaultCurrency;
        return this;
    }

    public HydraClientBuilder Locale(string locale)
    {
        _locale = locale;
        return this;
    }

    public HydraClientBuilder Timeout(TimeSpan timeout)
    {
        _timeout = timeout;
        return this;
    }

    public HydraClientBuilder HttpClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
        return this;
    }

    public IHydraClient Build()
    {
        var httpClient = _httpClient ?? new HttpClient();
        httpClient.Timeout = _timeout;
        return new HydraClient(_baseUrl, _apiKey, _secretKey, _defaultCurrency, _locale, httpClient);
    }
}
