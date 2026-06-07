using AIVIS.Domain.Enums;

namespace AIVIS.Domain.Models.Responses;

public record MessageResp(
    string Id,
    string Content,
    MessageRole Role,
    DateTime CreatedAt
);

public record SessionResp(
    string Id,
    string UserId,
    string Title,
    SessionStatus Status,
    IReadOnlyList<MessageResp> Messages,
    DateTime CreatedAt
);
