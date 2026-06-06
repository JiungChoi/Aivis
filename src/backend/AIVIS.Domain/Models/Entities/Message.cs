using AIVIS.Domain.Enums;

namespace AIVIS.Domain.Models.Entities;

public class Message
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public MessageRole Role { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public Session Session { get; set; } = null!;
}
