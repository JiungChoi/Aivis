using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Entities;

namespace AIVIS.Domain.Repositories;

public interface IMemoryRepository
{
    Task<List<Memory>> ListByUserAsync(string userId, CancellationToken ct = default);
    Task<Memory?> GetByKeyAsync(string userId, string key, CancellationToken ct = default);
    Task<Memory> UpsertAsync(string userId, string key, string value, MemorySource source = MemorySource.Conversation, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
