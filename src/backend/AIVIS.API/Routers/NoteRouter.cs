using AIVIS.API.Constants;
using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Common;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Repositories;
using AIVIS.Domain.Services;

namespace AIVIS.API.Routers;

public static class NoteRouter
{
    public static IEndpointRouteBuilder MapNoteRoutes(this IEndpointRouteBuilder app)
    {
        // GET /api/notes?limit=20
        app.MapGet("/api/notes", async (
            HttpContext ctx,
            int? limit,
            INoteRepository noteRepository,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var notes = await noteRepository.ListByUserAsync(userId, limit ?? 50, ct);
            return Results.Ok(ApiResponse<List<NoteDto>>.Ok(notes.Select(ToDto).ToList()));
        });

        // GET /api/notes/search?q=키워드
        app.MapGet("/api/notes/search", async (
            HttpContext ctx,
            string? q,
            INoteRepository noteRepository,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(q))
                return Results.Ok(ApiResponse<List<NoteDto>>.Ok([]));

            var userId = ctx.Request.GetUserId();
            var notes = await noteRepository.SearchAsync(userId, q, ct);
            return Results.Ok(ApiResponse<List<NoteDto>>.Ok(notes.Select(ToDto).ToList()));
        });

        // GET /api/notes/{id}
        app.MapGet("/api/notes/{id:guid}", async (
            Guid id,
            INoteRepository noteRepository,
            CancellationToken ct) =>
        {
            var note = await noteRepository.GetByIdAsync(id, ct);
            return note is null
                ? Results.NotFound(ApiResponse.FailResult("NOT_FOUND", "Note not found"))
                : Results.Ok(ApiResponse<NoteDto>.Ok(ToDto(note)));
        });

        // POST /api/notes
        app.MapPost("/api/notes", async (
            HttpContext ctx,
            CreateNoteRequest request,
            INoteRepository noteRepository,
            IObsidianService obsidianService,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var now = DateTime.UtcNow;
            var note = new Note
            {
                Id        = Guid.NewGuid(),
                UserId    = userId,
                Title     = request.Title,
                Content   = request.Content,
                Tags      = request.Tags ?? [],
                Source    = request.Source?.ToLower() == "conversation" ? NoteSource.Conversation : NoteSource.Manual,
                CreatedAt = now,
                UpdatedAt = now,
            };
            await noteRepository.CreateAsync(note, ct);
            _ = obsidianService.SaveNoteAsync(note, CancellationToken.None);
            return Results.Ok(ApiResponse<NoteDto>.Ok(ToDto(note)));
        });

        // PUT /api/notes/{id}
        app.MapPut("/api/notes/{id:guid}", async (
            Guid id,
            UpdateNoteRequest request,
            INoteRepository noteRepository,
            CancellationToken ct) =>
        {
            var note = await noteRepository.GetByIdAsync(id, ct);
            if (note is null)
                return Results.NotFound(ApiResponse.FailResult("NOT_FOUND", "Note not found"));

            note.Title     = request.Title;
            note.Content   = request.Content;
            note.Tags      = request.Tags ?? [];
            note.UpdatedAt = DateTime.UtcNow;
            await noteRepository.UpdateAsync(note, ct);
            return Results.Ok(ApiResponse<NoteDto>.Ok(ToDto(note)));
        });

        // DELETE /api/notes/{id}
        app.MapDelete("/api/notes/{id:guid}", async (
            Guid id,
            INoteRepository noteRepository,
            CancellationToken ct) =>
        {
            await noteRepository.DeleteAsync(id, ct);
            return Results.Ok(ApiResponse.OkResult());
        });

        return app;
    }

    private static NoteDto ToDto(Note n) => new(
        Id:        n.Id,
        Title:     n.Title,
        Content:   n.Content,
        Tags:      n.Tags,
        Source:    n.Source.ToString().ToLower(),
        CreatedAt: n.CreatedAt.ToString("o"),
        UpdatedAt: n.UpdatedAt.ToString("o"));
}

public record CreateNoteRequest(string Title, string Content, string[]? Tags, string? Source);
public record UpdateNoteRequest(string Title, string Content, string[]? Tags);
public record NoteDto(Guid Id, string Title, string Content, string[] Tags, string Source, string CreatedAt, string UpdatedAt);
