using Microsoft.Extensions.Configuration;

namespace AIVIS.Infrastructure.InfraServices.Claude.Handlers;

public class ClaudeMessageHandler : DelegatingHandler
{
    private readonly string _apiKey;

    public ClaudeMessageHandler(IConfiguration config)
    {
        _apiKey = config["Anthropic:ApiKey"] ?? string.Empty;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        request.Headers.Add("x-api-key", _apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        return await base.SendAsync(request, ct);
    }
}
