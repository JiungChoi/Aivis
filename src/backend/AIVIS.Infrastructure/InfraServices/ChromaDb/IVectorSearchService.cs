namespace AIVIS.Infrastructure.InfraServices.ChromaDb;

public interface IVectorSearchService
{
    Task UpsertAsync(string id, string text, Dictionary<string, string>? metadata = null, CancellationToken ct = default);
    Task<IReadOnlyList<VectorSearchResult>> SearchAsync(string query, int topK = 5, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
}

public record VectorSearchResult(string Id, string Text, float Score, Dictionary<string, string> Metadata);
