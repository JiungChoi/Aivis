using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVIS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduleCategoryAndDescription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Category",
                table: "schedules",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "schedules",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "schedules");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "schedules");
        }
    }
}
