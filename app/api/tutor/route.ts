import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_INSTRUCTION_TEMPLATE = `Bạn là một gia sư Toán tâm huyết, giàu kinh nghiệm, chuyên hỗ trợ học sinh lớp {GRADE} theo chương trình giáo dục phổ thông (SGK mới như Kết nối tri thức, Cánh diều, Chân trời sáng tạo) tại Việt Nam.

MỤC TIÊU GIẢNG DẠY:
- KHÔNG BAO GIỜ giải hộ toàn bộ bài toán ngay lập tức. Nếu học sinh gửi cả bài toán, bạn phải phân tích và hướng dẫn từng bước nhỏ.
- Luôn ưu tiên phương pháp gợi mở, đặt câu hỏi ngắn gọn, trọng tâm để học sinh tự tư duy và trả lời. Giúp học sinh nắm vững bản chất kiến thức, không học vẹt.
- Luôn khích lệ, kiên nhẫn, gần gũi, ấm áp như một người thầy đang giảng bài trực tiếp.

QUY TRÌNH HƯỚNG DẪN:
1. Phân tích đề bài: Xác định rõ dạng toán (ví dụ: tìm x, hình học, chứng minh, bài toán đố...) và các dữ kiện quan trọng đã cho, yêu cầu cần tìm.
2. Xác định phương pháp: Gợi ý công thức, định lý hoặc lý thuyết liên quan trong sách giáo khoa cần áp dụng để giải bài toán.
3. Hướng dẫn từng bước (Step-by-step): 
   - Chia bài toán thành 3-5 bước nhỏ logic.
   - CHỈ thực hiện và hỏi câu hỏi gợi ý cho BƯỚC HIỆN TẠI (trạng thái 'active'). Các bước sau phải để trạng thái 'locked'.
   - Đặt câu hỏi cụ thể để học sinh tự tính toán hoặc xác nhận kết quả của bước đó. Ví dụ: "Em hãy tính xem biểu thức sau bằng bao nhiêu nhé?", "Theo em, điều kiện xác định ở đây là gì?".
   - Khi học sinh trả lời:
     + Nếu đúng: Khen ngợi nhẹ nhàng, cập nhật trạng thái bước đó thành 'completed', chuyển bước tiếp theo sang 'active', giải thích lý do logic của bước tiếp theo và đặt câu hỏi gợi ý tiếp theo.
     + Nếu sai: Không chê trách. Hãy chỉ ra chỗ chưa đúng một cách nhẹ nhàng (ví dụ: "Hình như em nhầm dấu ở chỗ này rồi...", "Hãy xem lại phép tính này xem nhé...") và đặt câu hỏi phụ đơn giản hơn để học sinh tự tìm ra lỗi sai.
4. Tổng kết: Sau khi học sinh hoàn thành bước cuối cùng thành công, hãy chốt lại công thức hoặc kiến thức cốt lõi cần nhớ từ bài toán này (đặt vào trường 'summary' của phản hồi JSON).

QUY TẮC PHẢN HỒI (RẤT QUAN TRỌNG):
- Bạn bắt buộc phải phản hồi dưới dạng JSON khớp hoàn toàn với cấu trúc Schema được cung cấp.
- Tất cả công thức toán học và biểu thức trong 'chatMessage', 'knowledgeBox', 'summary', 'steps' và 'givenData' PHẢI được định dạng bằng LaTeX chuẩn: sử dụng $...$ cho công thức nằm trong dòng (inline math) và $$...$$ cho công thức dòng riêng (block math). Ví dụ: $x^2 - 4x + 4 = 0$ hoặc $\\frac{x}{3} = \\frac{y}{5}$. 
- Đảm bảo các bước trong 'steps' phản ánh đúng lộ trình thực tế, bước đang hỏi phải là 'active', bước đã qua là 'completed', bước chưa tới là 'locked'.`;

export async function POST(req: NextRequest) {
  try {
    const { grade, messages, userApiKey } = await req.json();

    if (!grade) {
      return NextResponse.json({ error: "Missing grade field" }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages should be an array" }, { status: 400 });
    }

    const apiKey = userApiKey || req.headers.get("x-user-api-key");
    if (!apiKey) {
      return NextResponse.json({ 
        error: "Vui lòng cung cấp API Key Gemini của bạn ở mục Đăng nhập / Cài đặt để sử dụng gia sư ảo." 
      }, { status: 400 });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Replace template grade
    const systemInstruction = SYSTEM_INSTRUCTION_TEMPLATE.replace("{GRADE}", grade);

    // Format chat messages to match Google GenAI format (role: "user" | "model")
    const formattedContents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    // Call the Gemini API to generate the tutor's response in structured JSON format
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.2,
        topP: 0.95,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chatMessage: {
              type: Type.STRING,
              description: "Lời thoại khích lệ, gợi mở và câu hỏi của gia sư cho học sinh (sử dụng tiếng Việt, định dạng LaTeX cho công thức toán)."
            },
            boardState: {
              type: Type.OBJECT,
              description: "Thông tin cập nhật bảng sư phạm.",
              properties: {
                problemType: { type: Type.STRING, description: "Dạng toán của bài học." },
                givenData: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING }, 
                  description: "Các dữ kiện quan trọng của đề bài." 
                },
                methods: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING }, 
                  description: "Công thức hoặc lý thuyết liên quan trong sách giáo khoa." 
                },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING, description: "Tên bước giải (ví dụ: 'Bước 1: Tìm ĐKXĐ')." },
                      status: { 
                        type: Type.STRING, 
                        description: "Trạng thái bước giải: 'completed' (đã hoàn thành), 'active' (đang thực hiện), 'locked' (chưa thực hiện)." 
                      },
                      explanation: { type: Type.STRING, description: "Giải thích ngắn gọn lý do/tư duy cho bước này." }
                    },
                    required: ["label", "status", "explanation"]
                  }
                },
                knowledgeBox: { 
                  type: Type.STRING, 
                  description: "Gợi ý hoặc định nghĩa SGK tương ứng với bước hiện tại." 
                },
                summary: { 
                  type: Type.STRING, 
                  description: "Tổng kết công thức hoặc kiến thức cốt lõi (chỉ hiển thị khi đã hoàn thành bài toán)." 
                },
                isCompleted: { 
                  type: Type.BOOLEAN, 
                  description: "True nếu học sinh đã hoàn thành và hiểu xong bài toán." 
                }
              },
              required: ["problemType", "givenData", "methods", "steps", "knowledgeBox", "isCompleted"]
            }
          },
          required: ["chatMessage", "boardState"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsedData = JSON.parse(responseText.trim());
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("Gemini Tutor API Error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi liên lạc với gia sư ảo. Vui lòng thử lại sau.", details: error.message },
      { status: 500 }
    );
  }
}
