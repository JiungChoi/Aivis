namespace AIVIS.Infrastructure.InfraServices.Obsidian.Handlers;

public class ObsidianSyncHandler
{
    // vault 변경 감지 및 충돌 처리
    public async Task HandleConflictAsync(string path, string incomingContent, CancellationToken ct = default)
    {
        // 충돌 시 타임스탬프 suffix 붙여서 백업 저장
    }
}
