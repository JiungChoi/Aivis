using System.Globalization;
using System.Xml.Linq;

namespace AIVIS.Infrastructure.InfraServices.News;

public class NewsService(HttpClient httpClient) : INewsService
{
    // category → list of RSS feed URLs
    private static readonly Dictionary<string, string[]> CategoryFeeds = new()
    {
        ["전체"] = new[]
        {
            "https://hnrss.org/newest?q=AI+LLM",
            "https://feeds.bbci.co.uk/news/business/rss.xml",
            "https://feeds.bbci.co.uk/news/world/rss.xml",
        },
        ["경영·경제"] = new[]
        {
            "https://www.hankyung.com/feed/economy",
            "https://feeds.bbci.co.uk/news/business/rss.xml",
        },
        ["AI·에이전트"] = new[]
        {
            "https://hnrss.org/newest?q=AI+LLM",
        },
        ["기술"] = new[]
        {
            "https://hnrss.org/newest?q=technology",
        },
        ["글로벌"] = new[]
        {
            "https://feeds.bbci.co.uk/news/world/rss.xml",
        },
    };

    // category → display tag for items
    private static readonly Dictionary<string, string> CategoryTags = new()
    {
        ["전체"] = "전체",
        ["경영·경제"] = "경제",
        ["AI·에이전트"] = "AI",
        ["기술"] = "기술",
        ["글로벌"] = "글로벌",
    };

    public async Task<List<NewsItem>> GetByCategoryAsync(string category, CancellationToken ct = default)
    {
        if (!CategoryFeeds.TryGetValue(category, out var feeds))
            feeds = CategoryFeeds["전체"];

        var tasks = feeds.Select(url => FetchFeedSafelyAsync(url, ct)).ToArray();
        var results = await Task.WhenAll(tasks);

        var defaultTag = CategoryTags.GetValueOrDefault(category, "뉴스");
        var items = new List<NewsItem>();
        foreach (var feedItems in results)
        {
            // For "전체" take top 3 from each feed
            var take = category == "전체" ? 3 : 10;
            items.AddRange(feedItems.Take(take).Select(i => i with { Tag = ResolveTagForCategory(category, i.Source, defaultTag) }));
        }

        // Sort by recency: items with parseable pubDate first
        return items.Take(20).ToList();
    }

    private async Task<List<NewsItem>> FetchFeedSafelyAsync(string url, CancellationToken ct)
    {
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(8));

            using var response = await httpClient.GetAsync(url, cts.Token);
            if (!response.IsSuccessStatusCode) return new List<NewsItem>();

            var xml = await response.Content.ReadAsStringAsync(cts.Token);
            return ParseRss(xml);
        }
        catch
        {
            return new List<NewsItem>();
        }
    }

    private static List<NewsItem> ParseRss(string xml)
    {
        var doc = XDocument.Parse(xml);

        // RSS 2.0 has <channel><item>; Atom has <feed><entry>
        var channelTitle = doc.Descendants("channel").FirstOrDefault()?.Element("title")?.Value
                          ?? doc.Descendants().FirstOrDefault(e => e.Name.LocalName == "title")?.Value
                          ?? "RSS";

        var items = doc.Descendants()
            .Where(e => e.Name.LocalName == "item" || e.Name.LocalName == "entry")
            .Select(item =>
            {
                var title = item.Elements().FirstOrDefault(e => e.Name.LocalName == "title")?.Value?.Trim() ?? "";
                var link = item.Elements().FirstOrDefault(e => e.Name.LocalName == "link")?.Value?.Trim()
                          ?? item.Elements().FirstOrDefault(e => e.Name.LocalName == "link")?.Attribute("href")?.Value
                          ?? "";
                var pubDate = item.Elements().FirstOrDefault(e => e.Name.LocalName == "pubDate")?.Value
                             ?? item.Elements().FirstOrDefault(e => e.Name.LocalName == "published")?.Value
                             ?? item.Elements().FirstOrDefault(e => e.Name.LocalName == "updated")?.Value
                             ?? "";
                return new NewsItem(
                    Tag: "뉴스",
                    Title: title,
                    Source: channelTitle,
                    Time: FormatRelativeTime(pubDate),
                    Url: string.IsNullOrWhiteSpace(link) ? null : link
                );
            })
            .Where(i => !string.IsNullOrWhiteSpace(i.Title))
            .ToList();

        return items;
    }

    private static string FormatRelativeTime(string pubDate)
    {
        if (string.IsNullOrWhiteSpace(pubDate)) return "";
        if (!DateTimeOffset.TryParse(pubDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dt))
            return "";

        var delta = DateTimeOffset.UtcNow - dt.ToUniversalTime();
        if (delta.TotalMinutes < 1) return "방금";
        if (delta.TotalMinutes < 60) return $"{(int)delta.TotalMinutes}m";
        if (delta.TotalHours < 24) return $"{(int)delta.TotalHours}h";
        return $"{(int)delta.TotalDays}d";
    }

    private static string ResolveTagForCategory(string category, string source, string defaultTag)
    {
        if (category != "전체") return defaultTag;

        // 전체: derive tag from source name
        if (source.Contains("Hacker", StringComparison.OrdinalIgnoreCase)) return "AI";
        if (source.Contains("Business", StringComparison.OrdinalIgnoreCase) || source.Contains("경제", StringComparison.OrdinalIgnoreCase) || source.Contains("한국경제", StringComparison.OrdinalIgnoreCase)) return "경제";
        if (source.Contains("BBC", StringComparison.OrdinalIgnoreCase) || source.Contains("World", StringComparison.OrdinalIgnoreCase)) return "글로벌";
        return "뉴스";
    }
}
