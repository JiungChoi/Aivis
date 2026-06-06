using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVIS.Infrastructure.DatabaseAccess.Configurations;

public class TodoConfiguration : IEntityTypeConfiguration<Todo>
{
    public void Configure(EntityTypeBuilder<Todo> builder)
    {
        builder.ToTable("todos");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).IsRequired().HasMaxLength(36);
        builder.Property(t => t.UserId).IsRequired().HasMaxLength(256);
        builder.Property(t => t.Title).IsRequired().HasMaxLength(500);
        builder.Property(t => t.Description).HasMaxLength(2000);
        builder.Property(t => t.IsCompleted).IsRequired().HasDefaultValue(false);
        builder.Property(t => t.Priority)
               .IsRequired()
               .HasMaxLength(20)
               .HasDefaultValue(TodoPriority.Normal)
               .HasConversion(
                   v => v.ToString().ToLower(),
                   v => Enum.Parse<TodoPriority>(v, true));
        builder.Property(t => t.DueDate);
        builder.Property(t => t.CreatedAt).IsRequired();
        builder.Property(t => t.UpdatedAt).IsRequired();

        builder.HasIndex(t => t.UserId);
    }
}
