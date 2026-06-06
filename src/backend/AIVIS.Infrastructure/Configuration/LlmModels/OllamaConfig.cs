namespace AIVIS.Infrastructure.Configuration.LlmModels;

public class OllamaConfig
{
    public const string Section = "Ollama";
    public string BaseUrl { get; init; } = "http://localhost:11434";
    public string Model { get; init; } = "llama3.2";
}
