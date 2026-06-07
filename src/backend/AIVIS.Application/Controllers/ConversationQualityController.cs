using AIVIS.Domain.Models.Agent;
using AIVIS.Domain.Models.ConversationQuality;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Enums;
using AIVIS.Domain.Services;
using AIVIS.Domain.Repositories;

namespace AIVIS.Application.Controllers;

public class ConversationQualityController(
    ConversationQualityService qualityService,
    IUserRepository userRepository,
    IMemoryRepository memoryRepository,
    IScheduleRepository scheduleRepository)
{
    private const int MaxHistoryMessages = 30;

    public async Task<IReadOnlyList<ChatMessage>> PrepareHistoryAsync(
        string userId,
        IReadOnlyList<Message> dbHistory,
        CancellationToken ct = default)
    {
        var preferences = await LoadPreferencesAsync(userId, ct);
        var systemContent = qualityService.BuildSystemPrompt(preferences);

        var result = new List<ChatMessage> { new("system", systemContent) };

        // Sliding window: keep only the most recent messages to avoid context overflow
        var window = dbHistory.Count > MaxHistoryMessages
            ? dbHistory.Skip(dbHistory.Count - MaxHistoryMessages).ToList()
            : dbHistory;

        foreach (var m in window)
        {
            var role = m.Role switch
            {
                MessageRole.User      => "user",
                MessageRole.Assistant => "assistant",
                _                     => "system",
            };
            result.Add(new ChatMessage(role, m.Content));
        }

        return result;
    }

    private async Task<UserPreferences> LoadPreferencesAsync(string userId, CancellationToken ct)
    {
        var user      = await userRepository.GetByIdAsync(userId, ct);
        var memories  = await memoryRepository.ListByUserAsync(userId, ct);
        var entries   = memories.Select(m => new MemoryEntry(m.Key, m.Value)).ToList();

        var today        = DateOnly.FromDateTime(DateTime.Today);
        var currentTime  = TimeOnly.FromDateTime(DateTime.Now);
        var schedules    = await scheduleRepository.GetByDateAsync(userId, today, ct);
        var todayEntries = schedules
            .Where(s => s.StartTime >= currentTime)
            .OrderBy(s => s.StartTime)
            .Select(s => new ScheduleEntry(s.StartTime.ToString("HH:mm"), s.Title, s.Category.ToString()))
            .ToList();

        if (user is null)
            return UserPreferences.Default with { Memories = entries, TodaySchedules = todayEntries };

        return new UserPreferences(
            Name: user.Name,
            Language: user.Language,
            Tone: user.Tone,
            CustomInstructions: user.CustomInstructions,
            Memories: entries,
            TodaySchedules: todayEntries);
    }
}
