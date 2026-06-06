namespace AIVIS.Infrastructure.InfraServices.Whisper;

public interface IWhisperService
{
    Task<string> TranscribeAsync(Stream audioStream, string language = "ko", CancellationToken ct = default);
}
