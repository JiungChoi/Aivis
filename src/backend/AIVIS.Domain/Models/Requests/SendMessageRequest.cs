namespace AIVIS.Domain.Models.Requests;

public record SendMessageRequest(
    string Content,
    bool UseVoice = false
);

public record CreateSessionRequest();
