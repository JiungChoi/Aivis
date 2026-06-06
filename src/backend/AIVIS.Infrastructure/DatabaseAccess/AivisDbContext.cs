using AIVIS.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace AIVIS.Infrastructure.DatabaseAccess;

public class AivisDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Schedule> Schedules => Set<Schedule>();
    public DbSet<Memory> Memories => Set<Memory>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Todo> Todos => Set<Todo>();

    public AivisDbContext(DbContextOptions<AivisDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AivisDbContext).Assembly);
    }
}
