using AIVIS.API.Constants;
using AIVIS.Domain.Models.Common;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Enums;
using AIVIS.Domain.Repositories;

namespace AIVIS.API.Routers;

public static class ScheduleRouter
{
    public static IEndpointRouteBuilder MapScheduleRoutes(this IEndpointRouteBuilder app)
    {
        // GET /api/schedules?date=2026-05-23
        app.MapGet("/api/schedules", async (
            HttpContext ctx,
            string? date,
            IScheduleRepository scheduleRepository,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var targetDate = string.IsNullOrWhiteSpace(date)
                ? DateOnly.FromDateTime(DateTime.Today)
                : DateOnly.Parse(date);

            var schedules = await scheduleRepository.GetByDateAsync(userId, targetDate, ct);
            return Results.Ok(ApiResponse<List<ScheduleDto>>.Ok(schedules.Select(ToDto).ToList()));
        });

        // GET /api/schedules/reminders/upcoming?withinMinutes=10
        app.MapGet("/api/schedules/reminders/upcoming", async (
            HttpContext ctx,
            int? withinMinutes,
            IScheduleRepository scheduleRepository,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var localNow = DateTime.Now;
            var today = DateOnly.FromDateTime(localNow);
            var fromTime = TimeOnly.FromDateTime(localNow);
            var toTime = fromTime.AddMinutes(withinMinutes ?? 10);

            var schedules = await scheduleRepository.GetUpcomingAsync(userId, today, fromTime, toTime, ct);
            return Results.Ok(ApiResponse<List<ScheduleDto>>.Ok(schedules.Select(ToDto).ToList()));
        });

        // POST /api/schedules
        app.MapPost("/api/schedules", async (
            HttpContext ctx,
            CreateScheduleRequest request,
            IScheduleRepository scheduleRepository,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var category = ParseCategory(request.Category);
            var schedule = new Schedule
            {
                Id          = Guid.NewGuid(),
                UserId      = userId,
                Date        = DateOnly.Parse(request.Date),
                StartTime   = TimeOnly.Parse(request.StartTime),
                EndTime     = string.IsNullOrWhiteSpace(request.EndTime) ? null : TimeOnly.Parse(request.EndTime),
                Title       = request.Title,
                Description = request.Description,
                Category    = category,
                Tag         = request.Tag ?? CategoryToTag(category),
                CreatedAt   = DateTime.UtcNow,
            };

            await scheduleRepository.CreateAsync(schedule, ct);
            return Results.Ok(ApiResponse<ScheduleDto>.Ok(ToDto(schedule)));
        });

        // PUT /api/schedules/{id}
        app.MapPut("/api/schedules/{id:guid}", async (
            Guid id,
            UpdateScheduleRequest request,
            IScheduleRepository scheduleRepository,
            CancellationToken ct) =>
        {
            var schedule = await scheduleRepository.GetByIdAsync(id, ct);
            if (schedule is null)
                return Results.NotFound(ApiResponse.FailResult("NOT_FOUND", "Schedule not found"));

            var category = ParseCategory(request.Category);
            schedule.Date        = DateOnly.Parse(request.Date);
            schedule.StartTime   = TimeOnly.Parse(request.StartTime);
            schedule.EndTime     = string.IsNullOrWhiteSpace(request.EndTime) ? null : TimeOnly.Parse(request.EndTime);
            schedule.Title       = request.Title;
            schedule.Description = request.Description;
            schedule.Category    = category;
            schedule.Tag         = request.Tag ?? CategoryToTag(category);

            await scheduleRepository.UpdateAsync(schedule, ct);
            return Results.Ok(ApiResponse<ScheduleDto>.Ok(ToDto(schedule)));
        });

        // DELETE /api/schedules/{id}
        app.MapDelete("/api/schedules/{id:guid}", async (
            Guid id,
            IScheduleRepository scheduleRepository,
            CancellationToken ct) =>
        {
            await scheduleRepository.DeleteAsync(id, ct);
            return Results.Ok(ApiResponse.OkResult());
        });

        return app;
    }

    private static ScheduleCategory ParseCategory(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return ScheduleCategory.Work;
        return Enum.TryParse<ScheduleCategory>(value, ignoreCase: true, out var result)
            ? result
            : ScheduleCategory.Other;
    }

    private static string CategoryToTag(ScheduleCategory category) => category.ToKoreanTag();

    private static ScheduleDto ToDto(Schedule s) => new(
        Id:          s.Id,
        Date:        s.Date.ToString("yyyy-MM-dd"),
        StartTime:   s.StartTime.ToString("HH:mm"),
        EndTime:     s.EndTime?.ToString("HH:mm"),
        Title:       s.Title,
        Description: s.Description,
        Category:    s.Category.ToString(),
        Tag:         s.Tag);
}

public record CreateScheduleRequest(
    string Date,
    string StartTime,
    string? EndTime,
    string Title,
    string? Description,
    string? Category,
    string? Tag);

public record UpdateScheduleRequest(
    string Date,
    string StartTime,
    string? EndTime,
    string Title,
    string? Description,
    string? Category,
    string? Tag);

public record ScheduleDto(
    Guid Id,
    string Date,
    string StartTime,
    string? EndTime,
    string Title,
    string? Description,
    string Category,
    string Tag);
