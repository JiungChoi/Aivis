using System.Net.Http.Json;
using AIVIS.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace AIVIS.Infrastructure.InfraServices.Whisper.Implementations;

public sealed class WhisperHttpService : IWhisperService
{
    private readonly HttpClient _http;
    private readonly WhisperConfig _config;

    public WhisperHttpService(HttpClient http, IOptions<WhisperConfig> config)
    {
        _http = http;
        _config = config.Value;
    }

    public async Task<string> TranscribeAsync(Stream audioStream, string language = "ko", CancellationToken ct = default)
    {
        using var content = new MultipartFormDataContent();
        content.Add(new StreamContent(audioStream), "audio_file", "audio.wav");

        var url = $"{_config.ServiceUrl}/asr?encode=true&task=transcribe&language={language}&output=json";
        var response = await _http.PostAsync(url, content, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<WhisperResponse>(ct);
        return result?.Text?.Trim() ?? string.Empty;
    }

    private record WhisperResponse(string Text);
}
