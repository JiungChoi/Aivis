using AIVIS.API.Constants;
using AIVIS.Domain.Models.Common;
using AIVIS.Domain.Repositories;
using AIVIS.Domain.Services;

namespace AIVIS.API.Routers;

public static class KnowledgeRouter
{
    public static IEndpointRouteBuilder MapKnowledgeRoutes(this IEndpointRouteBuilder app)
    {
        // GET /api/knowledge/graph — returns dynamic nodes merged from memories and notes
        app.MapGet("/api/knowledge/graph", async (
            HttpContext ctx,
            IMemoryRepository memoryRepository,
            INoteRepository noteRepository,
            IObsidianService obsidianService,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();

            var memories = await memoryRepository.ListByUserAsync(userId, ct);
            var notes    = await noteRepository.ListByUserAsync(userId, 100, ct);

            var dynamicNodes = new List<DynamicKnowledgeNode>();

            // Map memories → branches by key prefix
            foreach (var mem in memories)
            {
                var branch = ClassifyMemoryKey(mem.Key);
                dynamicNodes.Add(new DynamicKnowledgeNode(
                    Id:      $"mem_{mem.Key}",
                    Branch:  branch,
                    Label:   mem.Key.Replace("_", " "),
                    Sublabel: TruncateValue(mem.Value),
                    Source:  "memory",
                    Weight:  0.6
                ));
            }

            // Map notes → branches by tags
            foreach (var note in notes)
            {
                var branch = ClassifyNoteTags(note.Tags ?? []);
                dynamicNodes.Add(new DynamicKnowledgeNode(
                    Id:      $"note_{note.Id}",
                    Branch:  branch,
                    Label:   note.Title,
                    Sublabel: null,
                    Source:  "note",
                    Weight:  0.7
                ));
            }

            // Obsidian vault files (parsed with frontmatter)
            if (obsidianService.IsEnabled)
            {
                var vaultNotes = await obsidianService.ParseVaultAsync(ct);
                foreach (var vn in vaultNotes.Take(30))
                {
                    var branch = vn.Tags.Length > 0
                        ? ClassifyNoteTags(vn.Tags)
                        : ClassifyObsidianTitle(vn.Title);
                    dynamicNodes.Add(new DynamicKnowledgeNode(
                        Id:       $"obsidian_{vn.Title.Replace(" ", "_")}",
                        Branch:   branch,
                        Label:    vn.Title,
                        Sublabel: vn.ContentPreview.Length > 0 ? vn.ContentPreview[..Math.Min(40, vn.ContentPreview.Length)] : "Obsidian",
                        Source:   "obsidian",
                        Weight:   0.65
                    ));
                }
            }

            return Results.Ok(ApiResponse<IReadOnlyList<DynamicKnowledgeNode>>.Ok(dynamicNodes));
        });

        return app;
    }

    // ── Branch classifier helpers ──────────────────────────────

    private static string ClassifyMemoryKey(string key)
    {
        var lower = key.ToLowerInvariant();
        if (lower.Contains("기술") || lower.Contains("tech") || lower.Contains("개발") || lower.Contains("code"))
            return "tech";
        if (lower.Contains("프로젝트") || lower.Contains("project"))
            return "project";
        if (lower.Contains("역할") || lower.Contains("직책") || lower.Contains("role") || lower.Contains("job"))
            return "role";
        if (lower.Contains("학습") || lower.Contains("공부") || lower.Contains("study") || lower.Contains("learn"))
            return "learning";
        if (lower.Contains("영어") || lower.Contains("일본") || lower.Contains("글로벌") || lower.Contains("global") || lower.Contains("english"))
            return "global";
        return "memory";
    }

    private static string ClassifyNoteTags(IReadOnlyList<string> tags)
    {
        foreach (var tag in tags)
        {
            var lower = tag.ToLowerInvariant();
            if (lower.Contains("기술") || lower.Contains("tech") || lower.Contains("개발"))
                return "tech";
            if (lower.Contains("프로젝트") || lower.Contains("project"))
                return "project";
            if (lower.Contains("역할") || lower.Contains("role"))
                return "role";
            if (lower.Contains("학습") || lower.Contains("study"))
                return "learning";
            if (lower.Contains("글로벌") || lower.Contains("영어") || lower.Contains("english"))
                return "global";
            if (lower.Contains("아이디어") || lower.Contains("기억") || lower.Contains("memory"))
                return "memory";
        }
        return "memory";
    }

    private static string ClassifyObsidianTitle(string title)
    {
        var lower = title.ToLowerInvariant();
        if (lower.Contains("tech") || lower.Contains("개발") || lower.Contains("code") || lower.Contains("aws"))
            return "tech";
        if (lower.Contains("project") || lower.Contains("프로젝트") || lower.Contains("aivis"))
            return "project";
        if (lower.Contains("study") || lower.Contains("학습") || lower.Contains("논문") || lower.Contains("paper"))
            return "learning";
        if (lower.Contains("english") || lower.Contains("영어") || lower.Contains("global"))
            return "global";
        return "memory";
    }

    private static string TruncateValue(string value) =>
        value.Length <= 30 ? value : value[..30] + "…";
}

public record DynamicKnowledgeNode(
    string Id,
    string Branch,
    string Label,
    string? Sublabel,
    string Source,
    double Weight);
