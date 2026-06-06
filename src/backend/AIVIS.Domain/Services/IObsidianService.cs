using AIVIS.Domain.Models.Entities;

namespace AIVIS.Domain.Services;

public record ObsidianVaultNote(
    string FilePath,
    string Title,
    string[] Tags,
    string ContentPreview);

public interface IObsidianService
{
    bool IsEnabled { get; }
    string VaultPath { get; }

    Task SaveNoteAsync(Note note, CancellationToken ct = default);
    Task AppendToDailyNoteAsync(string content, CancellationToken ct = default);
    Task SyncAllNotesAsync(IReadOnlyList<Note> notes, CancellationToken ct = default);
    Task<IReadOnlyList<string>> ListNotesAsync(string folder = "", CancellationToken ct = default);
    Task<IReadOnlyList<ObsidianVaultNote>> ParseVaultAsync(CancellationToken ct = default);

    void UpdateSettings(string vaultPath, bool enabled);
}
