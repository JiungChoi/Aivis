using System.Text;
using AIVIS.API.Handlers;
using AIVIS.Application.Constants;
using AIVIS.Application.Mappers;
using AIVIS.Application.Services;
using AIVIS.Domain.Models.Agent;
using AIVIS.Domain.Models.Common;
using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Models.Requests;
using AIVIS.Domain.Models.Responses;
using AIVIS.Domain.Repositories;
using AIVIS.Domain.Services;

namespace AIVIS.API.Routers;

public static class ConversationRouter
{
    public static IEndpointRouteBuilder MapConversationRoutes(this IEndpointRouteBuilder app)
    {
        // ── Sessions / messages (CRUD) ──────────────────────────
        app.MapGet("/api/conversations", async (ISessionRepository sessionRepository, CancellationToken ct) =>
        {
            var sessions = await sessionRepository.ListAsync(ct);
            return ApiResponse<IReadOnlyList<SessionResp>>.Ok(sessions.Select(s => s.ToResp()).ToList());
        });

        app.MapPost("/api/conversations", async (HttpRequest req, ISessionRepository sessionRepository, CancellationToken ct) =>
        {
            var userId = req.Headers.TryGetValue("X-User-Id", out var id) && !string.IsNullOrWhiteSpace(id)
                ? id.ToString()
                : ApplicationConstants.DefaultUserId;

            var session = await sessionRepository.CreateAsync(new Session
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Status = SessionStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }, ct);

            return ApiResponse<SessionResp>.Ok(session.ToResp());
        });

        app.MapGet("/api/conversations/{sessionId:guid}", async (Guid sessionId, ISessionRepository sessionRepository, CancellationToken ct) =>
        {
            var session = await sessionRepository.GetByIdWithMessagesAsync(sessionId, ct);
            return session is null
                ? ApiResponse<SessionResp>.Fail("NOT_FOUND", "Session not found")
                : ApiResponse<SessionResp>.Ok(session.ToResp());
        });

        app.MapPost("/api/conversations/{sessionId:guid}/messages", async (
            Guid sessionId,
            SendMessageRequest request,
            ISessionRepository sessionRepository,
            IMessageRepository messageRepository,
            ILlmService llmService,
            ConversationContextBuilder contextBuilder,
            CancellationToken ct) =>
        {
            var session = await sessionRepository.GetByIdWithMessagesAsync(sessionId, ct);
            if (session is null)
                return ApiResponse<MessageResp>.Fail("NOT_FOUND", "Session not found");

            var userMessage = await messageRepository.CreateAsync(new Message
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                Role = MessageRole.User,
                Content = request.Content,
                CreatedAt = DateTime.UtcNow
            }, ct);

            var rawHistory = session.Messages.Append(userMessage).ToList();
            var preparedHistory = await contextBuilder.PrepareHistoryAsync(session.UserId, rawHistory, ct);

            var sb = new StringBuilder();
            await foreach (var chunk in llmService.StreamAsync(preparedHistory, ct))
            {
                if (chunk is TextDelta d) sb.Append(d.Text);
            }

            var assistantMessage = await messageRepository.CreateAsync(new Message
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                Role = MessageRole.Assistant,
                Content = sb.ToString(),
                CreatedAt = DateTime.UtcNow
            }, ct);

            session.UpdatedAt = DateTime.UtcNow;
            await sessionRepository.UpdateAsync(session, ct);

            return ApiResponse<MessageResp>.Ok(assistantMessage.ToResp());
        });

        app.MapDelete("/api/conversations/{sessionId:guid}", async (Guid sessionId, ISessionRepository sessionRepository, CancellationToken ct) =>
        {
            await sessionRepository.DeleteAsync(sessionId, ct);
            return ApiResponse.OkResult();
        });

        // ── Streaming (SSE) ─────────────────────────────────────
        app.MapPost("/api/conversations/{sessionId:guid}/messages/stream", ConversationStreamHandler.Handle);

        // ── Export to Obsidian Daily Note ───────────────────────
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
