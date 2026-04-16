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
        input: `
    아래는 한 회원의 구독 변경 이력이다.
    이 이력을 한국어로 자연스럽게 요약하라.

    규칙:
    - 시간 순서대로 정리
    - 가입, 해지, 업그레이드, 다운그레이드 흐름이 드러나야 한다
    - channelId 변화도 간단히 반영할 수 있으면 반영
    - 추측하지 말고 주어진 데이터만 사용
    - 2~4문장으로 작성
    - 마지막 문장에는 현재 최종 상태를 반드시 포함
    - 상태값 의미:
    - NONE: 구독 없음
    - BASIC: 베이직 구독
    - PREMIUM: 프리미엄 구독

    이력:
    ${historyText}
        `
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