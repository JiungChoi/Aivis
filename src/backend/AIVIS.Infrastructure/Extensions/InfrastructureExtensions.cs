using AIVIS.Domain.Services;
using AIVIS.Domain.Repositories;
using AIVIS.Infrastructure.Configuration;
using AIVIS.Infrastructure.Configuration.LlmModels;
using AIVIS.Infrastructure.DatabaseAccess;
using AIVIS.Infrastructure.DatabaseAccess.Repositories;
using AIVIS.Infrastructure.InfraServices.Claude;
using AIVIS.Infrastructure.InfraServices.Claude.Handlers;
using AIVIS.Infrastructure.InfraServices.Claude.Implementations;
using AIVIS.Infrastructure.InfraServices.Ollama.Implementations;
using AIVIS.Infrastructure.InfraServices.ChromaDb;
using AIVIS.Infrastructure.InfraServices.ChromaDb.Implementations;
using AIVIS.Infrastructure.InfraServices.News;
using AIVIS.Infrastructure.InfraServices.Obsidian.Implementations;
using AIVIS.Infrastructure.InfraServices.Tts;
using AIVIS.Infrastructure.InfraServices.Tts.Implementations;
using AIVIS.Infrastructure.InfraServices.Whisper;
using AIVIS.Infrastructure.InfraServices.Whisper.Implementations;
using AIVIS.Infrastructure.InfraServices.Workspace.Implementations;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AIVIS.Infrastructure.Extensions;

public static class InfrastructureExtensions
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration["Database:ConnectionString"]
            ?? throw new InvalidOperationException("Database connection string not configured");

        services.AddDbContext<AivisDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ISessionRepository, SessionRepository>();
        services.AddScoped<IMessageRepository, MessageRepository>();
        services.AddScoped<IScheduleRepository, ScheduleRepository>();
        services.AddScoped<IMemoryRepository, MemoryRepository>();
        services.AddScoped<INoteRepository, NoteRepository>();
        services.AddScoped<ITodoRepository, TodoRepository>();

        services.AddMemoryCache();
        services.AddHttpClient<INewsService, NewsService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("AIVIS/1.0");
        });

        services.Configure<OllamaConfig>(configuration.GetSection(OllamaConfig.Section));
        services.Configure<AnthropicConfig>(configuration.GetSection(AnthropicConfig.Section));
        services.AddTransient<ClaudeMessageHandler>();

        var llmProvider = configuration["Llm:Provider"] ?? "ollama";
        if (llmProvider.Equals("claude", StringComparison.OrdinalIgnoreCase))
        {
            services.AddHttpClient<ILlmService, ClaudeLlmService>()
                    .AddHttpMessageHandler<ClaudeMessageHandler>()
                    .SetHandlerLifetime(TimeSpan.FromMinutes(10));
        }
        else
        {
            services.AddHttpClient<ILlmService, OllamaService>()
                    .SetHandlerLifetime(TimeSpan.FromMinutes(10));
        }

        services.Configure<WhisperConfig>(configuration.GetSection(WhisperConfig.Section));
        services.Configure<TtsConfig>(configuration.GetSection(TtsConfig.Section));
        services.AddHttpClient<IWhisperService, WhisperHttpService>();
        services.AddSingleton<ITtsService, EdgeTtsService>();
        services.AddHttpClient<IVectorSearchService, ChromaDbService>();
        services.Configure<ObsidianConfig>(configuration.GetSection(ObsidianConfig.Section));
        services.AddSingleton<IObsidianService, ObsidianService>();
        services.AddSingleton<IWorkspaceService, WorkspaceService>();

        return services;
    }
}
