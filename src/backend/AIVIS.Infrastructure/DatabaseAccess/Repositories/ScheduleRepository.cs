using AIVIS.Domain.Repositories;
using AIVIS.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace AIVIS.Infrastructure.DatabaseAccess.Repositories;

public class ScheduleRepository(AivisDbContext db) : IScheduleRepository
{
    public async Task<List<Schedule>> GetByDateAsync(string userId, DateOnly date, CancellationToken ct = default)
        => await db.Schedules
            .Where(s => s.UserId == userId && s.Date == date)
            .OrderBy(s => s.StartTime)
            .ToListAsync(ct);

    public async Task<List<Schedule>> GetUpcomingAsync(
        string userId, DateOnly date, TimeOnly fromTime, TimeOnly toTime, CancellationToken ct = default)
        => await db.Schedules
            .Where(s => s.UserId == userId && s.Date == date
                     && s.StartTime >= fromTime && s.StartTime <= toTime)
            .OrderBy(s => s.StartTime)
            .ToListAsync(ct);

    public async Task<Schedule?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await db.Schedules.FirstOrDefaultAsync(s => s.Id == id, ct);

    public async Task<Schedule> CreateAsync(Schedule schedule, CancellationToken ct = default)
    {
        db.Schedules.Add(schedule);
        await db.SaveChangesAsync(ct);
        return schedule;
    }

    public async Task UpdateAsync(Schedule schedule, CancellationToken ct = default)
    {
        db.Schedules.Update(schedule);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await db.Schedules.Where(s => s.Id == id).ExecuteDeleteAsync(ct);
    }
}
