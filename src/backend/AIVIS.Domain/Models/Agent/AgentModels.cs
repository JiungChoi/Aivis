using System.Text.Json;
using System.Text.Json.Serialization;

namespace AIVIS.Domain.Models.Agent;

// ── LLM API 메시지 DTO (DB 엔티티와 분리) ─────────────────────
public record ChatMessage(
    [property: JsonPropertyName("role")]    string Role,
    [property: JsonPropertyName("content")] string Content);

// ── Tool 정의 ─────────────────────────────────────────────────
public record ToolDefinition(
    [property: JsonPropertyName("type")]     string Type,
    [property: JsonPropertyName("function")] ToolFunction Function);

public record ToolFunction(
    [property: JsonPropertyName("name")]        string Name,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("parameters")]  ToolParameters Parameters);

public record ToolParameters(
    [property: JsonPropertyName("type")]       string Type,
    [property: JsonPropertyName("properties")] Dictionary<string, ToolProperty> Properties,
    [property: JsonPropertyName("required")]   List<string> Required);

public record ToolProperty(
    [property: JsonPropertyName("type")]        string Type,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("enum")]        string[]? Enum = null);

// ── LLM 스트림 청크 (discriminated union) ─────────────────────
public abstract record LlmChunk;
public record TextDelta(string Text) : LlmChunk;
public record ToolCallChunk(string Name, Dictionary<string, JsonElement> Arguments) : LlmChunk;
public record LlmStreamDone() : LlmChunk;

// ── Agent 이벤트 (SSE 로 프론트에 전달) ──────────────────────
public abstract record AgentEvent;
public record AgentTextDelta(string Delta) : AgentEvent;
public record AgentToolCalling(string ToolName, string DisplayText) : AgentEvent;
public record AgentDone(string FullContent) : AgentEvent;
