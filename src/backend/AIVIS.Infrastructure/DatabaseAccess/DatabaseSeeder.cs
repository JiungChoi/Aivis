using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Enums;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AIVIS.Infrastructure.DatabaseAccess;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AivisDbContext>();

        await db.Database.MigrateAsync();

        if (!await db.Users.AnyAsync(u => u.Id == "local"))
        {
            db.Users.Add(new User
            {
                Id = "local",
                Name = "최지웅",
                Gender = "남성",
                Phone = "010-4179-6091",
                Email = "wldnd6091@gmail.com",
                Language = "Korean",
                Tone = "casual",
                CustomInstructions = [],
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        await SeedTodaySchedulesAsync(db);
    }

    private static async Task SeedTodaySchedulesAsync(AivisDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var hasToday = await db.Schedules.AnyAsync(s => s.UserId == "local" && s.Date == today);
        if (hasToday) return;

        var now = DateTime.UtcNow;
        var seedItems = new (string Time, string Title, string? Description, ScheduleCategory Category, string Tag)[]
        {
            ("09:00", "팀 스탠드업 미팅",        "어제 작업 공유 및 오늘 계획 논의",  ScheduleCategory.Meeting,    "미팅"),
            ("10:00", "백엔드 API 설계 검토",     null,                              ScheduleCategory.Work,       "작업"),
            ("11:30", "UI 컴포넌트 코드리뷰",     null,                              ScheduleCategory.CodeReview, "코드리뷰"),
            ("13:00", "점심 휴식",                null,                              ScheduleCategory.Rest,       "휴식"),
            ("14:00", "AI Agent 파이프라인 개발", "Phase 2 M1 오케스트레이션 구현",   ScheduleCategory.Work,       "작업"),
            ("16:00", "Mr. Choi 주간 보고",       null,                              ScheduleCategory.Meeting,    "미팅"),
            ("17:30", "코드 커밋 및 PR 작성",     null,                              ScheduleCategory.Work,       "작업"),
        };

        foreach (var item in seedItems)
        {
            db.Schedules.Add(new Schedule
            {
                Id = Guid.NewGuid(),
                UserId = "local",
                Date = today,
                StartTime = TimeOnly.Parse(item.Time),
                EndTime = null,
                Title = item.Title,
                Description = item.Description,
                Category = item.Category,
                Tag = item.Tag,
                CreatedAt = now,
            });
        }
        await db.SaveChangesAsync();
    }
}
