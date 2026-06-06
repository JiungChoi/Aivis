namespace AIVIS.Infrastructure.Configuration.Database;

public class DatabaseConfig
{
    public const string Section = "Database";
    public string ConnectionString { get; init; } = string.Empty;
}
