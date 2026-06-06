using AIVIS.Domain.Repositories;
using AIVIS.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace AIVIS.Infrastructure.DatabaseAccess.Repositories;

public class MessageRepository : IMessageRepository
{
    private readonly AivisDbContext _dbContext;

    public MessageRepository(AivisDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<Message>> GetBySessionIdAsync(Guid sessionId, CancellationToken ct = default)
    {
        return await _dbContext.Messages
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<Message> CreateAsync(Message message, CancellationToken ct = default)
    {
        _dbContext.Messages.Add(message);
        await _dbContext.SaveChangesAsync(ct);
        return message;
    }
}
