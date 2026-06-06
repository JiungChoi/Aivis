using AIVIS.Domain.Models.Entities;

namespace AIVIS.Domain.Repositories;

public interface IScheduleRepository
{
    Task<List<Schedule>> GetByDateAsync(string userId, DateOnly date, CancellationToken ct = default);
    Task<List<Schedule>> GetUpcomingAsync(string userId, DateOnly date, TimeOnly fromTime, TimeOnly toTime, CancellationToken ct = default);
    Task<Schedule?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Schedule> CreateAsync(Schedule schedule, CancellationToken ct = default);
    Task UpdateAsync(Schedule schedule, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
