using AIVIS.Domain.Models.Entities;

namespace AIVIS.Domain.Repositories;

public interface IMessageRepository
{
    Task<List<Message>> GetBySessionIdAsync(Guid sessionId, CancellationToken ct = default);
    Task<Message> CreateAsync(Message message, CancellationToken ct = default);
}
