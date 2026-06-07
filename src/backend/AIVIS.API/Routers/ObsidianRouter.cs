using AIVIS.API.Constants;
using AIVIS.Domain.Models.Common;
using AIVIS.Domain.Repositories;
using AIVIS.Domain.Services;

namespace AIVIS.API.Routers;

public static class ObsidianRouter
{

    public static IEndpointRouteBuilder MapObsidianRoutes(this IEndpointRouteBuilder app)
    {
        // GET /api/obsidian/settings
        app.MapGet("/api/obsidian/settings", (IObsidianService obsidianService) =>
        {
            return Results.Ok(ApiResponse<ObsidianSettingsDto>.Ok(
                new ObsidianSettingsDto(obsidianService.VaultPath, obsidianService.IsEnabled)));
        });

        // PUT /api/obsidian/settings
        app.MapPut("/api/obsidian/settings", (
            ObsidianSettingsRequest request,
            IObsidianService obsidianService) =>
        {
            obsidianService.UpdateSettings(request.VaultPath, request.Enabled);
            return Results.Ok(ApiResponse<ObsidianSettingsDto>.Ok(
                new ObsidianSettingsDto(obsidianService.VaultPath, obsidianService.IsEnabled)));
        });

        // POST /api/obsidian/sync — 기존 노트 전체 vault 동기화
        app.MapPost("/api/obsidian/sync", async (
            HttpRequest request,
            IObsidianService obsidianService,
            INoteRepository noteRepository,
            CancellationToken ct) =>
        {
            if (!obsidianService.IsEnabled)
                return Results.BadRequest(ApiResponse.FailResult("OBSIDIAN_DISABLED", "Obsidian vault path not configured or disabled"));

            var notes = await noteRepository.ListByUserAsync(request.GetUserId(), 1000, ct);
            await obsidianService.SyncAllNotesAsync(notes, ct);
            return Results.Ok(ApiResponse<SyncResultDto>.Ok(new SyncResultDto(notes.Count)));
        });

        return app;
    }
}

public record ObsidianSettingsDto(string VaultPath, bool IsEnabled);
public record ObsidianSettingsRequest(string VaultPath, bool Enabled);
public record SyncResultDto(int SyncedCount);
