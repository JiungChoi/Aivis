using AIVIS.API.Constants;
using AIVIS.Domain.Models.Common;
using AIVIS.Domain.Models.Entities;
using AIVIS.Domain.Repositories;

namespace AIVIS.API.Routers;

public static class UserRouter
{
    public static IEndpointRouteBuilder MapUserRoutes(this IEndpointRouteBuilder app)
    {
        // GET /api/users/me
        app.MapGet("/api/users/me", async (
            HttpContext ctx,
            IUserRepository userRepository,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var user = await userRepository.GetByIdAsync(userId, ct);
            if (user is null)
                return Results.NotFound(ApiResponse.FailResult("NOT_FOUND", "User not found"));

            return Results.Ok(ApiResponse<object>.Ok(ToDto(user)));
        });

        // POST /api/users/init — upsert: create if not exists, return existing otherwise
        app.MapPost("/api/users/init", async (
            HttpContext ctx,
            InitUserRequest request,
            IUserRepository userRepository,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var existing = await userRepository.GetByIdAsync(userId, ct);

            if (existing is not null)
                return Results.Ok(ApiResponse<object>.Ok(ToDto(existing)));

            var now = DateTime.UtcNow;
            var user = new User
            {
                Id        = userId,
                Name      = request.Name ?? "사용자",
                Gender    = request.Gender ?? "미설정",
                Phone     = request.Phone ?? string.Empty,
                Email     = request.Email ?? string.Empty,
                Language  = "Korean",
                Tone      = "casual",
                CreatedAt = now,
                UpdatedAt = now,
            };

            await userRepository.CreateAsync(user, ct);
            return Results.Ok(ApiResponse<object>.Ok(ToDto(user)));
        });

        // PUT /api/users/me — update profile
        app.MapPut("/api/users/me", async (
            HttpContext ctx,
            UpdateUserRequest request,
            IUserRepository userRepository,
            CancellationToken ct) =>
        {
            var userId = ctx.Request.GetUserId();
            var user = await userRepository.GetByIdAsync(userId, ct);

            if (user is null)
                return Results.NotFound(ApiResponse.FailResult("NOT_FOUND", "User not found"));

            if (request.Name is not null)     user.Name     = request.Name;
            if (request.Email is not null)    user.Email    = request.Email;
            if (request.Gender is not null)   user.Gender   = request.Gender;
            if (request.Tone is not null)     user.Tone     = request.Tone;
            if (request.Language is not null) user.Language = request.Language;
            user.UpdatedAt = DateTime.UtcNow;

            await userRepository.UpdateAsync(user, ct);
            return Results.Ok(ApiResponse<object>.Ok(ToDto(user)));
        });

        // Legacy: GET /api/users/{userId}
        app.MapGet("/api/users/{userId}", async (
            string userId,
            IUserRepository userRepository,
            CancellationToken ct) =>
        {
            var user = await userRepository.GetByIdAsync(userId, ct);
            if (user is null)
                return Results.NotFound(ApiResponse.FailResult("NOT_FOUND", "User not found"));

            return Results.Ok(ApiResponse<object>.Ok(ToDto(user)));
        });

        return app;
    }

    private static object ToDto(User u) => new
    {
        u.Id,
        u.Name,
        u.Gender,
        u.Email,
        u.Language,
        u.Tone,
        u.CreatedAt,
        u.UpdatedAt,
    };
}

public record InitUserRequest(string? Name, string? Gender, string? Phone, string? Email);
public record UpdateUserRequest(string? Name, string? Gender, string? Email, string? Tone, string? Language);
