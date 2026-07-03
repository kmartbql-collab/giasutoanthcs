import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, userApiKey, grade, chatHistory } = await req.json();

    if (!userApiKey) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp Gemini API Key của chính bạn để thực thi công cụ." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: userApiKey });

    // Design a beautiful system instruction based on the student's grade
    const systemInstruction = `Bạn là Gia sư ảo AI tận tâm, thông minh và siêu dễ thương chuyên hỗ trợ học sinh học tập tại Việt Nam.
Hiện tại bạn đang hướng dẫn học sinh đang học ${grade || "Lớp học chưa xác định"}. Hãy điều chỉnh ngôn ngữ, mức độ chi tiết và các ví dụ toán học/học tập phù hợp với lứa tuổi của lớp này.
- Khi giải thích, hãy giải thích chi tiết, dễ hiểu, chia nhỏ từng bước (step-by-step).
- Luôn sử dụng định dạng toán học đẹp mắt: sử dụng kí hiệu $...$ cho các công thức hoặc biến số viết trên cùng dòng (inline math) và ký hiệu $$...$$ cho các khối công thức toán học đứng riêng một dòng (block math).
- Luôn khuyến khích, động viên học sinh học tập, kiên nhẫn trả lời mọi thắc mắc.
- Trả lời bằng tiếng Việt lịch sự, trẻ trung, gần gũi.`;

    const contents = [];

    // Add chat history to build context
    if (chatHistory && chatHistory.length > 0) {
      for (const msg of chatHistory) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }

    // Add the current prompt
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    const replyText = response.text || "Xin lỗi, mình không nhận được phản hồi từ mô hình.";

    return NextResponse.json({ text: replyText });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let errorMessage = "Đã xảy ra lỗi khi giao tiếp với API Gemini.";
    if (error.message && error.message.includes("API_KEY_INVALID")) {
      errorMessage = "API Key Gemini của bạn không hợp lệ. Vui lòng kiểm tra lại cấu hình.";
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
