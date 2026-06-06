using AIVIS.Domain.Models.Entities;

namespace AIVIS.Domain.Repositories;

public interface ITodoRepository
{
    Task<IReadOnlyList<Todo>> GetByUserIdAsync(string userId, CancellationToken ct = default);
    Task<Todo?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<Todo> CreateAsync(Todo todo, CancellationToken ct = default);
    Task<Todo> UpdateAsync(Todo todo, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
}
