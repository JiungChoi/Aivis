using Microsoft.Extensions.Configuration;

namespace AIVIS.Infrastructure.InfraServices.Claude.Implementations;

public class ClaudeService : IClaudeService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public ClaudeService(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _apiKey = config["Anthropic:ApiKey"] ?? throw new InvalidOperationException("Anthropic API key not configured");
    }

    public async IAsyncEnumerable<string> StreamMessageAsync(string systemPrompt, string userMessage, CancellationToken ct = default)
    {
        // Anthropic streaming 구현
        yield break;
    }

    public async Task<string> SendMessageAsync(string systemPrompt, string userMessage, CancellationToken ct = default)
    {
        // Anthropic messages API 호출 구현
        return string.Empty;
    }
}
