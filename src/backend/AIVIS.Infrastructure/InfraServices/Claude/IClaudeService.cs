namespace AIVIS.Infrastructure.InfraServices.Claude;

public interface IClaudeService
{
    IAsyncEnumerable<string> StreamMessageAsync(string systemPrompt, string userMessage, CancellationToken ct = default);
    Task<string> SendMessageAsync(string systemPrompt, string userMessage, CancellationToken ct = default);
}
