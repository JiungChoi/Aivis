namespace AIVIS.Domain.Models.ConversationQuality;

public record UserPreferences(
    string Name,
    string Language,
    string Tone,
    IReadOnlyList<string> CustomInstructions,
    IReadOnlyList<MemoryEntry> Memories,
    IReadOnlyList<ScheduleEntry> TodaySchedules)
{
    public static UserPreferences Default => new("사용자", "Korean", "casual", [], [], []);
}

public record MemoryEntry(string Key, string Value);
public record ScheduleEntry(string StartTime, string Title, string Category);
