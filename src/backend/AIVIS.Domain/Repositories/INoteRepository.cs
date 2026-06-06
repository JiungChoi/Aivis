using AIVIS.Domain.Models.Entities;

namespace AIVIS.Domain.Repositories;

public interface INoteRepository
{
    Task<List<Note>> ListByUserAsync(string userId, int limit = 50, CancellationToken ct = default);
    Task<List<Note>> SearchAsync(string userId, string query, CancellationToken ct = default);
    Task<Note?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Note> CreateAsync(Note note, CancellationToken ct = default);
    Task UpdateAsync(Note note, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
