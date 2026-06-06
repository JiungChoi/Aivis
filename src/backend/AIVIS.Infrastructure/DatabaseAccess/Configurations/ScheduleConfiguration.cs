using AIVIS.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVIS.Infrastructure.DatabaseAccess.Configurations;

public class ScheduleConfiguration : IEntityTypeConfiguration<Schedule>
{
    public void Configure(EntityTypeBuilder<Schedule> builder)
    {
        builder.ToTable("schedules");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.UserId).IsRequired().HasMaxLength(256);
        builder.Property(s => s.Date).IsRequired();
        builder.Property(s => s.StartTime).IsRequired();
        builder.Property(s => s.EndTime);
        builder.Property(s => s.Title).IsRequired().HasMaxLength(200);
        builder.Property(s => s.Description).HasMaxLength(1000);
        builder.Property(s => s.Category).IsRequired();
        builder.Property(s => s.Tag).HasMaxLength(50);
        builder.Property(s => s.CreatedAt).IsRequired();

        builder.HasIndex(s => new { s.UserId, s.Date });
    }
}
