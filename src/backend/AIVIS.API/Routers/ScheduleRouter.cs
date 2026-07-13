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
            DateOnly targetDate;
            if (string.IsNullOrWhiteSpace(date))
                targetDate = DateOnly.FromDateTime(DateTime.Today);
            else if (!DateOnly.TryParse(date, out targetDate))
                return Results.BadRequest(ApiResponse.FailResult("INVALID_FORMAT", $"Invalid date format: '{date}'. Expected yyyy-MM-dd."));

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
            if (!TryParseScheduleFields(request.Date, request.StartTime, request.EndTime,
                    out var parsedDate, out var parsedStart, out var parsedEnd, out var error))
                return Results.BadRequest(ApiResponse.FailResult("INVALID_FORMAT", error));

            var category = ParseCategory(request.Category);
            var schedule = new Schedule
            {
                Id          = Guid.NewGuid(),
                UserId      = userId,
                Date        = parsedDate,
                StartTime   = parsedStart,
                EndTime     = parsedEnd,
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

            if (!TryParseScheduleFields(request.Date, request.StartTime, request.EndTime,
                    out var parsedDate, out var parsedStart, out var parsedEnd, out var error))
                return Results.BadRequest(ApiResponse.FailResult("INVALID_FORMAT", error));

            var category = ParseCategory(request.Category);
            schedule.Date        = parsedDate;
            schedule.StartTime   = parsedStart;
            schedule.EndTime     = parsedEnd;
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

    private static bool TryParseScheduleFields(
        string date, string startTime, string? endTime,
        out DateOnly parsedDate, out TimeOnly parsedStart, out TimeOnly? parsedEnd, out string error)
    {
        parsedStart = default;
        parsedEnd = null;
        error = string.Empty;

        if (!DateOnly.TryParse(date, out parsedDate))
        {
            error = $"Invalid date format: '{date}'. Expected yyyy-MM-dd.";
            return false;
        }
        if (!TimeOnly.TryParse(startTime, out parsedStart))
        {
            error = $"Invalid startTime format: '{startTime}'. Expected HH:mm.";
            return false;
        }
        if (!string.IsNullOrWhiteSpace(endTime))
        {
            if (!TimeOnly.TryParse(endTime, out var end))
            {
                error = $"Invalid endTime format: '{endTime}'. Expected HH:mm.";
                return false;
            }
            parsedEnd = end;
        }
        return true;
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
