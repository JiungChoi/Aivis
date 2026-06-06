using System.Text.Json;
using AIVIS.Domain.Models.Agent;

namespace AIVIS.Domain.Services;

/// <summary>
/// Provider-agnostic LLM abstraction. Swap the implementation (Ollama, Claude, GPT) without touching Application code.
/// </summary>
public interface ILlmService
{
    // Non-streaming call that surfaces tool calls
    Task<LlmNonStreamResponse> SendWithToolsAsync(
        IReadOnlyList<ChatMessage> messages,
        IReadOnlyList<ToolDefinition> tools,
        CancellationToken ct = default);

    // Pure streaming for final text responses
    IAsyncEnumerable<LlmChunk> StreamAsync(
        IReadOnlyList<ChatMessage> messages,
        CancellationToken ct = default);
}

public record LlmNonStreamResponse(
    string? TextContent,
    IReadOnlyList<LlmToolCallResult> ToolCalls)
{
    public bool HasToolCalls => ToolCalls.Count > 0;
}

public record LlmToolCallResult(string Name, JsonElement RawArguments);
