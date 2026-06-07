using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using AIVIS.Domain.Models.Agent;
using AIVIS.Domain.Services;
using AIVIS.Infrastructure.Configuration.LlmModels;
using Microsoft.Extensions.Options;

namespace AIVIS.Infrastructure.InfraServices.Ollama.Implementations;

public class OllamaService : ILlmService
{
    private readonly HttpClient _httpClient;
    private readonly OllamaConfig _config;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public OllamaService(HttpClient httpClient, IOptions<OllamaConfig> config)
    {
        _httpClient = httpClient;
        _config = config.Value;
    }

    // ── Tool 포함 non-streaming 호출 ──────────────────────────
    public async Task<LlmNonStreamResponse> SendWithToolsAsync(
        IReadOnlyList<ChatMessage> messages,
        IReadOnlyList<ToolDefinition> tools,
        CancellationToken ct = default)
    {
        var body = new
        {
            model = _config.Model,
            stream = false,
            messages = ToOllamaMessages(messages),
            tools = tools,
        };

        var response = await _httpClient.PostAsJsonAsync(
            $"{_config.BaseUrl}/api/chat", body, JsonOpts, ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        var result = JsonSerializer.Deserialize<OllamaNonStreamResponse>(json, JsonOpts);

        var msg = result?.Message;
        if (msg?.ToolCalls is { Count: > 0 } calls)
        {
            var toolResults = calls.Select(tc => new LlmToolCallResult(
                Guid.NewGuid().ToString(),
                tc.Function.Name,
                tc.Function.Arguments)).ToList();
            return new LlmNonStreamResponse(null, toolResults);
        }

        return new LlmNonStreamResponse(msg?.Content ?? string.Empty, []);
    }

    // ── 순수 스트리밍 (tools 없음) ────────────────────────────
    public async IAsyncEnumerable<LlmChunk> StreamAsync(
        IReadOnlyList<ChatMessage> messages,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var body = new
        {
            model = _config.Model,
            stream = true,
            messages = ToOllamaMessages(messages),
        };

        var request = new HttpRequestMessage(HttpMethod.Post, $"{_config.BaseUrl}/api/chat")
        {
            Content = JsonContent.Create(body, options: JsonOpts),
        };

        var response = await _httpClient.SendAsync(
            request, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new System.IO.StreamReader(stream);

        while (!reader.EndOfStream && !ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ct);
            if (string.IsNullOrWhiteSpace(line)) continue;

            var chunk = JsonSerializer.Deserialize<OllamaStreamChunk>(line, JsonOpts);
            if (chunk?.Done == true) { yield return new LlmStreamDone(); yield break; }
            if (chunk?.Message?.Content is { Length: > 0 } delta)
                yield return new TextDelta(delta);
        }
    }

    // ── EncodedToolCall/EncodedToolResult → Ollama 형식 변환 ──
    private static List<object> ToOllamaMessages(IReadOnlyList<ChatMessage> messages)
    {
        var result = new List<object>();
        foreach (var msg in messages)
        {
            if (msg.Role == "assistant" && TryParseToolCalls(msg.Content, out var toolCalls))
            {
                result.Add(new
                {
                    role = "assistant",
                    content = (string?)null,
                    tool_calls = toolCalls.Select(tc => new
                    {
                        function = new { name = tc.Name, arguments = tc.Input }
                    }).ToList(),
                });
            }
            else if (msg.Role == "tool" && TryParseToolResult(msg.Content, out var toolResult))
            {
                result.Add(new { role = "tool", content = toolResult.Content });
            }
            else
            {
                result.Add(new { role = msg.Role, content = msg.Content });
            }
        }
        return result;
    }

    private static bool TryParseToolCalls(string content, out List<EncodedToolCall> calls)
    {
        calls = [];
        if (string.IsNullOrWhiteSpace(content) || !content.StartsWith('[')) return false;
        try
        {
            calls = JsonSerializer.Deserialize<List<EncodedToolCall>>(content, JsonOpts) ?? [];
            return calls.Count > 0;
        }
        catch { return false; }
    }

    private static bool TryParseToolResult(string content, out EncodedToolResult result)
    {
        result = new EncodedToolResult(string.Empty, content);
        if (string.IsNullOrWhiteSpace(content) || !content.StartsWith('{')) return false;
        try
        {
            var parsed = JsonSerializer.Deserialize<EncodedToolResult>(content, JsonOpts);
            if (parsed is null) return false;
            result = parsed;
            return true;
        }
        catch { return false; }
    }
}

// ── Ollama API 응답 모델 ──────────────────────────────────────
file record OllamaNonStreamResponse(
    [property: JsonPropertyName("message")] OllamaMessageWithTools? Message);

file record OllamaMessageWithTools(
    [property: JsonPropertyName("role")]       string Role,
    [property: JsonPropertyName("content")]    string? Content,
    [property: JsonPropertyName("tool_calls")] List<OllamaToolCall>? ToolCalls);

file record OllamaToolCall(
    [property: JsonPropertyName("function")] OllamaToolFunction Function);

file record OllamaToolFunction(
    [property: JsonPropertyName("name")]      string Name,
    [property: JsonPropertyName("arguments")] JsonElement Arguments);

file record OllamaStreamChunk(
    [property: JsonPropertyName("message")] OllamaStreamMessage? Message,
    [property: JsonPropertyName("done")]    bool Done);

file record OllamaStreamMessage(
    [property: JsonPropertyName("content")] string? Content);
