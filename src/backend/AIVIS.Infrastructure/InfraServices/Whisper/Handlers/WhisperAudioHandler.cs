namespace AIVIS.Infrastructure.InfraServices.Whisper.Handlers;

public class WhisperAudioHandler
{
    // 오디오 전처리: 샘플링, 노이즈 제거, 포맷 변환
    public async Task<Stream> PreprocessAsync(Stream rawAudio, CancellationToken ct = default)
    {
        return rawAudio;
    }
}
