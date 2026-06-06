using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace AIVIS.Infrastructure.DatabaseAccess.Repositories;

public class MemoryRepository(AivisDbContext db) : IMemoryRepository
{
    public async Task<List<Memory>> ListByUserAsync(string userId, CancellationToken ct = default)
        => await db.Memories
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.UpdatedAt)
            .ToListAsync(ct);

    public async Task<Memory?> GetByKeyAsync(string userId, string key, CancellationToken ct = default)
        => await db.Memories.FirstOrDefaultAsync(m => m.UserId == userId && m.Key == key, ct);

    public async Task<Memory> UpsertAsync(string userId, string key, string value, MemorySource source = MemorySource.Conversation, CancellationToken ct = default)
    {
        var existing = await GetByKeyAsync(userId, key, ct);
        var now = DateTime.UtcNow;

        if (existing is null)
        {
            var memory = new Memory
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Key = key,
                Value = value,
                Source = source,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.Memories.Add(memory);
            await db.SaveChangesAsync(ct);
            return memory;
        }

        existing.Value = value;
        existing.Source = source;
        existing.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
        return existing;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await db.Memories.Where(m => m.Id == id).ExecuteDeleteAsync(ct);
    }
}
