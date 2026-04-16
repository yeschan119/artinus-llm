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
            한 회원의 구독 변경 이력이다.
            이력을 시간 순서대로 빠짐없이 한국어로 상세히 정리하라.

            규칙:
            - 모든 이력을 반드시 한 줄씩 번호 목록으로 작성
            - 각 이력은 createdAt, channelId, action, fromStatus, toStatus를 반영
            - 상태 변화 의미를 자연스럽게 풀어서 설명
            - 마지막 줄에 반드시 "최종 상태: ..." 작성
            - 추측하지 말고 JSON에 있는 값만 사용

            상태값 의미:
            - NONE: 구독 없음
            - BASIC: 베이직 구독
            - PREMIUM: 프리미엄 구독

            JSON:
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