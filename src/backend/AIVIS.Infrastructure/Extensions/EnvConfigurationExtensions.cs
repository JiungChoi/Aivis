using Microsoft.Extensions.Configuration;

namespace AIVIS.Infrastructure.Extensions;

public static class EnvConfigurationExtensions
{
    public static IConfigurationBuilder AddEnvFile(this IConfigurationBuilder builder, string path = ".env")
    {
        var envPath = Path.IsPathRooted(path) ? path : Path.Combine(Directory.GetCurrentDirectory(), path);

        if (!File.Exists(envPath))
            return builder;

        var pairs = File.ReadAllLines(envPath)
            .Where(line => !string.IsNullOrWhiteSpace(line) && !line.TrimStart().StartsWith('#'))
            .Select(line => line.Split('=', 2))
            .Where(parts => parts.Length == 2)
            .ToDictionary(
                parts => parts[0].Trim().Replace("__", ":"),
                parts => parts[1].Trim()
            );

        return builder.AddInMemoryCollection(pairs!);
    }
}
