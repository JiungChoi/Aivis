namespace AIVIS.Domain.Models.Common;

public class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Message { get; init; }
    public string? ErrorCode { get; init; }

    public static ApiResponse<T> Ok(T data, string? message = null) =>
        new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string errorCode, string message) =>
        new() { Success = false, ErrorCode = errorCode, Message = message };
}

public class ApiResponse : ApiResponse<object>
{
    public static ApiResponse OkResult(string? message = null) =>
        new() { Success = true, Message = message };

    public static ApiResponse FailResult(string errorCode, string message) =>
        new() { Success = false, ErrorCode = errorCode, Message = message };
}
