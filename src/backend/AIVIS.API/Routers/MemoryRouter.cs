using AIVIS.API.Constants;
using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Common;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Repositories;

namespace AIVIS.API.Routers;

public static class MemoryRouter
{
    public static IEndpointRouteBuilder MapMemoryRoutes(this IEndpointRouteBuilder app)
    {
        // GET /api/memory
        app.MapGet("/api/memory", async (
            HttpContext ctx,
            IMemoryRepository memoryRepository,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var memories = await memoryRepository.ListByUserAsync(userId, ct);
            return Results.Ok(ApiResponse<List<MemoryDto>>.Ok(memories.Select(ToDto).ToList()));
        });

        // POST /api/memory — upsert by key
        app.MapPost("/api/memory", async (
            HttpContext ctx,
            UpsertMemoryRequest request,
            IMemoryRepository memoryRepository,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var source = ParseSource(request.Source);
            var memory = await memoryRepository.UpsertAsync(userId, request.Key, request.Value, source, ct);
            return Results.Ok(ApiResponse<MemoryDto>.Ok(ToDto(memory)));
        });

        // DELETE /api/memory/{id}
        app.MapDelete("/api/memory/{id:guid}", async (
            Guid id,
            IMemoryRepository memoryRepository,
            CancellationToken ct) =>
        {
            await memoryRepository.DeleteAsync(id, ct);
            return Results.Ok(ApiResponse.OkResult());
        });

        return app;
    }

    private static MemorySource ParseSource(string? value) =>
        Enum.TryParse<MemorySource>(value, ignoreCase: true, out var result)
            ? result
            : MemorySource.Manual;

    private static MemoryDto ToDto(Memory m) => new(
        Id:        m.Id,
        UserId:    m.UserId,
        Key:       m.Key,
        Value:     m.Value,
        Source:    m.Source.ToString().ToLower(),
        CreatedAt: m.CreatedAt,
        UpdatedAt: m.UpdatedAt);
}

public record UpsertMemoryRequest(string Key, string Value, string? Source);
public record MemoryDto(Guid Id, string UserId, string Key, string Value, string Source, DateTime CreatedAt, DateTime UpdatedAt);
