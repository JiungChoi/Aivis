using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AIVIS.Infrastructure.DatabaseAccess;

public class AivisDbContextFactory : IDesignTimeDbContextFactory<AivisDbContext>
{
    public AivisDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AivisDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=aivis;Username=aivis;Password=aivis1234")
            .Options;

        return new AivisDbContext(options);
    }
}
