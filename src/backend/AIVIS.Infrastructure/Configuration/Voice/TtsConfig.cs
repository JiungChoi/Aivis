namespace AIVIS.Infrastructure.Configuration;

public class TtsConfig
{
    public const string Section = "Tts";
    public string Voice { get; init; } = "ko-KR-SunHiNeural";
}
