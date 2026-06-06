using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVIS.Infrastructure.DatabaseAccess.Configurations;

public class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.ToTable("notes");
        builder.HasKey(n => n.Id);
        builder.Property(n => n.UserId).IsRequired().HasMaxLength(256);
        builder.Property(n => n.Title).IsRequired().HasMaxLength(300);
        builder.Property(n => n.Content).IsRequired();
        builder.Property(n => n.Tags).HasColumnType("text[]");
        builder.Property(n => n.Source)
               .HasConversion(s => s.ToString().ToLower(), v => Enum.Parse<NoteSource>(v, true))
               .HasMaxLength(50)
               .HasDefaultValue(NoteSource.Manual);
        builder.Property(n => n.CreatedAt).IsRequired();
        builder.Property(n => n.UpdatedAt).IsRequired();

        builder.HasIndex(n => n.UserId);
        builder.HasIndex(n => new { n.UserId, n.CreatedAt });
    }
}
