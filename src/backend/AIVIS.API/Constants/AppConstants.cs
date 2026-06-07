using AIVIS.Application.Constants;

namespace AIVIS.API.Constants;

public static class AppConstants
{
    public static string GetUserId(this HttpRequest request) =>
        request.Headers.TryGetValue("X-User-Id", out var id) && !string.IsNullOrWhiteSpace(id)
            ? id.ToString()
            : ApplicationConstants.DefaultUserId;
}
