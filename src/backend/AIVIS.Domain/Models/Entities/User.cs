namespace AIVIS.Domain.Models.Entities;

public class User
{
    public string Id { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Gender { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Language { get; set; } = "Korean";
    public string Tone { get; set; } = "casual";
    public List<string> CustomInstructions { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
