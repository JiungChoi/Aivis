using AIVIS.API.Constants;
using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Common;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Repositories;

namespace AIVIS.API.Routers;

public static class TodoRouter
{
    public static IEndpointRouteBuilder MapTodoRoutes(this IEndpointRouteBuilder app)
    {
        // GET /api/todos
        app.MapGet("/api/todos", async (
            HttpContext ctx,
            ITodoRepository todoRepository,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var todos = await todoRepository.GetByUserIdAsync(userId, ct);
            return Results.Ok(ApiResponse<List<TodoDto>>.Ok(todos.Select(ToDto).ToList()));
        });

        // POST /api/todos
        app.MapPost("/api/todos", async (
            HttpContext ctx,
            CreateTodoRequest request,
            ITodoRepository todoRepository,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var now = DateTime.UtcNow;
            var todo = new Todo
            {
                Id          = Guid.NewGuid().ToString(),
                UserId      = userId,
                Title       = request.Title,
                Description = request.Description,
                Priority    = ParsePriority(request.Priority),
                DueDate     = request.DueDate,
                IsCompleted = false,
                CreatedAt   = now,
                UpdatedAt   = now,
            };
            var created = await todoRepository.CreateAsync(todo, ct);
            return Results.Ok(ApiResponse<TodoDto>.Ok(ToDto(created)));
        });

        // PUT /api/todos/{id}
        app.MapPut("/api/todos/{id}", async (
            string id,
            UpdateTodoRequest request,
            ITodoRepository todoRepository,
            CancellationToken ct) =>
        {
            var existing = await todoRepository.GetByIdAsync(id, ct);
            if (existing is null)
                return Results.NotFound(ApiResponse.FailResult("NOT_FOUND", $"Todo '{id}' not found."));

            existing.Title       = request.Title;
            existing.Description = request.Description;
            existing.Priority    = string.IsNullOrWhiteSpace(request.Priority)
                ? existing.Priority
                : ParsePriority(request.Priority);
            existing.DueDate     = request.DueDate;
            existing.IsCompleted = request.IsCompleted;
            existing.UpdatedAt   = DateTime.UtcNow;

            var updated = await todoRepository.UpdateAsync(existing, ct);
            return Results.Ok(ApiResponse<TodoDto>.Ok(ToDto(updated)));
        });

        // DELETE /api/todos/{id}
        app.MapDelete("/api/todos/{id}", async (
            string id,
            ITodoRepository todoRepository,
            CancellationToken ct) =>
        {
            await todoRepository.DeleteAsync(id, ct);
            return Results.NoContent();
        });

        return app;
    }

    private static TodoPriority ParsePriority(string? value) =>
        Enum.TryParse<TodoPriority>(value, ignoreCase: true, out var result)
            ? result
            : TodoPriority.Normal;

    private static TodoDto ToDto(Todo t) => new(
        Id:          t.Id,
        UserId:      t.UserId,
        Title:       t.Title,
        Description: t.Description,
        IsCompleted: t.IsCompleted,
        Priority:    t.Priority.ToString().ToLower(),
        DueDate:     t.DueDate,
        CreatedAt:   t.CreatedAt,
        UpdatedAt:   t.UpdatedAt);
}

public record CreateTodoRequest(string Title, string? Description, string? Priority, DateTime? DueDate);
public record UpdateTodoRequest(string Title, string? Description, string? Priority, DateTime? DueDate, bool IsCompleted);
public record TodoDto(string Id, string UserId, string Title, string? Description, bool IsCompleted, string Priority, DateTime? DueDate, DateTime CreatedAt, DateTime UpdatedAt);
