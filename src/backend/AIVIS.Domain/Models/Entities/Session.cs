using AIVIS.Domain.Enums;

namespace AIVIS.Domain.Models.Entities;

public class Session
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public SessionStatus Status { get; set; } = SessionStatus.Active;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<Message> Messages { get; set; } = [];
}
