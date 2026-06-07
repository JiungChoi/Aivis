using AIVIS.Application.Constants;
using AIVIS.Domain.Repositories;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AIVIS.Application.BackgroundServices;

public class MemoryConsolidationService(
    IMemoryRepository memoryRepository,
    ILogger<MemoryConsolidationService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ConsolidateAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Memory consolidation failed");
            }
            await Task.Delay(Interval, stoppingToken);
        }
    }

    private async Task ConsolidateAsync(CancellationToken ct)
    {
        var memories = await memoryRepository.ListByUserAsync(ApplicationConstants.DefaultUserId, ct);
        logger.LogInformation("Memory consolidation: {Count} entries reviewed", memories.Count);
        // 장기 기억 정리 — 추후 LLM 기반 요약 병합 추가 예정
    }
}
