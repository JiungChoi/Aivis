using AIVIS.Application.Controllers;
using AIVIS.Application.Services;
using AIVIS.Domain.Services;
using Microsoft.Extensions.DependencyInjection;

namespace AIVIS.Application.Extensions;

public static class ApplicationExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<ConversationQualityService>();
        services.AddScoped<ConversationQualityController>();
        services.AddScoped<AgentOrchestrator>();

        services.AddControllers()
                .AddApplicationPart(typeof(ApplicationExtensions).Assembly)
                .AddJsonOptions(o =>
                    o.JsonSerializerOptions.Converters.Add(
                        new System.Text.Json.Serialization.JsonStringEnumConverter()));

        return services;
    }
}
