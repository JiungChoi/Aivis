namespace AIVIS.Infrastructure.Configuration;

public class ObsidianConfig
{
    public const string Section = "Obsidian";
    public string VaultPath { get; set; } = string.Empty;
    public bool Enabled { get; set; } = false;
}
