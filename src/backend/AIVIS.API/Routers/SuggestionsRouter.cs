using System.Text;
using System.Text.Json;
using AIVIS.Domain.Models.Agent;
using AIVIS.API.Constants;
using AIVIS.Domain.Models.Common;
using AIVIS.Domain.Repositories;
using AIVIS.Domain.Services;
using Microsoft.Extensions.Caching.Memory;

namespace AIVIS.API.Routers;

public static class SuggestionsRouter
{
    public static IEndpointRouteBuilder MapSuggestionsRoutes(this IEndpointRouteBuilder app)
    {
        // GET /api/suggestions — AI 작업 제안 (하루 1회 캐싱)
        app.MapGet("/api/suggestions", async (
            HttpContext ctx,
            IScheduleRepository scheduleRepository,
            IMemoryRepository memoryRepository,
            ILlmService llmService,
            IMemoryCache cache,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var cacheKey = $"suggestions_{userId}_{DateTime.Today:yyyyMMdd}";
            if (cache.TryGetValue(cacheKey, out List<SuggestionDto>? cached) && cached is not null)
                return Results.Ok(ApiResponse<List<SuggestionDto>>.Ok(cached));

            var today = DateOnly.FromDateTime(DateTime.Today);
            var schedules = await scheduleRepository.GetByDateAsync(userId, today, ct);
            var memories  = await memoryRepository.ListByUserAsync(userId, ct);

            var context     = BuildContext(schedules, memories);
            var suggestions = await GenerateSuggestionsAsync(llmService, context, ct);

            cache.Set(cacheKey, suggestions, TimeSpan.FromHours(6));
            return Results.Ok(ApiResponse<List<SuggestionDto>>.Ok(suggestions));
        });

        return app;
    }

    private static string BuildContext(
        List<AIVIS.Domain.Models.Entities.Schedule> schedules,
        List<AIVIS.Domain.Models.Entities.Memory> memories)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"오늘 날짜: {DateTime.Today:yyyy-MM-dd}");

        if (schedules.Count > 0)
        {
            sb.AppendLine("오늘 일정:");
            foreach (var s in schedules)
                sb.AppendLine($"- {s.StartTime:HH:mm} {s.Title} ({s.Category})");
        }
        else sb.AppendLine("오늘 일정: 없음");

        if (memories.Count > 0)
        {
            sb.AppendLine("사용자 기억:");
            foreach (var m in memories.Take(10))
                sb.AppendLine($"- {m.Key}: {m.Value}");
        }

        return sb.ToString();
    }

    private static async Task<List<SuggestionDto>> GenerateSuggestionsAsync(
        ILlmService llmService,
        string context,
        CancellationToken ct)
    {
        var prompt =
            "다음 컨텍스트를 바탕으로 사용자에게 유용한 작업 제안 4개를 JSON 배열로 반환하세요.\n" +
            "반드시 JSON 배열만 반환하고 다른 텍스트는 포함하지 마세요.\n\n" +
            "컨텍스트:\n" + context + "\n\n" +
            "반환 형식 예시:\n" +
            "[{\"icon\":\"⚡\",\"title\":\"작업명\",\"reason\":\"이유\",\"priority\":\"높음\"}]";

        var messages = new List<ChatMessage>
        {
            new("system", "당신은 생산성 코치입니다. 사용자의 일정과 정보를 분석해 실용적인 작업을 제안합니다."),
            new("user", prompt),
        };

        try
        {
            var fullText = new StringBuilder();
            await foreach (var chunk in llmService.StreamAsync(messages, ct))
            {
                if (chunk is TextDelta d) fullText.Append(d.Text);
            }

            var raw   = fullText.ToString().Trim();
            var start = raw.IndexOf('[');
            var end   = raw.LastIndexOf(']');
            if (start < 0 || end < 0) return FallbackSuggestions();

            var json   = raw[start..(end + 1)];
            var parsed = JsonSerializer.Deserialize<List<SuggestionDto>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return parsed is { Count: > 0 } ? parsed : FallbackSuggestions();
        }
        catch
        {
            return FallbackSuggestions();
        }
    }

    private static List<SuggestionDto> FallbackSuggestions() =>
    [
        new("⚡", "오늘 우선순위 작업 정리", "집중할 항목을 명확히 하세요", "높음"),
        new("📝", "회의 내용 노트 저장", "대화에서 중요한 내용을 기록하세요", "보통"),
        new("🔍", "진행 중인 작업 점검", "현재 작업 상태를 확인하세요", "보통"),
        new("🧠", "AI에게 오늘 계획 물어보기", "AIVIS와 하루를 설계하세요", "낮음"),
    ];
}

public record SuggestionDto(string Icon, string Title, string Reason, string Priority);
