using AIVIS.Domain.Models.Common;
using AIVIS.Infrastructure.InfraServices.Tts;
using AIVIS.Infrastructure.InfraServices.Whisper;

namespace AIVIS.API.Routers;

public static class VoiceRouter
{
    public static void MapVoiceRoutes(this WebApplication app)
    {
        var grp = app.MapGroup("/api/voice").DisableAntiforgery();

        // POST /api/voice/transcribe  — multipart audio → text
        grp.MapPost("/transcribe", async (
            IFormFile audio,
            IWhisperService whisper,
            CancellationToken ct) =>
        {
            await using var stream = audio.OpenReadStream();
            var text = await whisper.TranscribeAsync(stream, "ko", ct);
            return Results.Ok(ApiResponse<string>.Ok(text));
        });

        // POST /api/voice/synthesize  — { text, voice? } → audio/mpeg stream
        grp.MapPost("/synthesize", async (
            SynthesizeRequest req,
            ITtsService tts,
            CancellationToken ct) =>
        {
            var audio = await tts.SynthesizeAsync(
                req.Text,
                req.Voice ?? "ko-KR-SunHiNeural",
                ct);
            return Results.Stream(audio, "audio/mpeg");
        });
    }
}

public record SynthesizeRequest(string Text, string? Voice);
