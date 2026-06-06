using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVIS.Infrastructure.DatabaseAccess.Configurations;

public class MemoryConfiguration : IEntityTypeConfiguration<Memory>
{
    public void Configure(EntityTypeBuilder<Memory> builder)
    {
        builder.ToTable("memories");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.UserId).IsRequired().HasMaxLength(256);
        builder.Property(m => m.Key).IsRequired().HasMaxLength(200);
        builder.Property(m => m.Value).IsRequired();
        builder.Property(m => m.Source)
               .HasMaxLength(50)
               .HasDefaultValue(MemorySource.Conversation)
               .HasConversion(
                   v => v.ToString().ToLower(),
                   v => Enum.Parse<MemorySource>(v, true));
        builder.Property(m => m.CreatedAt).IsRequired();
        builder.Property(m => m.UpdatedAt).IsRequired();

        builder.HasIndex(m => new { m.UserId, m.Key }).IsUnique();
    }
}
