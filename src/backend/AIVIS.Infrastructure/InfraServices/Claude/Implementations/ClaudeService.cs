using System.Runtime.CompilerServices;
using Microsoft.Extensions.Configuration;

namespace AIVIS.Infrastructure.InfraServices.Claude.Implementations;

// Legacy stub — actual LLM work handled by ClaudeLlmService (ILlmService)
public class ClaudeService : IClaudeService
{
    private readonly HttpClient _httpClient;

    public ClaudeService(HttpClient httpClient, IConfiguration config) =>
        _httpClient = httpClient;

    public async IAsyncEnumerable<string> StreamMessageAsync(
        string systemPrompt,
        string userMessage,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        yield break;
    }

    public Task<string> SendMessageAsync(
        string systemPrompt,
        string userMessage,
        CancellationToken ct = default) => Task.FromResult(string.Empty);
}
