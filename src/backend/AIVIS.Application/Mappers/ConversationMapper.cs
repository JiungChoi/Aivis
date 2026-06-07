using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Models.Responses;

namespace AIVIS.Application.Mappers;

public static class ConversationMapper
{
    public static MessageResp ToResp(this Message message) => new(
        message.Id.ToString(),
        message.Content,
        message.Role,
        message.CreatedAt
    );

    public static SessionResp ToResp(this Session session) => new(
        session.Id.ToString(),
        session.UserId,
        session.Title,
        session.Status,
        session.Messages.OrderBy(m => m.CreatedAt).Select(m => m.ToResp()).ToList(),
        session.CreatedAt
    );
}
