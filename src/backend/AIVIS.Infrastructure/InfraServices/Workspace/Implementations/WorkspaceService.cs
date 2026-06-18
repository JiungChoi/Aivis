using System.Text;
using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Services;
using Microsoft.Extensions.Logging;

namespace AIVIS.Infrastructure.InfraServices.Workspace.Implementations;

/// <summary>
/// File-system backed workspace. Phase 1 uses a fixed <c>~/AIVIS</c> root; a
/// configurable path arrives in Phase 2 (Settings table).
/// </summary>
public class WorkspaceService : IWorkspaceService
{
    private static readonly string[] SubFolders = ["conversations", "second_brain", "memory", "workspace"];

    private readonly string _root;
    private readonly ILogger<WorkspaceService> _logger;

    public WorkspaceService(ILogger<WorkspaceService> logger)
    {
        _logger = logger;
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        _root = Path.Combine(home, "AIVIS");
    }

    public Task InitializeWorkspaceFoldersAsync(CancellationToken ct = default)
    {
        foreach (var sub in SubFolders)
            Directory.CreateDirectory(Path.Combine(_root, sub));

        _logger.LogInformation("Workspace initialized at {Root}", _root);
        return Task.CompletedTask;
    }

    public async Task SaveConversationLogAsync(Session session, CancellationToken ct = default)
    {
        if (session.Messages.Count == 0)
            return; // empty session — nothing worth logging

        var dir = Path.Combine(_root, "conversations");
        Directory.CreateDirectory(dir);

        var shortId = session.Id.ToString()[..8];
        var path = Path.Combine(dir, $"{session.CreatedAt:yyyy-MM-dd}-{shortId}.md");

        var sb = new StringBuilder();
        sb.AppendLine("# AIVIS 대화 로그").AppendLine();
        sb.AppendLine($"**날짜**: {session.CreatedAt:yyyy-MM-dd}").AppendLine();
        sb.AppendLine($"**세션 ID**: {shortId}").AppendLine();
        sb.AppendLine("---").AppendLine();

        foreach (var message in session.Messages.OrderBy(m => m.CreatedAt))
        {
            var who = message.Role == MessageRole.User ? "사용자" : "AI";
            sb.AppendLine($"**{who}**: {message.Content}").AppendLine();
            sb.AppendLine("---").AppendLine();
        }

        await File.WriteAllTextAsync(path, sb.ToString(), ct);
        _logger.LogInformation("Saved conversation log {Path}", path);
    }
}
