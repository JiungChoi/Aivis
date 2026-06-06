namespace AIVIS.Domain.Enums;

public enum ScheduleCategory
{
    Meeting    = 0,
    Work       = 1,
    CodeReview = 2,
    Rest       = 3,
    Personal   = 4,
    Other      = 5,
}

public static class ScheduleCategoryExtensions
{
    public static string ToKoreanTag(this ScheduleCategory category) => category switch
    {
        ScheduleCategory.Meeting    => "미팅",
        ScheduleCategory.Work       => "작업",
        ScheduleCategory.CodeReview => "코드리뷰",
        ScheduleCategory.Rest       => "휴식",
        ScheduleCategory.Personal   => "개인",
        _                           => "기타",
    };
}
