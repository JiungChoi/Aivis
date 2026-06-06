namespace AIVIS.Infrastructure.Configuration;

public class ChromaDbConfig
{
    public const string Section = "ChromaDb";
    public string BaseUrl { get; init; } = "http://localhost:8000";
    public string Collection { get; init; } = "aivis";
}
