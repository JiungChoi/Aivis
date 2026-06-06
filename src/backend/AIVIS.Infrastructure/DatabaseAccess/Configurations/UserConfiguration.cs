using System.Text.Json;
using AIVIS.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVIS.Infrastructure.DatabaseAccess.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    private static readonly JsonSerializerOptions JsonOptions = new();

    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasMaxLength(256);
        builder.Property(u => u.Name).IsRequired().HasMaxLength(100);
        builder.Property(u => u.Gender).HasMaxLength(20);
        builder.Property(u => u.Phone).HasMaxLength(30);
        builder.Property(u => u.Email).HasMaxLength(256);
        builder.Property(u => u.Language).HasMaxLength(50).HasDefaultValue("Korean");
        builder.Property(u => u.Tone).HasMaxLength(50).HasDefaultValue("casual");
        builder.Property(u => u.CustomInstructions)
               .HasColumnType("jsonb")
               .HasConversion(
                   v => JsonSerializer.Serialize(v, JsonOptions),
                   v => JsonSerializer.Deserialize<List<string>>(v, JsonOptions) ?? new List<string>());
        builder.Property(u => u.CreatedAt).IsRequired();
        builder.Property(u => u.UpdatedAt).IsRequired();
    }
}
