using AIVIS.Domain.Repositories;
using AIVIS.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace AIVIS.Infrastructure.DatabaseAccess.Repositories;

public class NoteRepository(AivisDbContext db) : INoteRepository
{
    public async Task<List<Note>> ListByUserAsync(string userId, int limit = 50, CancellationToken ct = default)
        => await db.Notes
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.UpdatedAt)
            .Take(limit)
            .ToListAsync(ct);

    public async Task<List<Note>> SearchAsync(string userId, string query, CancellationToken ct = default)
    {
        var q = query.ToLower();
        return await db.Notes
            .Where(n => n.UserId == userId &&
                        (EF.Functions.ILike(n.Title, $"%{q}%") ||
                         EF.Functions.ILike(n.Content, $"%{q}%") ||
                         n.Tags.Any(t => EF.Functions.ILike(t, $"%{q}%"))))
            .OrderByDescending(n => n.UpdatedAt)
            .Take(20)
            .ToListAsync(ct);
    }

    public async Task<Note?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await db.Notes.FindAsync([id], ct);

    public async Task<Note> CreateAsync(Note note, CancellationToken ct = default)
    {
        db.Notes.Add(note);
        await db.SaveChangesAsync(ct);
        return note;
    }

    public async Task UpdateAsync(Note note, CancellationToken ct = default)
    {
        db.Notes.Update(note);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        => await db.Notes.Where(n => n.Id == id).ExecuteDeleteAsync(ct);
}
