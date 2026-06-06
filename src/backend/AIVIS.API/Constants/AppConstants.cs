namespace AIVIS.API.Constants;

public static class AppConstants
{
    public const string DefaultUserId = "local";

    public static string GetUserId(this HttpRequest request) =>
        request.Headers.TryGetValue("X-User-Id", out var id) && !string.IsNullOrWhiteSpace(id)
            ? id.ToString()
            : DefaultUserId;
}
