using AIVIS.Domain.Enums;

namespace AIVIS.Domain.Models.Entities;

public class Note
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string[] Tags { get; set; } = [];
    public NoteSource Source { get; set; } = NoteSource.Manual;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
