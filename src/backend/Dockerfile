FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app
COPY AIVIS.sln .
COPY AIVIS.Domain/AIVIS.Domain.csproj AIVIS.Domain/
COPY AIVIS.Application/AIVIS.Application.csproj AIVIS.Application/
COPY AIVIS.Infrastructure/AIVIS.Infrastructure.csproj AIVIS.Infrastructure/
COPY AIVIS.API/AIVIS.API.csproj AIVIS.API/
RUN dotnet restore AIVIS.sln
COPY . .
RUN dotnet publish AIVIS.API/AIVIS.API.csproj -c Release -o /publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /publish .
EXPOSE 5050
ENTRYPOINT ["dotnet", "AIVIS.API.dll"]
