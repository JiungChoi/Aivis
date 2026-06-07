using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using AIVIS.Domain.Enums;
using AIVIS.Domain.Models.Agent;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Repositories;
using AIVIS.Domain.Services;

namespace AIVIS.Application.Services;

public class AgentOrchestrator(
    ILlmService llmService,
    IScheduleRepository scheduleRepository,
    IMemoryRepository memoryRepository,
    INoteRepository noteRepository,
    ITodoRepository todoRepository,
    IObsidianService obsidianService)
{
    private const int MaxToolRounds = 3;

    // ── Tool 정의 ────────────────────────────────────────────
    private static readonly IReadOnlyList<ToolDefinition> Tools =
    [
        new("function", new ToolFunction(
            "create_schedule",
            "오늘 또는 특정 날짜에 일정을 추가합니다.",
            new ToolParameters("object", new()
            {
                ["title"]       = new("string", "일정 제목"),
                ["start_time"]  = new("string", "시작 시간 (HH:mm 형식, 예: 14:30)"),
                ["date"]        = new("string", "날짜 (yyyy-MM-dd, 기본값: 오늘)"),
                ["category"]    = new("string", "카테고리", ["Meeting", "Work", "CodeReview", "Rest", "Personal", "Other"]),
                ["description"] = new("string", "일정 내용 (선택)"),
            }, ["title", "start_time"]))),

        new("function", new ToolFunction(
            "get_schedules",
            "특정 날짜의 일정 목록을 조회합니다.",
            new ToolParameters("object", new()
            {
                ["date"] = new("string", "날짜 (yyyy-MM-dd, 기본값: 오늘)"),
            }, []))),

        new("function", new ToolFunction(
            "delete_schedule",
            "일정 ID로 일정을 삭제합니다. 먼저 get_schedules로 ID를 확인하세요.",
            new ToolParameters("object", new()
            {
                ["schedule_id"] = new("string", "삭제할 일정의 ID (UUID)"),
            }, ["schedule_id"]))),

        new("function", new ToolFunction(
            "save_memory",
            "사용자의 중요한 정보를 기억합니다. 대화 중 선호도, 습관, 계획, 사실 등을 발견했을 때 자동 호출하세요.",
            new ToolParameters("object", new()
            {
                ["key"]   = new("string", "기억 키 (간결한 식별자, 예: '좋아하는_음식')"),
                ["value"] = new("string", "기억할 내용"),
            }, ["key", "value"]))),

        new("function", new ToolFunction(
            "get_memories",
            "저장된 모든 기억 목록을 조회합니다.",
            new ToolParameters("object", new(), []))),

        new("function", new ToolFunction(
            "save_note",
            "대화에서 중요한 내용, 아이디어, 회의록 등을 노트로 저장합니다.",
            new ToolParameters("object", new()
            {
                ["title"]   = new("string", "노트 제목"),
                ["content"] = new("string", "노트 내용"),
                ["tags"]    = new("array",  "태그 목록 (예: [\"아이디어\", \"회의\"])"),
            }, ["title", "content"]))),

        new("function", new ToolFunction(
            "search_notes",
            "저장된 노트를 키워드로 검색합니다.",
            new ToolParameters("object", new()
            {
                ["query"] = new("string", "검색 키워드"),
            }, ["query"]))),

        new("function", new ToolFunction(
            "delete_memory",
            "저장된 기억을 키(key)로 찾아 삭제합니다. 잘못된 기억을 지울 때 사용하세요.",
            new ToolParameters("object", new()
            {
                ["key"] = new("string", "삭제할 기억의 키 (get_memories로 확인 가능)"),
            }, ["key"]))),

        new("function", new ToolFunction(
            "create_todo",
            "할 일(Todo)을 새로 추가합니다. 오늘 할 일, 작업 계획, 리마인더 등을 만들 때 사용하세요.",
            new ToolParameters("object", new()
            {
                ["title"]       = new("string", "할 일 제목"),
                ["description"] = new("string", "상세 설명 (선택)"),
                ["priority"]    = new("string", "우선순위", ["Low", "Normal", "High"]),
                ["due_date"]    = new("string", "마감일 (yyyy-MM-dd, 선택)"),
            }, ["title"]))),

        new("function", new ToolFunction(
            "get_todos",
            "현재 할 일 목록을 조회합니다. 완료 여부로 필터할 수 있습니다.",
            new ToolParameters("object", new()
            {
                ["filter"] = new("string", "필터: 'all'(기본), 'pending'(미완료), 'completed'(완료)", ["all", "pending", "completed"]),
            }, []))),

        new("function", new ToolFunction(
            "complete_todo",
            "할 일을 완료 처리합니다. 먼저 get_todos로 ID를 확인하세요.",
            new ToolParameters("object", new()
            {
                ["todo_id"] = new("string", "완료 처리할 할 일 ID"),
            }, ["todo_id"]))),
    ];

    // ── 메인 오케스트레이션 루프 ─────────────────────────────
    public async IAsyncEnumerable<AgentEvent> RunAsync(
        IReadOnlyList<ChatMessage> history,
        string userId,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var messages     = history.ToList();
        var toolsInvoked = false;

        for (var round = 0; round < MaxToolRounds; round++)
        {
            var response = await llmService.SendWithToolsAsync(messages, Tools, ct);

            if (!response.HasToolCalls)
            {
                // First round, no tools needed: emit text directly (avoids redundant LLM call)
                if (!toolsInvoked && !string.IsNullOrEmpty(response.TextContent))
                {
                    yield return new AgentTextDelta(response.TextContent);
                    yield return new AgentDone(response.TextContent);
                    yield break;
                }

                // After tool execution: stream for proper incremental UX
                await foreach (var ev in StreamFinalResponseAsync(messages, ct))
                    yield return ev;
                yield break;
            }

            toolsInvoked = true;

            // Encode full tool call metadata so each LLM adapter can reconstruct its native format
            var encoded = response.ToolCalls
                .Select(tc => new EncodedToolCall(tc.Id, tc.Name, tc.RawArguments))
                .ToList();
            messages.Add(new ChatMessage("assistant", JsonSerializer.Serialize(encoded)));

            foreach (var toolCall in response.ToolCalls)
            {
                yield return new AgentToolCalling(toolCall.Name, GetToolDisplayText(toolCall.Name));
                var result = await ExecuteToolAsync(toolCall.Name, toolCall.RawArguments, userId, ct);
                messages.Add(new ChatMessage("tool", JsonSerializer.Serialize(
                    new EncodedToolResult(toolCall.Id, result))));
            }

            if (round == MaxToolRounds - 1)
            {
                await foreach (var ev in StreamFinalResponseAsync(messages, ct))
                    yield return ev;
                yield break;
            }
        }
    }

    private async IAsyncEnumerable<AgentEvent> StreamFinalResponseAsync(
        List<ChatMessage> messages,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var fullText = new StringBuilder();
        await foreach (var chunk in llmService.StreamAsync(messages, ct))
        {
            if (chunk is TextDelta d)
            {
                fullText.Append(d.Text);
                yield return new AgentTextDelta(d.Text);
            }
        }
        yield return new AgentDone(fullText.ToString());
    }

    // ── Tool 실행 ─────────────────────────────────────────────
    private async Task<string> ExecuteToolAsync(
        string name,
        JsonElement args,
        string userId,
        CancellationToken ct)
    {
        try
        {
            return name switch
            {
                "create_schedule" => await CreateScheduleAsync(args, userId, ct),
                "get_schedules"   => await GetSchedulesAsync(args, userId, ct),
                "delete_schedule" => await DeleteScheduleAsync(args, ct),
                "save_memory"     => await SaveMemoryAsync(args, userId, ct),
                "get_memories"    => await GetMemoriesAsync(userId, ct),
                "save_note"       => await SaveNoteAsync(args, userId, ct),
                "search_notes"    => await SearchNotesAsync(args, userId, ct),
                "delete_memory"   => await DeleteMemoryAsync(args, userId, ct),
                "create_todo"     => await CreateTodoAsync(args, userId, ct),
                "get_todos"       => await GetTodosAsync(args, userId, ct),
                "complete_todo"   => await CompleteTodoAsync(args, userId, ct),
                _                 => $"알 수 없는 도구: {name}",
            };
        }
        catch (Exception ex)
        {
            return $"도구 실행 오류 ({name}): {ex.Message}";
        }
    }

    private async Task<string> CreateScheduleAsync(JsonElement args, string userId, CancellationToken ct)
    {
        var title     = GetString(args, "title") ?? "제목 없음";
        var startTime = GetString(args, "start_time") ?? "09:00";
        var dateStr   = GetString(args, "date");
        var category  = GetString(args, "category") ?? "Work";
        var desc      = GetString(args, "description");

        var date = string.IsNullOrWhiteSpace(dateStr)
            ? DateOnly.FromDateTime(DateTime.UtcNow)
            : DateOnly.Parse(dateStr);

        if (!Enum.TryParse<ScheduleCategory>(category, ignoreCase: true, out var cat))
            cat = ScheduleCategory.Work;

        var schedule = new Schedule
        {
            Id          = Guid.NewGuid(),
            UserId      = userId,
            Date        = date,
            StartTime   = TimeOnly.Parse(startTime),
            Title       = title,
            Description = desc,
            Category    = cat,
            Tag         = CategoryToTag(cat),
            CreatedAt   = DateTime.UtcNow,
        };

        await scheduleRepository.CreateAsync(schedule, ct);
        return $"일정 추가 완료: '{title}' — {date:yyyy-MM-dd} {startTime} [{CategoryToTag(cat)}]";
    }

    private async Task<string> GetSchedulesAsync(JsonElement args, string userId, CancellationToken ct)
    {
        var dateStr = GetString(args, "date");
        var date = string.IsNullOrWhiteSpace(dateStr)
            ? DateOnly.FromDateTime(DateTime.UtcNow)
            : DateOnly.Parse(dateStr);

        var schedules = await scheduleRepository.GetByDateAsync(userId, date, ct);
        if (schedules.Count == 0)
            return $"{date:yyyy-MM-dd} 일정이 없습니다.";

        var lines = schedules.Select(s =>
            $"- [{s.Id}] {s.StartTime:HH:mm} {s.Title} ({CategoryToTag(s.Category)})");
        return $"{date:yyyy-MM-dd} 일정:\n{string.Join('\n', lines)}";
    }

    private async Task<string> DeleteScheduleAsync(JsonElement args, CancellationToken ct)
    {
        var idStr = GetString(args, "schedule_id");
        if (!Guid.TryParse(idStr, out var id))
            return "유효하지 않은 일정 ID입니다.";

        await scheduleRepository.DeleteAsync(id, ct);
        return $"일정 삭제 완료 (ID: {id})";
    }

    private async Task<string> SaveMemoryAsync(JsonElement args, string userId, CancellationToken ct)
    {
        var key   = GetString(args, "key")   ?? "unknown";
        var value = GetString(args, "value") ?? string.Empty;

        await memoryRepository.UpsertAsync(userId, key, value, MemorySource.Conversation, ct);
        return $"기억 저장 완료: {key} = {value}";
    }

    private async Task<string> GetMemoriesAsync(string userId, CancellationToken ct)
    {
        var memories = await memoryRepository.ListByUserAsync(userId, ct);
        if (memories.Count == 0) return "저장된 기억이 없습니다.";

        var lines = memories.Select(m => $"- {m.Key}: {m.Value}");
        return $"저장된 기억:\n{string.Join('\n', lines)}";
    }

    private async Task<string> SaveNoteAsync(JsonElement args, string userId, CancellationToken ct)
    {
        var title   = GetString(args, "title")   ?? "제목 없음";
        var content = GetString(args, "content") ?? string.Empty;
        var tags    = GetStringArray(args, "tags");

        var now = DateTime.UtcNow;
        var note = new AIVIS.Domain.Models.Entities.Note
        {
            Id        = Guid.NewGuid(),
            UserId    = userId,
            Title     = title,
            Content   = content,
            Tags      = tags,
            Source    = NoteSource.Conversation,
            CreatedAt = now,
            UpdatedAt = now,
        };
        await noteRepository.CreateAsync(note, ct);
        _ = obsidianService.SaveNoteAsync(note, CancellationToken.None);
        var tagStr = tags.Length > 0 ? $" [{string.Join(", ", tags)}]" : string.Empty;
        return $"노트 저장 완료: '{title}'{tagStr}";
    }

    private async Task<string> SearchNotesAsync(JsonElement args, string userId, CancellationToken ct)
    {
        var query = GetString(args, "query") ?? string.Empty;
        if (string.IsNullOrWhiteSpace(query)) return "검색어를 입력해주세요.";

        var notes = await noteRepository.SearchAsync(userId, query, ct);
        if (notes.Count == 0) return $"'{query}'에 대한 검색 결과가 없습니다.";

        var lines = notes.Take(5).Select(n =>
        {
            var preview = n.Content.Length > 100 ? n.Content[..100] + "..." : n.Content;
            return $"- [{n.Id}] {n.Title}\n  {preview}";
        });
        return $"'{query}' 검색 결과 ({notes.Count}건):\n{string.Join('\n', lines)}";
    }

    private async Task<string> DeleteMemoryAsync(JsonElement args, string userId, CancellationToken ct)
    {
        var key = GetString(args, "key");
        if (string.IsNullOrWhiteSpace(key)) return "삭제할 기억의 키를 입력해주세요.";

        var memory = await memoryRepository.GetByKeyAsync(userId, key, ct);
        if (memory is null)
            return $"'{key}' 키의 기억을 찾을 수 없습니다.";

        await memoryRepository.DeleteAsync(memory.Id, ct);
        return $"기억 삭제 완료: {key}";
    }

    private async Task<string> CreateTodoAsync(JsonElement args, string userId, CancellationToken ct)
    {
        var title    = GetString(args, "title") ?? "할 일";
        var desc     = GetString(args, "description");
        var priority = GetString(args, "priority") ?? "Normal";
        var dueDateStr = GetString(args, "due_date");

        if (!Enum.TryParse<TodoPriority>(priority, ignoreCase: true, out var prio))
            prio = TodoPriority.Normal;

        DateTime? dueDate = null;
        if (!string.IsNullOrWhiteSpace(dueDateStr) && DateTime.TryParse(dueDateStr, out var parsed))
            dueDate = parsed.ToUniversalTime();

        var todo = new AIVIS.Domain.Models.Entities.Todo
        {
            Id          = Guid.NewGuid().ToString(),
            UserId      = userId,
            Title       = title,
            Description = desc,
            Priority    = prio,
            DueDate     = dueDate,
            CreatedAt   = DateTime.UtcNow,
            UpdatedAt   = DateTime.UtcNow,
        };
        await todoRepository.CreateAsync(todo, ct);

        var due = dueDate.HasValue ? $" (마감: {dueDate.Value:yyyy-MM-dd})" : string.Empty;
        return $"할 일 추가 완료: '{title}'{due} [{prio}]";
    }

    private async Task<string> GetTodosAsync(JsonElement args, string userId, CancellationToken ct)
    {
        var filter = GetString(args, "filter") ?? "all";
        var todos  = await todoRepository.GetByUserIdAsync(userId, ct);

        var filtered = filter switch
        {
            "pending"   => todos.Where(t => !t.IsCompleted).ToList(),
            "completed" => todos.Where(t =>  t.IsCompleted).ToList(),
            _           => todos.ToList(),
        };

        if (filtered.Count == 0)
            return filter == "completed" ? "완료된 할 일이 없습니다." : "할 일이 없습니다.";

        var lines = filtered.Select(t =>
        {
            var status  = t.IsCompleted ? "✓" : "○";
            var due     = t.DueDate.HasValue ? $" ~{t.DueDate.Value:MM/dd}" : string.Empty;
            var prio    = t.Priority != TodoPriority.Normal ? $" [{t.Priority}]" : string.Empty;
            return $"{status} [{t.Id[..8]}] {t.Title}{due}{prio}";
        });
        return $"할 일 목록 ({filtered.Count}건):\n{string.Join('\n', lines)}";
    }

    private async Task<string> CompleteTodoAsync(JsonElement args, string userId, CancellationToken ct)
    {
        var idStr = GetString(args, "todo_id");
        if (string.IsNullOrWhiteSpace(idStr)) return "할 일 ID를 입력해주세요.";

        // Try exact match first, then prefix match (AI may pass shortened 8-char prefix)
        var todo = await todoRepository.GetByIdAsync(idStr, ct);
        if (todo is null)
        {
            var all = await todoRepository.GetByUserIdAsync(userId, ct);
            todo = all.FirstOrDefault(t => t.Id.StartsWith(idStr, StringComparison.OrdinalIgnoreCase));
        }

        if (todo is null)
            return $"할 일을 찾을 수 없습니다 (ID: {idStr}).";

        todo.IsCompleted = true;
        todo.UpdatedAt   = DateTime.UtcNow;
        await todoRepository.UpdateAsync(todo, ct);
        return $"완료 처리: '{todo.Title}'";
    }

    // ── 헬퍼 ─────────────────────────────────────────────────
    private static string? GetString(JsonElement obj, string key)
    {
        if (obj.ValueKind == JsonValueKind.Object &&
            obj.TryGetProperty(key, out var prop))
        {
            return prop.ValueKind == JsonValueKind.String ? prop.GetString() : prop.ToString();
        }
        return null;
    }

    private static string[] GetStringArray(JsonElement obj, string key)
    {
        if (obj.ValueKind != JsonValueKind.Object ||
            !obj.TryGetProperty(key, out var prop) ||
            prop.ValueKind != JsonValueKind.Array)
            return [];

        return prop.EnumerateArray()
            .Where(e => e.ValueKind == JsonValueKind.String)
            .Select(e => e.GetString()!)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToArray();
    }

    private static string CategoryToTag(ScheduleCategory cat) => cat.ToKoreanTag();

    private static string GetToolDisplayText(string toolName) => toolName switch
    {
        "create_schedule" => "📅 일정 추가 중...",
        "get_schedules"   => "📋 일정 조회 중...",
        "delete_schedule" => "🗑️ 일정 삭제 중...",
        "save_memory"     => "🧠 정보 기억 중...",
        "get_memories"    => "🧠 기억 불러오는 중...",
        "save_note"       => "📝 노트 저장 중...",
        "search_notes"    => "🔍 노트 검색 중...",
        "delete_memory"   => "🧠 기억 삭제 중...",
        "create_todo"     => "✅ 할 일 추가 중...",
        "get_todos"       => "📋 할 일 조회 중...",
        "complete_todo"   => "✅ 할 일 완료 처리 중...",
        _                 => $"⚙️ {toolName} 실행 중...",
    };
}
