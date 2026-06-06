using AIVIS.Domain.Repositories;
using AIVIS.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace AIVIS.Infrastructure.DatabaseAccess.Repositories;

public class SessionRepository : ISessionRepository
{
    private readonly AivisDbContext _dbContext;

    public SessionRepository(AivisDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<Session>> ListAsync(CancellationToken ct = default)
    {
        return await _dbContext.Sessions
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync(ct);
    }

    public async Task<Session?> GetByIdWithMessagesAsync(Guid id, CancellationToken ct = default)
    {
        return await _dbContext.Sessions
            .Include(s => s.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(s => s.Id == id, ct);
    }

    public async Task<Session> CreateAsync(Session session, CancellationToken ct = default)
    {
        _dbContext.Sessions.Add(session);
        await _dbContext.SaveChangesAsync(ct);
        return session;
    }

    public async Task UpdateAsync(Session session, CancellationToken ct = default)
    {
        _dbContext.Sessions.Update(session);
        await _dbContext.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await _dbContext.Sessions.Where(s => s.Id == id).ExecuteDeleteAsync(ct);
    }
}
