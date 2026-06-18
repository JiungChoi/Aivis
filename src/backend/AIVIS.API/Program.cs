using System.Text.Json.Serialization;
using AIVIS.API.Routers;
using AIVIS.Application.BackgroundServices;
using AIVIS.Application.Extensions;
using AIVIS.Domain.Services;
using AIVIS.Infrastructure.DatabaseAccess;
using AIVIS.Infrastructure.Extensions;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvFile("../AIVIS.Infrastructure/Environments/Phase1/.env");

var port = builder.Configuration["App:Port"] ?? "5050";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost")
          .AllowAnyHeader()
          .AllowAnyMethod()));

builder.Services.AddOpenApi();

// Minimal API JSON: serialize enums as strings (프론트가 role/status/category 등을 문자열로 기대)
builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddHostedService<MemoryConsolidationService>();

var app = builder.Build();

await app.SeedAsync();

// Ensure the local ~/AIVIS workspace folders exist (idempotent).
await app.Services.GetRequiredService<IWorkspaceService>().InitializeWorkspaceFoldersAsync();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors();
app.MapConversationRoutes();
app.MapUserRoutes();
app.MapVoiceRoutes();
app.MapScheduleRoutes();
app.MapNewsRoutes();
app.MapMemoryRoutes();
app.MapNoteRoutes();
app.MapTodoRoutes();
app.MapObsidianRoutes();
app.MapSuggestionsRoutes();
app.MapKnowledgeRoutes();
app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.Run();
