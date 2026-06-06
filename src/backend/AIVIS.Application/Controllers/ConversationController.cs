using AIVIS.Application.Constants;
using AIVIS.Application.Mappers;
using AIVIS.Domain.Models.Common;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Requests;
using AIVIS.Domain.Models.Responses;
using AIVIS.Domain.Repositories;
using AIVIS.Domain.Services;
using Microsoft.AspNetCore.Mvc;

namespace AIVIS.Application.Controllers;

[ApiController]
[Route("api/conversations")]
public class ConversationController(
    ISessionRepository sessionRepository,
    IMessageRepository messageRepository,
    ILlmService llmService,
    ConversationQualityController qualityController) : ControllerBase
{
    [HttpGet]
    public async Task<ApiResponse<IReadOnlyList<SessionResp>>> ListSessions(CancellationToken ct)
    {
        var sessions = await sessionRepository.ListAsync(ct);
        return ApiResponse<IReadOnlyList<SessionResp>>.Ok(
            sessions.Select(s => s.ToResp()).ToList());
    }

    [HttpPost]
    public async Task<ApiResponse<SessionResp>> CreateSession(CancellationToken ct)
    {
        var userId = Request.Headers.TryGetValue("X-User-Id", out var id) && !string.IsNullOrWhiteSpace(id)
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
    }

    [HttpGet("{sessionId:guid}")]
    public async Task<ApiResponse<SessionResp>> GetSession(Guid sessionId, CancellationToken ct)
    {
        var session = await sessionRepository.GetByIdWithMessagesAsync(sessionId, ct);
        if (session is null)
            return ApiResponse<SessionResp>.Fail("NOT_FOUND", "Session not found");

        return ApiResponse<SessionResp>.Ok(session.ToResp());
    }

    [HttpPost("{sessionId:guid}/messages")]
    public async Task<ApiResponse<MessageResp>> SendMessage(
        Guid sessionId,
        [FromBody] SendMessageRequest request,
        CancellationToken ct)
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
        var preparedHistory = await qualityController.PrepareHistoryAsync(session.UserId, rawHistory, ct);

        var sb = new System.Text.StringBuilder();
        await foreach (var chunk in llmService.StreamAsync(preparedHistory, ct))
        {
            if (chunk is AIVIS.Domain.Models.Agent.TextDelta d) sb.Append(d.Text);
        }
        var aiResponseText = sb.ToString();

        var assistantMessage = await messageRepository.CreateAsync(new Message
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            Role = MessageRole.Assistant,
            Content = aiResponseText,
            CreatedAt = DateTime.UtcNow
        }, ct);

        session.UpdatedAt = DateTime.UtcNow;
        await sessionRepository.UpdateAsync(session, ct);

        return ApiResponse<MessageResp>.Ok(assistantMessage.ToResp());
    }

    [HttpDelete("{sessionId:guid}")]
    public async Task<ApiResponse> DeleteSession(Guid sessionId, CancellationToken ct)
    {
        await sessionRepository.DeleteAsync(sessionId, ct);
        return ApiResponse.OkResult();
    }
}
