using AIVIS.Domain.Models.Entities;

namespace AIVIS.Domain.Services;

/// <summary>
/// Manages the user's local <c>~/AIVIS</c> workspace: folder structure and
/// conversation log files. Phase 1 only persists conversation logs as Markdown.
/// </summary>
public interface IWorkspaceService
{
    /// <summary>Create the <c>~/AIVIS</c> folder structure on app startup (idempotent).</summary>
    Task InitializeWorkspaceFoldersAsync(CancellationToken ct = default);

    /// <summary>Persist a finished session as a Markdown log under <c>conversations/</c>.</summary>
    Task SaveConversationLogAsync(Session session, CancellationToken ct = default);
}
