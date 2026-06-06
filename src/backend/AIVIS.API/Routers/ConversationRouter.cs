using System.Text;
using AIVIS.API.Handlers;
using AIVIS.Domain.Models.Common;
using AIVIS.Domain.Enums;
using AIVIS.Domain.Repositories;
using AIVIS.Domain.Services;

namespace AIVIS.API.Routers;

public static class ConversationRouter
{
    public static IEndpointRouteBuilder MapConversationRoutes(this IEndpointRouteBuilder app)
    {
        app.MapControllers();
        app.MapPost("/api/conversations/{sessionId:guid}/messages/stream", ConversationStreamHandler.Handle);

        // POST /api/conversations/{sessionId}/export — Obsidian Daily Note에 대화 저장
        app.MapPost("/api/conversations/{sessionId:guid}/export", async (
            Guid sessionId,
            IMessageRepository messageRepository,
            IObsidianService obsidianService,
            CancellationToken ct) =>
        {
            if (!obsidianService.IsEnabled)
                return Results.BadRequest(ApiResponse.FailResult("OBSIDIAN_DISABLED", "Obsidian 연동이 비활성화되어 있습니다."));

            var messages = await messageRepository.GetBySessionIdAsync(sessionId, ct);
            var visible = messages
                .Where(m => m.Role == MessageRole.User || m.Role == MessageRole.Assistant)
                .ToList();

            if (visible.Count == 0)
                return Results.BadRequest(ApiResponse.FailResult("NO_MESSAGES", "저장할 메시지가 없습니다."));

            var time = DateTime.Now.ToString("HH:mm");
            var sb = new StringBuilder();
            sb.AppendLine($"## 대화 기록 ({time})");
            sb.AppendLine();
            foreach (var msg in visible)
            {
                var label = msg.Role == MessageRole.User ? "**사용자**" : "**AIVIS**";
                sb.AppendLine($"{label}: {msg.Content}");
                sb.AppendLine();
            }

            await obsidianService.AppendToDailyNoteAsync(sb.ToString(), ct);
            return Results.Ok(ApiResponse<ExportResultDto>.Ok(new ExportResultDto(visible.Count)));
        });

        return app;
    }
}

public record ExportResultDto(int MessageCount);
