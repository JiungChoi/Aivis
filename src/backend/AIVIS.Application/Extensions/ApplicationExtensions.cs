using AIVIS.Application.Services;
using AIVIS.Domain.Services;
using Microsoft.Extensions.DependencyInjection;

namespace AIVIS.Application.Extensions;

public static class ApplicationExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<ConversationQualityService>();
        services.AddScoped<ConversationContextBuilder>();
        services.AddScoped<AgentOrchestrator>();

        // 엔드포인트는 모두 Minimal API. enum→문자열 직렬화는 API 호스트(Program.cs)의
        // ConfigureHttpJsonOptions 에서 설정한다.
        return services;
    }
}
