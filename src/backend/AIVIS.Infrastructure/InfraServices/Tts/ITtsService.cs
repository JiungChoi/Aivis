namespace AIVIS.Infrastructure.InfraServices.Tts;

public interface ITtsService
{
    Task<Stream> SynthesizeAsync(string text, string voice = "ko-KR-SunHiNeural", CancellationToken ct = default);
}
