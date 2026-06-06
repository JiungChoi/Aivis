using AIVIS.Domain.Enums;

namespace AIVIS.Domain.Models.Entities;

public class Schedule
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ScheduleCategory Category { get; set; } = ScheduleCategory.Work;
    public string Tag { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
