using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AIVIS.Domain.Models.Agent;
using AIVIS.Domain.Services;
using AIVIS.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace AIVIS.Infrastructure.InfraServices.Claude.Implementations;

public class ClaudeLlmService : ILlmService
{
    private readonly HttpClient _httpClient;
    private readonly AnthropicConfig _config;
    private const string Endpoint = "https://api.anthropic.com/v1/messages";
    private const int MaxTokens = 4096;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy       = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull,
    };

    public ClaudeLlmService(HttpClient httpClient, IOptions<AnthropicConfig> config)
    {
        _httpClient = httpClient;
        _config     = config.Value;
    }

    // ── Tool 포함 non-streaming 호출 ──────────────────────────
    public async Task<LlmNonStreamResponse> SendWithToolsAsync(
        IReadOnlyList<ChatMessage> messages,
        IReadOnlyList<ToolDefinition> tools,
        CancellationToken ct = default)
    {
        var (systemPrompt, claudeMessages) = BuildClaudeMessages(messages);
        var claudeTools = tools.Select(ToClaudeTool).ToList();

        var body = new ClaudeRequest(
            _config.Model,
            MaxTokens,
            systemPrompt,
            claudeMessages,
            claudeTools,
            Stream: false);

        var response = await _httpClient.PostAsJsonAsync(Endpoint, body, JsonOpts, ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<ClaudeResponse>(JsonOpts, ct);
        if (json is null) return new LlmNonStreamResponse(string.Empty, []);

        if (json.StopReason == "tool_use")
        {
            var toolCalls = json.Content
                .Where(c => c.Type == "tool_use")
                .Select(c => new LlmToolCallResult(
                    c.Id ?? Guid.NewGuid().ToString(),
                    c.Name ?? string.Empty,
                    c.Input ?? JsonDocument.Parse("{}").RootElement))
                .ToList();
            return new LlmNonStreamResponse(null, toolCalls);
        }

        var text = string.Concat(json.Content
            .Where(c => c.Type == "text")
            .Select(c => c.Text ?? string.Empty));
        return new LlmNonStreamResponse(text, []);
    }

    // ── 순수 스트리밍 (tools 없음) ────────────────────────────
    public async IAsyncEnumerable<LlmChunk> StreamAsync(
        IReadOnlyList<ChatMessage> messages,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var (systemPrompt, claudeMessages) = BuildClaudeMessages(messages);

        var body = new ClaudeRequest(
            _config.Model,
            MaxTokens,
            systemPrompt,
            claudeMessages,
            null,
            Stream: true);

        var request = new HttpRequestMessage(HttpMethod.Post, Endpoint)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(body, JsonOpts),
                Encoding.UTF8,
                "application/json"),
        };

        var response = await _httpClient.SendAsync(
            request, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream && !ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ct);
            if (line is null || !line.StartsWith("data: ")) continue;

            var data = line[6..];
            if (data == "[DONE]") { yield return new LlmStreamDone(); yield break; }

            ClaudeStreamEvent? evt;
            try { evt = JsonSerializer.Deserialize<ClaudeStreamEvent>(data, JsonOpts); }
            catch { continue; }

            if (evt?.Type == "content_block_delta" &&
                evt.Delta?.Type == "text_delta" &&
                evt.Delta.Text is { Length: > 0 } delta)
            {
                yield return new TextDelta(delta);
            }
            else if (evt?.Type == "message_stop")
            {
                yield return new LlmStreamDone();
                yield break;
            }
        }
    }

    // ── ChatMessage 히스토리 → Claude 메시지 배열 변환 ──────────
    private static (string? System, List<ClaudeMessage> Messages) BuildClaudeMessages(
        IReadOnlyList<ChatMessage> messages)
    {
        string? systemPrompt = null;
        var result = new List<ClaudeMessage>();

        for (var i = 0; i < messages.Count; i++)
        {
            var msg = messages[i];

            if (msg.Role == "system")
            {
                systemPrompt = msg.Content;
                continue;
            }

            // Encoded assistant tool-calling turn: JSON array of EncodedToolCall
            if (msg.Role == "assistant" && TryParseToolCalls(msg.Content, out var toolCalls))
            {
                var toolUseBlocks = toolCalls.Select(tc => new ClaudeContentBlock
                {
                    Type  = "tool_use",
                    Id    = tc.Id,
                    Name  = tc.Name,
                    Input = tc.Input,
                }).ToList();
                result.Add(new ClaudeMessage("assistant", toolUseBlocks));

                // Collect consecutive tool results that follow
                var resultBlocks = new List<ClaudeContentBlock>();
                while (i + 1 < messages.Count && messages[i + 1].Role == "tool")
                {
                    i++;
                    if (TryParseToolResult(messages[i].Content, out var tr))
                    {
                        resultBlocks.Add(new ClaudeContentBlock
                        {
                            Type      = "tool_result",
                            ToolUseId = tr.ToolUseId,
                            Content   = tr.Content,
                        });
                    }
                }
                if (resultBlocks.Count > 0)
                    result.Add(new ClaudeMessage("user", resultBlocks));
                continue;
            }

            // Normal user/assistant message
            result.Add(new ClaudeMessage(msg.Role,
                [new ClaudeContentBlock { Type = "text", Text = msg.Content }]));
        }

        return (systemPrompt, result);
    }

    // ── ToolDefinition (OpenAI format) → Claude tool ─────────
    private static ClaudeTool ToClaudeTool(ToolDefinition t) => new(
        t.Function.Name,
        t.Function.Description,
        new ClaudeInputSchema(
            t.Function.Parameters.Type,
            t.Function.Parameters.Properties.ToDictionary(
                kvp => kvp.Key,
                kvp => (object)new
                {
                    type        = kvp.Value.Type,
                    description = kvp.Value.Description,
                    @enum       = kvp.Value.Enum,
                }),
            t.Function.Parameters.Required));

    // ── Encoding helpers ──────────────────────────────────────
    private static bool TryParseToolCalls(string content, out List<EncodedToolCall> calls)
    {
        calls = [];
        if (string.IsNullOrWhiteSpace(content) || !content.StartsWith('[')) return false;
        try
        {
            calls = JsonSerializer.Deserialize<List<EncodedToolCall>>(content) ?? [];
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
            var parsed = JsonSerializer.Deserialize<EncodedToolResult>(content);
            if (parsed is null) return false;
            result = parsed;
            return true;
        }
        catch { return false; }
    }
}

// ── Claude API request/response records ──────────────────────

internal record ClaudeRequest(
    [property: JsonPropertyName("model")]      string Model,
    [property: JsonPropertyName("max_tokens")] int MaxTokens,
    [property: JsonPropertyName("system")]     string? System,
    [property: JsonPropertyName("messages")]   List<ClaudeMessage> Messages,
    [property: JsonPropertyName("tools")]      List<ClaudeTool>? Tools,
    [property: JsonPropertyName("stream")]     bool Stream);

internal record ClaudeMessage(
    [property: JsonPropertyName("role")]    string Role,
    [property: JsonPropertyName("content")] List<ClaudeContentBlock> Content);

internal sealed class ClaudeContentBlock
{
    [JsonPropertyName("type")]        public string Type        { get; init; } = string.Empty;
    [JsonPropertyName("text")]        public string? Text       { get; init; }
    [JsonPropertyName("id")]          public string? Id         { get; init; }
    [JsonPropertyName("name")]        public string? Name       { get; init; }
    [JsonPropertyName("input")]       public JsonElement? Input { get; init; }
    [JsonPropertyName("tool_use_id")] public string? ToolUseId { get; init; }
    [JsonPropertyName("content")]     public string? Content    { get; init; }
}

internal record ClaudeTool(
    [property: JsonPropertyName("name")]         string Name,
    [property: JsonPropertyName("description")]  string Description,
    [property: JsonPropertyName("input_schema")] ClaudeInputSchema InputSchema);

internal record ClaudeInputSchema(
    [property: JsonPropertyName("type")]       string Type,
    [property: JsonPropertyName("properties")] Dictionary<string, object> Properties,
    [property: JsonPropertyName("required")]   List<string> Required);

internal record ClaudeResponse(
    [property: JsonPropertyName("content")]     List<ClaudeContentBlock> Content,
    [property: JsonPropertyName("stop_reason")] string? StopReason);

internal record ClaudeStreamEvent(
    [property: JsonPropertyName("type")]  string? Type,
    [property: JsonPropertyName("delta")] ClaudeStreamDelta? Delta);

internal record ClaudeStreamDelta(
    [property: JsonPropertyName("type")] string? Type,
    [property: JsonPropertyName("text")] string? Text);
