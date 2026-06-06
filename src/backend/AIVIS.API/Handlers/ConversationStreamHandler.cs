using System.Text.Json;
using AIVIS.Application.Controllers;
using AIVIS.Application.Services;
using AIVIS.Domain.Models.Agent;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Requests;
using AIVIS.Domain.Repositories;

namespace AIVIS.API.Handlers;

public static class ConversationStreamHandler
{
    public static async Task Handle(
        Guid sessionId,
        SendMessageRequest body,
        HttpContext context,
        ISessionRepository sessionRepository,
        IMessageRepository messageRepository,
        AgentOrchestrator agentOrchestrator,
        ConversationQualityController qualityController,
        CancellationToken ct)
    {
        var session = await sessionRepository.GetByIdWithMessagesAsync(sessionId, ct);
        if (session is null)
        {
            context.Response.StatusCode = 404;
            return;
        }

        var userMessage = await messageRepository.CreateAsync(new Message
        {
            Id        = Guid.NewGuid(),
            SessionId = sessionId,
            Role      = MessageRole.User,
            Content   = body.Content,
            CreatedAt = DateTime.UtcNow,
        }, ct);

        var dbHistory = session.Messages.Append(userMessage).ToList();
        var chatHistory = await qualityController.PrepareHistoryAsync(session.UserId, dbHistory, ct);

        context.Response.ContentType = "text/event-stream";
        context.Response.Headers.CacheControl = "no-cache";
        context.Response.Headers["X-Accel-Buffering"] = "no";

        var fullContent = new System.Text.StringBuilder();

        await foreach (var evt in agentOrchestrator.RunAsync(chatHistory, session.UserId, ct))
        {
            switch (evt)
            {
                case AgentTextDelta textDelta:
                    fullContent.Append(textDelta.Delta);
                    await WriteEventAsync(context, new { delta = textDelta.Delta }, ct);
                    break;

                case AgentToolCalling toolCalling:
                    await WriteEventAsync(context, new { tool_call = toolCalling.ToolName, display = toolCalling.DisplayText }, ct);
                    break;

                case AgentDone done:
                    if (string.IsNullOrEmpty(fullContent.ToString()))
                        fullContent.Append(done.FullContent);
                    break;
            }
        }

        var assistantMessage = await messageRepository.CreateAsync(new Message
        {
            Id        = Guid.NewGuid(),
            SessionId = sessionId,
            Role      = MessageRole.Assistant,
            Content   = fullContent.ToString(),
            CreatedAt = DateTime.UtcNow,
        }, ct);

        session.UpdatedAt = DateTime.UtcNow;
        await sessionRepository.UpdateAsync(session, ct);

        await WriteEventAsync(context, new
        {
            done      = true,
            messageId = assistantMessage.Id.ToString(),
            createdAt = assistantMessage.CreatedAt,
        }, ct);
    }

    private static async Task WriteEventAsync(HttpContext context, object data, CancellationToken ct)
    {
        var line = $"data: {JsonSerializer.Serialize(data)}\n\n";
        await context.Response.WriteAsync(line, ct);
        await context.Response.Body.FlushAsync(ct);
    }
}
