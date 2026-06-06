using AIVIS.Domain.Models.Entities;

namespace AIVIS.Domain.Repositories;

public interface ISessionRepository
{
    Task<List<Session>> ListAsync(CancellationToken ct = default);
    Task<Session?> GetByIdWithMessagesAsync(Guid id, CancellationToken ct = default);
    Task<Session> CreateAsync(Session session, CancellationToken ct = default);
    Task UpdateAsync(Session session, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
