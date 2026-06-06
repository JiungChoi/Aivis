using AIVIS.Domain.Models.Common;
using AIVIS.Infrastructure.InfraServices.News;
using Microsoft.Extensions.Caching.Memory;

namespace AIVIS.API.Routers;

public static class NewsRouter
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(15);

    public static IEndpointRouteBuilder MapNewsRoutes(this IEndpointRouteBuilder app)
    {
        // GET /api/news?category=전체
        app.MapGet("/api/news", async (
            string? category,
            INewsService newsService,
            IMemoryCache cache,
            CancellationToken ct) =>
        {
            var resolvedCategory = string.IsNullOrWhiteSpace(category) ? "전체" : category;
            var cacheKey = $"news:{resolvedCategory}";

            if (cache.TryGetValue<List<NewsItem>>(cacheKey, out var cached) && cached is not null)
                return Results.Ok(ApiResponse<List<NewsItem>>.Ok(cached));

            var items = await newsService.GetByCategoryAsync(resolvedCategory, ct);
            cache.Set(cacheKey, items, CacheDuration);
            return Results.Ok(ApiResponse<List<NewsItem>>.Ok(items));
        });

        return app;
    }
}
