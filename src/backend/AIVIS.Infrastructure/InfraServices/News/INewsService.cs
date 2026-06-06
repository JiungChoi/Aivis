namespace AIVIS.Infrastructure.InfraServices.News;

public interface INewsService
{
    Task<List<NewsItem>> GetByCategoryAsync(string category, CancellationToken ct = default);
}

public record NewsItem(
    string Tag,
    string Title,
    string Source,
    string Time,
    string? Url
);
