namespace AIVIS.Infrastructure.Configuration.App;

public class AppConfig
{
    public const string Section = "App";
    public int Port { get; init; } = 5050;
    public string Environment { get; init; } = "Development";
}
