using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVIS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionTitle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "sessions",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Title",
                table: "sessions");
        }
    }
}
