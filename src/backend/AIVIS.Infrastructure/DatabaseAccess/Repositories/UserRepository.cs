using AIVIS.Domain.Repositories;
using AIVIS.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace AIVIS.Infrastructure.DatabaseAccess.Repositories;

public class UserRepository(AivisDbContext db) : IUserRepository
{
    public async Task<User?> GetByIdAsync(string userId, CancellationToken ct = default)
        => await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);

    public async Task<User> CreateAsync(User user, CancellationToken ct = default)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return user;
    }

    public async Task UpdateAsync(User user, CancellationToken ct = default)
    {
        db.Users.Update(user);
        await db.SaveChangesAsync(ct);
    }
}
