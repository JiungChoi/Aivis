using System.Text;
using AIVIS.Domain.Models.ConversationQuality;

namespace AIVIS.Domain.Services;

public class ConversationQualityService
{
    public string BuildSystemPrompt(UserPreferences preferences)
    {
        var now = DateTime.Now;
        var sb  = new StringBuilder();

        sb.Append($"당신은 AIVIS, {preferences.Name}님의 개인 AI 어시스턴트입니다. ");
        sb.Append($"항상 {preferences.Language}로 답변하세요. 말투: {preferences.Tone}.");

        if (preferences.CustomInstructions.Count > 0)
        {
            sb.Append(' ');
            sb.Append(string.Join(" ", preferences.CustomInstructions));
        }

        sb.AppendLine();
        sb.AppendLine();
        sb.AppendLine("## 현재 상황");
        sb.AppendLine($"- 현재 날짜/시간: {now:yyyy년 MM월 dd일 (ddd) HH:mm}");

        if (preferences.TodaySchedules.Count > 0)
        {
            sb.AppendLine("- 오늘 남은 일정:");
            foreach (var s in preferences.TodaySchedules)
                sb.AppendLine($"  · {s.StartTime} {s.Title} [{s.Category}]");
        }
        else
        {
            sb.AppendLine("- 오늘 등록된 일정: 없음");
        }

        sb.AppendLine();
        sb.AppendLine("## 도구 사용 규칙");
        sb.AppendLine("다음 상황에서 반드시 제공된 도구를 호출하세요:");
        sb.AppendLine("- 일정 추가/조회/삭제 요청 → create_schedule / get_schedules / delete_schedule");
        sb.AppendLine("- 대화 중 중요한 개인 정보 발견 (선호도, 습관, 계획, 사실 등) → save_memory 자동 호출");
        sb.AppendLine("- 기억 목록 확인 요청 → get_memories");
        sb.AppendLine("- 기억 삭제 요청 → delete_memory");
        sb.AppendLine("- 아이디어, 회의 내용, 메모 저장 요청 → save_note");
        sb.AppendLine("- 노트 검색 요청 → search_notes");
        sb.AppendLine("- 할 일 추가 요청 → create_todo");
        sb.AppendLine("- 할 일 목록 확인 요청 → get_todos");
        sb.AppendLine("- 할 일 완료 처리 요청 → complete_todo");
        sb.AppendLine("도구 실행 후 결과를 사용자에게 간결하게 알려주세요.");

        if (preferences.Memories.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("## 기억된 정보");
            foreach (var m in preferences.Memories)
                sb.AppendLine($"- {m.Key}: {m.Value}");
        }

        return sb.ToString();
    }
}
