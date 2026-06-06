namespace AIVIS.Infrastructure.Configuration;

public class AnthropicConfig
{
    public const string Section = "Anthropic";
    public string ApiKey { get; init; } = string.Empty;
    public string Model { get; init; } = "claude-opus-4-7";
}
