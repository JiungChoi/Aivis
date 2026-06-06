using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace AIVIS.Infrastructure.DatabaseAccess.Repositories;

public class TodoRepository(AivisDbContext db) : ITodoRepository
{
    public async Task<IReadOnlyList<Todo>> GetByUserIdAsync(string userId, CancellationToken ct = default)
        => await db.Todos
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

    public async Task<Todo?> GetByIdAsync(string id, CancellationToken ct = default)
        => await db.Todos.FirstOrDefaultAsync(t => t.Id == id, ct);

    public async Task<Todo> CreateAsync(Todo todo, CancellationToken ct = default)
    {
        db.Todos.Add(todo);
        await db.SaveChangesAsync(ct);
        return todo;
    }

    public async Task<Todo> UpdateAsync(Todo todo, CancellationToken ct = default)
    {
        db.Todos.Update(todo);
        await db.SaveChangesAsync(ct);
        return todo;
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        await db.Todos.Where(t => t.Id == id).ExecuteDeleteAsync(ct);
    }
}
