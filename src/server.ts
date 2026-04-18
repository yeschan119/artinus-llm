import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.post("/histories", async (req, res) => {
    try {
        const histories = req.body.histories;

        if (!Array.isArray(histories) || histories.length === 0) {
        return res.json({
            success: true,
            summary: "구독 이력이 없습니다."
        });
        }

        const sortedHistories = [...histories].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        const historyText = sortedHistories
        .map((history, index) => {
            return [
            `${index + 1}.`,
            `createdAt=${history.createdAt}`,
            `channelId=${history.channelId}`,
            `action=${history.action}`,
            `fromStatus=${history.fromStatus}`,
            `toStatus=${history.toStatus}`
            ].join(" ");
        })
        .join("\n");

        const response = await openai.responses.create({
            model: "gpt-5",
            reasoning: { effort: "minimal" },
            text: { verbosity: "medium" },
            input: [
                {
                role: "developer",
                content: `
                    너는 구독 이력 요약기다.
                    반드시 모든 이력 항목을 시간 순서대로 1번씩 언급해야 한다.
                    각 문장은 실제 이력 이벤트를 설명해야 한다.
                    출력은 한국어 2~5문장.
                    마지막 문장은 반드시 "현재 최종 상태는 ...입니다." 형식으로 끝내라.

                    이력 해석 규칙:
                    - fromStatus=NONE, toStatus=BASIC/PREMIUM 이면 "가입"
                    - fromStatus=BASIC, toStatus=PREMIUM 이면 "업그레이드"
                    - fromStatus=PREMIUM, toStatus=BASIC 이면 "다운그레이드"
                    - toStatus=NONE 이면 "해지"
                    - channelId가 바뀌면 자연스럽게 함께 언급
                    - 추측 금지
                `.trim()
                },{
                role: "user",
                content: `
                    다음 구독 변경 이력을 요약하라.

                    출력 규칙:
                    - 시간 순서대로 작성
                    - 각 이력 항목을 최소 1번씩 반드시 언급
                    - 2~5문장
                    - 마지막 문장에는 최종 상태 포함

                    상태값 의미:
                    - NONE: 구독 없음
                    - BASIC: 베이직 구독
                    - PREMIUM: 프리미엄 구독

                    이력:
                    ${historyText}
                        `.trim()
                }
            ]
            });

        return res.json({
        success: true,
        summary: response.output_text?.trim() ?? "이력 요약 생성 실패"
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
        success: false,
        summary: "이력 요약 생성 실패"
        });
    }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`LLM server listening on ${port}`);
});