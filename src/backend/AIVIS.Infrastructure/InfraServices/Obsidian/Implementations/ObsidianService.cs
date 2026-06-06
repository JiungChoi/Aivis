using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using AIVIS.Domain.Services;
using AIVIS.Domain.Models.Entities;
using AIVIS.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AIVIS.Infrastructure.InfraServices.Obsidian.Implementations;

public partial class ObsidianService : IObsidianService
{
    private readonly ObsidianConfig _config;
    private readonly ILogger<ObsidianService> _logger;

    private const string ConfigFileName = ".aivis-config.json";
    private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = true };

    public ObsidianService(IOptions<ObsidianConfig> options, ILogger<ObsidianService> logger)
    {
        _config = options.Value;
        _logger = logger;
        LoadPersistedSettings();
    }

    public bool IsEnabled => _config.Enabled && !string.IsNullOrWhiteSpace(_config.VaultPath);
    public string VaultPath => _config.VaultPath;

    public void UpdateSettings(string vaultPath, bool enabled)
    {
        _config.VaultPath = vaultPath;
        _config.Enabled   = enabled;
        PersistSettings();
    }

    // ── File operations ───────────────────────────────────────

    public async Task SaveNoteAsync(Note note, CancellationToken ct = default)
    {
        if (!IsEnabled) return;
        try
        {
            var filename  = SanitizeFilename(note.Title) + ".md";
            var directory = Path.Combine(_config.VaultPath, "AIVIS");
            Directory.CreateDirectory(directory);
            await File.WriteAllTextAsync(Path.Combine(directory, filename), BuildNoteMd(note), Encoding.UTF8, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SaveNoteAsync failed for note '{Title}'", note.Title);
        }
    }

    public async Task AppendToDailyNoteAsync(string content, CancellationToken ct = default)
    {
        if (!IsEnabled) return;
        try
        {
            var date      = DateTime.Today.ToString("yyyy-MM-dd");
            var directory = Path.Combine(_config.VaultPath, "Daily");
            var fullPath  = Path.Combine(directory, $"{date}.md");

            Directory.CreateDirectory(directory);

            if (!File.Exists(fullPath))
            {
                await File.WriteAllTextAsync(fullPath, $"# {date}\n\n## AIVIS\n\n{content}\n", Encoding.UTF8, ct);
            }
            else
            {
                var existing = await File.ReadAllTextAsync(fullPath, ct);
                var section  = existing.Contains("## AIVIS") ? string.Empty : "\n## AIVIS\n\n";
                await File.AppendAllTextAsync(fullPath, section + content + "\n", Encoding.UTF8, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AppendToDailyNoteAsync failed");
        }
    }

    public async Task SyncAllNotesAsync(IReadOnlyList<Note> notes, CancellationToken ct = default)
    {
        if (!IsEnabled) return;
        foreach (var note in notes)
        {
            if (ct.IsCancellationRequested) break;
            await SaveNoteAsync(note, ct);
        }
    }

    public Task<IReadOnlyList<string>> ListNotesAsync(string folder = "", CancellationToken ct = default)
    {
        if (!IsEnabled) return Task.FromResult<IReadOnlyList<string>>([]);
        var dir = string.IsNullOrEmpty(folder)
            ? _config.VaultPath
            : Path.Combine(_config.VaultPath, folder);

        IReadOnlyList<string> files = Directory.Exists(dir)
            ? Directory.GetFiles(dir, "*.md", SearchOption.AllDirectories)
            : [];
        return Task.FromResult(files);
    }

    public async Task<IReadOnlyList<ObsidianVaultNote>> ParseVaultAsync(CancellationToken ct = default)
    {
        if (!IsEnabled || !Directory.Exists(_config.VaultPath))
            return [];

        var mdFiles = Directory.GetFiles(_config.VaultPath, "*.md", SearchOption.AllDirectories);
        var result  = new List<ObsidianVaultNote>(mdFiles.Length);

        foreach (var filePath in mdFiles)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                var note = await ParseMdFileAsync(filePath, ct);
                if (note is not null) result.Add(note);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse MD file: {Path}", filePath);
            }
        }
        return result;
    }

    private static async Task<ObsidianVaultNote?> ParseMdFileAsync(string filePath, CancellationToken ct)
    {
        var text = await File.ReadAllTextAsync(filePath, ct);
        var title = Path.GetFileNameWithoutExtension(filePath);
        var tags  = Array.Empty<string>();

        // Parse YAML frontmatter
        if (text.StartsWith("---"))
        {
            var end = text.IndexOf("---", 3, StringComparison.Ordinal);
            if (end > 0)
            {
                var frontmatter = text[3..end];
                foreach (var line in frontmatter.Split('\n'))
                {
                    var trimmed = line.Trim();
                    if (trimmed.StartsWith("title:", StringComparison.OrdinalIgnoreCase))
                        title = trimmed[6..].Trim().Trim('"');
                    else if (trimmed.StartsWith("tags:", StringComparison.OrdinalIgnoreCase))
                    {
                        var tagVal = trimmed[5..].Trim().Trim('[', ']');
                        tags = tagVal.Split(',').Select(t => t.Trim()).Where(t => t.Length > 0).ToArray();
                    }
                    else if (trimmed.StartsWith("- ", StringComparison.Ordinal) && tags.Length == 0)
                    {
                        // Multi-line YAML tag list
                        tags = [trimmed[2..].Trim()];
                    }
                }
                text = text[(end + 3)..].TrimStart();
            }
        }

        // Use first 200 chars of content as preview
        var preview = text.Length > 200 ? text[..200] : text;
        preview = preview.Trim().Replace('\n', ' ');

        return new ObsidianVaultNote(filePath, title, tags, preview);
    }

    // ── Settings persistence ──────────────────────────────────

    private void LoadPersistedSettings()
    {
        var path = ResolveConfigFilePath();
        if (path is null || !File.Exists(path)) return;
        try
        {
            var json      = File.ReadAllText(path);
            var persisted = JsonSerializer.Deserialize<PersistedSettings>(json);
            if (persisted is null) return;
            _config.VaultPath = persisted.VaultPath;
            _config.Enabled   = persisted.Enabled;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "LoadPersistedSettings failed");
        }
    }

    private void PersistSettings()
    {
        var path = ResolveConfigFilePath();
        if (path is null) return;
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            File.WriteAllText(path, JsonSerializer.Serialize(
                new PersistedSettings(_config.VaultPath, _config.Enabled), JsonOpts));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PersistSettings failed");
        }
    }

    private string? ResolveConfigFilePath()
    {
        if (!string.IsNullOrWhiteSpace(_config.VaultPath))
            return Path.Combine(_config.VaultPath, ConfigFileName);

        // Fallback: check the well-known Docker mount point
        const string fallback = "/vault";
        return Directory.Exists(fallback)
            ? Path.Combine(fallback, ConfigFileName)
            : null;
    }

    // ── Markdown helpers ──────────────────────────────────────

    private static string BuildNoteMd(Note note)
    {
        var sb = new StringBuilder();
        sb.AppendLine("---");
        sb.AppendLine($"title: \"{EscapeYaml(note.Title)}\"");
        if (note.Tags.Length > 0)
        {
            sb.AppendLine("tags:");
            foreach (var tag in note.Tags) sb.AppendLine($"  - {tag}");
        }
        sb.AppendLine($"source: {note.Source.ToString().ToLower()}");
        sb.AppendLine($"created: {note.CreatedAt:yyyy-MM-dd HH:mm}");
        sb.AppendLine($"updated: {note.UpdatedAt:yyyy-MM-dd HH:mm}");
        sb.AppendLine("---");
        sb.AppendLine();
        sb.AppendLine(note.Content);
        return sb.ToString();
    }

    private static string SanitizeFilename(string title)
    {
        var safe = InvalidCharsRegex().Replace(title, "_");
        return safe.Length > 100 ? safe[..100] : safe;
    }

    private static string EscapeYaml(string s) => s.Replace("\"", "\\\"");

    [GeneratedRegex(@"[\\/:*?""<>|]")]
    private static partial Regex InvalidCharsRegex();

    private record PersistedSettings(string VaultPath, bool Enabled);
}
