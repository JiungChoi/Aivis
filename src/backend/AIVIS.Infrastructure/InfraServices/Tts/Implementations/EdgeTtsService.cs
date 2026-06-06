using System.Net.WebSockets;
using System.Text;
using AIVIS.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace AIVIS.Infrastructure.InfraServices.Tts.Implementations;

public sealed class EdgeTtsService : ITtsService
{
    private const string WssUrl =
        "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1" +
        "?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=";

    private readonly TtsConfig _config;

    public EdgeTtsService(IOptions<TtsConfig> config)
    {
        _config = config.Value;
    }

    public async Task<Stream> SynthesizeAsync(string text, string voice = "ko-KR-SunHiNeural", CancellationToken ct = default)
    {
        var connectionId = Guid.NewGuid().ToString("N").ToUpper();
        using var ws = new ClientWebSocket();
        ws.Options.SetRequestHeader("User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        ws.Options.SetRequestHeader("Origin",
            "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold");

        await ws.ConnectAsync(new Uri(WssUrl + connectionId), ct);

        var ts = DateTime.UtcNow.ToString("ddd MMM dd yyyy HH:mm:ss 'GMT+0000 (Coordinated Universal Time)'");

        // 1. Speech config
        var configMsg =
            $"X-Timestamp:{ts}\r\n" +
            "Content-Type:application/json; charset=utf-8\r\n" +
            "Path:speech.config\r\n\r\n" +
            """{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}""";

        await ws.SendAsync(Encoding.UTF8.GetBytes(configMsg), WebSocketMessageType.Text, true, ct);

        // 2. SSML request
        var requestId = Guid.NewGuid().ToString("N").ToUpper();
        var ssml =
            $"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ko-KR'>" +
            $"<voice name='{voice}'>{EscapeXml(text)}</voice></speak>";

        var ssmlMsg =
            $"X-RequestId:{requestId}\r\n" +
            "Content-Type:application/ssml+xml\r\n" +
            $"X-Timestamp:{ts}\r\n" +
            "Path:ssml\r\n\r\n" +
            ssml;

        await ws.SendAsync(Encoding.UTF8.GetBytes(ssmlMsg), WebSocketMessageType.Text, true, ct);

        // 3. Collect MP3 audio chunks
        var output = new MemoryStream();
        var buffer = new byte[32768];

        while (ws.State == WebSocketState.Open)
        {
            var result = await ws.ReceiveAsync(buffer, ct);

            switch (result.MessageType)
            {
                case WebSocketMessageType.Close:
                    goto done;

                case WebSocketMessageType.Text:
                    var msg = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    if (msg.Contains("Path:turn.end"))
                        goto done;
                    break;

                case WebSocketMessageType.Binary when result.Count > 2:
                    // Binary format: [2-byte header length][header][audio data]
                    var headerLen = (buffer[0] << 8) | buffer[1];
                    var audioStart = 2 + headerLen;
                    if (audioStart < result.Count)
                        await output.WriteAsync(buffer.AsMemory(audioStart, result.Count - audioStart), ct);
                    break;
            }
        }

        done:
        output.Position = 0;
        return output;
    }

    private static string EscapeXml(string s) =>
        s.Replace("&", "&amp;")
         .Replace("<", "&lt;")
         .Replace(">", "&gt;")
         .Replace("\"", "&quot;")
         .Replace("'", "&apos;");
}
