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
    IMemoryRepository memoryRepository)
{
    public async Task<IReadOnlyList<ChatMessage>> PrepareHistoryAsync(
        string userId,
        IReadOnlyList<Message> dbHistory,
        CancellationToken ct = default)
    {
        var preferences = await LoadPreferencesAsync(userId, ct);
        var systemContent = qualityService.BuildSystemPrompt(preferences);

        var result = new List<ChatMessage> { new("system", systemContent) };

        foreach (var m in dbHistory)
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
        var user = await userRepository.GetByIdAsync(userId, ct);
        var memories = await memoryRepository.ListByUserAsync(userId, ct);
        var entries = memories.Select(m => new MemoryEntry(m.Key, m.Value)).ToList();

        if (user is null)
            return UserPreferences.Default with { Memories = entries };

        return new UserPreferences(
            Name: user.Name,
            Language: user.Language,
            Tone: user.Tone,
            CustomInstructions: user.CustomInstructions,
            Memories: entries);
    }
}
