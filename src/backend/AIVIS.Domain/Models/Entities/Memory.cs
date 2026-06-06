using AIVIS.Domain.Enums;

namespace AIVIS.Domain.Models.Entities;

public class Memory
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public MemorySource Source { get; set; } = MemorySource.Conversation;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
