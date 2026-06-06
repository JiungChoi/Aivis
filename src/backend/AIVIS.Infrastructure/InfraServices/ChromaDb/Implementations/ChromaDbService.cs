namespace AIVIS.Infrastructure.InfraServices.ChromaDb.Implementations;

public class ChromaDbService : IVectorSearchService
{
    private readonly HttpClient _httpClient;

    public ChromaDbService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task UpsertAsync(string id, string text, Dictionary<string, string>? metadata = null, CancellationToken ct = default)
    {
    }

    public async Task<IReadOnlyList<VectorSearchResult>> SearchAsync(string query, int topK = 5, CancellationToken ct = default)
    {
        return [];
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
    }
}
