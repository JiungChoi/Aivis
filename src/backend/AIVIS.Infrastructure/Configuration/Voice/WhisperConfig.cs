namespace AIVIS.Infrastructure.Configuration;

public class WhisperConfig
{
    public const string Section = "Whisper";
    public string ServiceUrl { get; init; } = "http://whisper-asr:9000";
    public string Language { get; init; } = "ko";
}
