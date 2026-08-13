import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini client lazily to avoid crashing on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API router
  app.post("/api/lesson-plan", async (req, res) => {
    try {
      const { age, field, activity, lessonType, theme, topic, integrate, extra, materials, adjustRequest, lessonSampleName, lessonSampleContent, attachmentNames, attachmentContent } = req.body;

      if (!theme || !topic) {
        return res.status(400).json({ error: "Vui lòng cung cấp Chủ đề và Đề tài." });
      }

      const ai = getGeminiClient();
      
      const searchStr = (integrate && Array.isArray(integrate)) ? integrate.join(", ").toUpperCase() : (typeof integrate === "string" ? integrate.toUpperCase() : "");
      const extraStr = extra ? extra.toUpperCase() : "";
      
      const hasSteam = searchStr.includes("STEAM") || extraStr.includes("STEAM");
      const hasEdp = searchStr.includes("EDP") || extraStr.includes("EDP");
      const isTraditional = !hasSteam && !hasEdp;

      const fieldLower = (field || "").toLowerCase();
      const activityLower = (activity || "").toLowerCase();
      const topicLower = (topic || "").toLowerCase();
      const ageLower = (age || "").toLowerCase();

      const isToddler = ageLower.includes("nhà trẻ") || 
                        ageLower.includes("tháng") || 
                        ageLower.includes("24-36") || 
                        ageLower.includes("18-24") || 
                        ageLower.includes("nursery");

      const isPhysicalEducation = fieldLower.includes("thể chất") || 
                                  activityLower.includes("thể chất") || 
                                  activityLower.includes("thể dục") || 
                                  topicLower.includes("bò") || 
                                  topicLower.includes("chạy") || 
                                  topicLower.includes("ném") || 
                                  topicLower.includes("nhảy") || 
                                  topicLower.includes("bật") || 
                                  topicLower.includes("bình đông") || 
                                  topicLower.includes("vận động");

      let samplePromptPart = "";
      if (lessonSampleName) {
        samplePromptPart = `
- Giáo án mẫu tham khảo tải lên từ Giáo viên: ${lessonSampleName}
Nội dung giáo án tham khảo:
"""
${lessonSampleContent}
"""

Nếu có giáo án mẫu tham khảo được tải lên ở trên:
- Ưu tiên học theo bố cục của giáo án này.
- Học theo văn phong truyền tải.
- Học theo cách trình bày, cách ký hiệu, bóc tách và phân bổ thời gian của giáo án mẫu.
- Học theo mức độ chi tiết sư phạm trong các lời thoại trò chuyện và hướng dẫn.
- Đảm bảo vẫn biên soạn kế hoạch giảng dạy hoàn toàn mới phù hợp với Đề tài hiện tại ("${topic}") và chủ đề chính, không sao chép nguyên văn hoàn toàn, và tuyệt đối giữ chuẩn giáo dục mầm non Việt Nam hiện hành.
`;
      }

      let attachmentPromptPart = "";
      if (attachmentNames && attachmentNames.length > 0) {
        attachmentPromptPart = `
- Các tài liệu đính kèm từ Giáo viên: ${attachmentNames.join(", ")}
${attachmentContent || ""}

Nếu có tài liệu đính kèm:
- ưu tiên tham khảo nội dung liên quan
- giữ đúng chuẩn giáo dục mầm non Việt Nam
- không sao chép nguyên văn hoàn toàn
- kết hợp linh hoạt với yêu cầu hiện tại
- tối ưu giáo án thực tế, dễ áp dụng
`;
      }

      const prompt = `
Bạn là trợ lý soạn giáo án mầm non. Khi nhận thông tin từ người dùng, hãy tạo giáo án theo đúng cấu trúc yêu cầu. Kết quả trả về bắt buộc là JSON hợp lệ, không có markdown, không có HTML, không có giải thích bên ngoài JSON. Tất cả chuỗi phải đặt trong dấu ngoặc kép, không dùng dấu phẩy thừa.

THÔNG TIN BÀI DẠY:
- Độ tuổi dải học sinh: ${age}
- Lĩnh vực phát triển chính: ${field}
- Hoạt động học: ${activity}
- Chủ đề lớn: ${theme}
- Đề tài chi tiết bài dạy: ${topic}
- Loại tiết học: ${lessonType}
- Phương pháp / định hướng tích hợp thêm: ${integrate || "Không tích hợp thêm"}
- Yêu cầu bổ sung nâng cao của giáo viên: ${extra || "Không có"}
- Gợi ý học liệu, hình ảnh cho bài dạy: ${materials || "Gemini tự gợi ý học liệu, tranh ảnh, video, thẻ học tập, mô hình, đồ dùng trực quan phù hợp với đề tài và độ tuổi"}
- Yêu cầu điều chỉnh / bổ sung khác: ${adjustRequest || "Không có yêu cầu điều chỉnh thêm"}
${samplePromptPart}
${attachmentPromptPart}

Nếu người dùng nhập yêu cầu điều chỉnh hoặc chỉnh sửa giáo án, hãy ưu tiên thực hiện chính xác yêu cầu đó nhưng vẫn giữ nguyên:
- đúng độ tuổi
- đúng lĩnh vực phát triển
- đúng hoạt động học
- đúng chủ đề
- đúng đề tài
- đúng chuẩn giáo dục mầm non Việt Nam hiện hành
- giữ nguyên bố cục giáo án chuẩn

QUY TẮC ĐỊNH DẠNG VÀ TRÌNH BÀY GIÁO ÁN BẮT BUỘC (PHẢI TUÂN THỦ TUYỆT ĐỐI):
1. BỐ CỤC CHUNG VÀ THÔNG TIN BÀI DẠY:
- PHẦN THÔNG TIN CHUNG PHẢI TRÌNH BÀY MỖI NỘI DUNG TRÊN MỘT DÒNG RIÊNG BIỆT (Không được phép viết gộp hay viết liền nhiều nội dung trên cùng một dòng).
  Đảm bảo ở phần mở đầu của giáo án xuất hiện dòng chữ theo mẫu định dạng dọc này:
  CHỦ ĐỀ: [Tên chủ đề xuất đúng theo thông tin bài dạy dọn sẵn]
  ĐỀ TÀI: [Tên đề tài dạy dọn sẵn]
  LĨNH VỰC: [Lĩnh vực chính tương ứng]
  ĐỘ TUỔI: [Nhóm tuổi áp dụng]
  THỜI GIAN: [Thời gian phút tự động xác định]
  NGÀY DẠY: ……………
  GIÁO VIÊN: ……………
  (Tuyệt đối xuống dòng riêng từng nội dung trên, không gộp liền, để dễ đọc, dễ in và dễ chỉnh sửa).

- TỰ ĐỘNG XÁC ĐỊNH THỜI GIAN DỰ KIẾN PHÙ HỢP THEO ĐỘ TUỔI để điền vào mục 'THỜI GIAN' phía trên:
  + Nhóm Nhà trẻ 24-36 tháng: 12 - 15 phút
  + Nhóm Mẫu giáo 3-4 tuổi: 20 - 25 phút
  + Nhóm Mẫu giáo 4-5 tuổi: 25 - 30 phút
  + Nhóm Mẫu giáo 5-6 tuổi: 30 - 35 phút
  + Nếu là hoạt động trải nghiệm, bài dạy STEAM, bài dạy STEM, dự án hoặc tiết thao giảng dạy: Hãy tự động tăng thêm 5 - 10 phút so với mốc tiêu chuẩn trên của độ tuổi tương ứng (ví dụ: STEAM lớp 4-5 tuổi thì ghi là "30 - 35 phút" hoặc "35 - 40 phút").

- KHI XUẤT GIÁO ÁN VÀ KHÁI QUÁT:
  + Không để các đoạn văn quá dài. Mỗi ý tưởng hoặc hướng dẫn sư phạm phải được xuống dòng riêng biệt, rõ ràng.
  + Không tự động gộp dòng, không tự động dồn nội dung vào một dòng dài. Ưu tiên giữ đúng định dạng giáo án mầm non truyền thống của Phòng Giáo dục để giáo viên dễ in ấn ngay.
  + Không chèn dòng trắng hay khoảng trống rỗng thừa vô ích giữa các dòng. Thiết lập khoảng cách trước và sau đoạn sát sao, nhưng các nội dung phải liên tục xuống dòng đầy đủ và khoa học.

2. QUY ĐỊNH TIÊU ĐỀ MỤC LỚN BẮT BUỘC (VIẾT IN HOA, IN ĐẬM):
- Các mục lớn bắt buộc phải VIẾT HOA TOÀN BỘ và IN ĐẬM (dùng ký pháp markdown "**") và luôn đứng ở dòng riêng biệt.
- Danh sách 4 tiêu đề mục lớn bắt buộc gồm:
  **I. MỤC ĐÍCH - YÊU CẦU:**
  **II. CHUẨN BỊ:**
  **III. TỔ CHỨC HOẠT ĐỘNG:**
  **IV. ĐÁNH GIÁ CUỐI HOẠT ĐỘNG:**
- Tất cả các dạng giáo án môn học đều phải xuất đầy đủ và chính xác theo cấu trúc 4 mục lớn trên.

3. QUY ĐỊNH MỤC NHỎ:
- Các mục nhỏ dưới đây viết in đậm (dùng ký pháp markdown "**"), và luôn xuống dòng riêng biệt (không viết liền văn bản ở cùng dòng tiêu đề):
  **1. Kiến thức:**
  **2. Kỹ năng:**
  **3. Thái độ:**
  **1. Hoạt động mở đầu:**
  **2. Hoạt động trọng tâm:**
  **3. Hoạt động kết thúc:**
  - Tuyệt đối giữ nguyên kiểu viết đậm và xếp các đề mục nhỏ này đứng ở một dòng độc lập để giáo viên dễ quan sát.

4. ĐIỀU CHỈNH ĐỊNH DẠNG BẢNG "HOẠT ĐỘNG CỦA CÔ - HOẠT ĐỘNG CỦA TRẺ" (CHUẨN KHÔNG CÓ LẶP LẠI TIÊU ĐỀ):
- Toàn bộ tiến trình hoạt động tương tác giữa cô và trẻ trong mục "**III. TỔ CHỨC HOẠT ĐỘNG:**" bắt buộc phải được trình bày trong MỘT BẢNG 2 CỘT bằng cú pháp bảng MarkDown.
- Bảng này bắt buộc phải có cấu trúc như sau:
  + Trong toàn bộ giáo án chỉ được phép tạo DUY NHẤT MỘT LẦN dòng tiêu đề bảng ở đầu bảng:
    | HOẠT ĐỘNG CỦA CÔ | HOẠT ĐỘNG CỦA TRẺ |
    |---|---|
  + Tuyệt đối KHÔNG ĐƯỢC tạo thêm bảng mới, không chia thành nhiều bảng nhỏ, không lặp lại dòng tiêu đề cột trên khi nội dung chuyển sang trang mới hay phần sự vụ mới. Toàn bộ tiến trình hoạt động là một thể liền mạch trong đúng một bảng duy nhất.
  + Toàn bộ nội dung chi tiết bài dạy của cô phải nằm liên tục trong cùng một ô bên trái (ô nội dung của cột 1).
  + Toàn bộ phản hồi, hành động dự kiến hay câu trả lời của trẻ tương ứng phải nằm liên tục trong cùng một ô bên phải (ô nội dung của cột 2).
  + Bảng CHỈ ĐƯỢC CÓ đúng 1 hàng tiêu đề đầu tiên và đúng 1 HÀNG NỘI DUNG DUY NHẤT ở bên dưới. Tuyệt đối không chia thành nhiều hàng ngang hay phân tách các hoạt động thành các hàng riêng biệt.
  + Để xuống dòng ngăn cách giữa các hoạt động hoặc xuống dòng ghi nội dung trong cùng một ô hoạt động, BẮT BUỘC sử dụng thẻ "<br>" (hoặc nhiều thẻ "<br>" nếu cần) trong Markdown để phân tách các ý, các đoạn, các hoạt động một cách rõ ràng và đẹp mắt, không để khoảng trắng trống thừa.
  + Trong ô hoạt động của cô (ô trái), trình bày lần lượt các hoạt động và ghi rõ tiêu đề bằng chữ viết hoa, in đậm (ví dụ: "**1. Hoạt động mở đầu:**", "**2. Hoạt động trọng tâm:**", "**3. Hoạt động kết thúc:**" hoặc "**HOẠT ĐỘNG 1: ...**", "**HOẠT ĐỘNG 2: ...**") làm tiêu mốc lớn. Các mục nhỏ hơn bên trong viết chữ thường, in đậm (ví dụ: "**a. Tiến trình thực hiện:**").
  + Trong ô hoạt động của trẻ (ô phải), trình bày toàn bộ các nội dung phản ứng tương ứng của trẻ, bám sát các Hoạt động 1, 2, 3 của cô nằm gọn trong cùng một ô này, không chia hàng ngang.
- Ví dụ mẫu định dạng cú pháp MarkDown chuẩn bắt buộc (Chú ý dùng thẻ <br> để xuống dòng nội bộ trong ô):
| HOẠT ĐỘNG CỦA CÔ | HOẠT ĐỘNG CỦA TRẺ |
|---|---|
| **1. Hoạt động mở đầu** <br> Cô xúm xít trẻ lại gần, giới thiệu hộp quà bí mật... <br><br> **2. Hoạt động trọng tâm** <br> **a. Tiến trình hoạt động:** <br> Cô hướng dẫn trẻ làm mẫu... <br><br> **3. Hoạt động kết thúc** <br> Cô cho trẻ thu dọn đồ chơi nhẹ nhàng... | Trẻ xúm xít quanh cô và háo hức chờ đợi món quà. <br><br> Trẻ chú ý quan sát cô làm mẫu. <br><br> Trẻ cùng cô thu dọn đồ chơi gọn gàng. |
- Nghiêm cấm tạo thêm bất kỳ hàng ngang nào khác dưới bảng. Tất cả mọi thứ phải nằm trọn vẹn trong đúng 1 ô duy nhất cho cô và 1 ô duy nhất cho trẻ. Không viết tự do ngoài bảng đối với phần tiến trình.
- Áp dụng thống nhất mẫu bảng duy nhất này cho tất cả giáo án (Nhà trẻ, 3-4 tuổi, 4-5 tuổi, 5-6 tuổi, mọi lĩnh vực, mọi hoạt động học, mọi giáo án thao giảng, dự thi, STEM, STEAM, AI).

5. QUY ĐỊNH NGHIÊM NGẶT VỀ DẤU GẠCH ĐẦU DÒNG (KHÔNG DÙNG BULLET):
- TUYỆT ĐỐI KHÔNG SỬ DỤNG DANH SÁCH BULLET HOẶC KÝ TỰ CHẤM TRÒN, Ô VUÔNG: Nghiêm cấm hoàn toàn tất cả các ký tự như "•", "○", "●", "◦", "▪", "♦", "▫" cả trong Markdown lẫn khi xuất văn bản.
- CHỈ SỬ DỤNG DUY NHẤT DẤU GẠCH NGANG TRƠN ĐƠN GIẢN ("-") ở đầu mỗi ý nhỏ (Ví dụ: "- Trẻ nhận biết...", "- Rèn kỹ năng...", "- Hứng thú tham gia...").
- Quy tắc này bắt buộc áp dụng cho TẤT CẢ giáo án (Nhà trẻ, 3-4 tuổi, 4-5 tuổi, 5-6 tuổi, mọi lĩnh vực, mọi môn học, mọi chủ đề, mọi hoạt động, mọi giáo án thường, giáo án thao giảng, giáo án dự thi, giáo án tích hợp STEM, STEAM, AI, Chuyển đổi số...).
- Tất cả các mục dưới đây khi liệt kê các ý nhỏ đều phải sử dụng gạch ngang "-":
  + I. Mục đích - yêu cầu (Kiến thức, Kỹ năng, Thái độ)
  + II. Chuẩn bị
  + III. Tổ chức hoạt động (Nội dung hoạt động của cô, Hoạt động của trẻ bên trong bảng)
  + IV. Đánh giá cuối hoạt động
  + * Các phần phụ như: Gợi ý học liệu, Sáng kiến sáng tạo, Nội dung tích hợp, STEM, STEAM, AI, Chuyển đổi số...
- Không sử dụng các tính năng tạo danh sách tự động của Word/Markdown mà hãy tự gõ dấu gạch ngang "-" và dấu cách thủ công ở đầu dòng để khi xuất ra file Word hiển thị đẹp nhất dưới dạng ký tự gạch ngang thuần túy.

6. QUY ĐỊNH KHÁC:
- Không chèn dòng trống thừa giữa các đoạn, dòng thừa rỗng.
- Các mục bổ sung (như Gợi ý nhạc nền, Gợi ý câu hỏi mở...) nếu có hãy đặt ở phía cuối, hoàn toàn nằm ngoài 4 mục chính yếu trên.

7. QUY QUY ĐỊNH LÀM NỔI BẬT NỘI DUNG CÔNG NGHỆ, ĐIỆN TỬ, CHUYỂN ĐỔI SỐ VÀ STEM/STEAM:
- Đối với tất cả giáo án được tạo ra từ hệ thống, bất kể độ tuổi, chủ đề, lĩnh vực, môn học, loại tiết, giáo án thường, thao giảng, dự thi... các nội dung liên quan đến:
  + AI
  + Trí tuệ nhân tạo
  + Chuyển đổi số
  + Năng lực số
  + Công nghệ số
  + STEM
  + STEAM
  + Học liệu số
  + Slide tương tác
  + Video học liệu
  + Thiết bị số
  + Trò chơi tương tác
  + Ứng dụng công nghệ
  bắt buộc phải được tự động làm nổi bật bằng cách vừa IN ĐẬM vừa IN NGHIÊM để giáo viên dễ nhận biết.
- Trong văn bản phản hồi, hãy viết các cụm từ, câu hoặc phần này sử dụng cú pháp markdown: \`**_Nội dung..._**\` (hoặc \`**_*Nội dung...*_**\`), để hệ thống bóc tách tự động và hiển thị chữ màu xanh dương đậm trong ứng dụng trực tuyến và cả khi tải về file Word/PDF.
- Ví dụ mẫu bắt buộc:
  + **_Ứng dụng AI: Trẻ quan sát hình ảnh mô phỏng vòng đời con bướm trên màn hình tương tác._**
  + **_Chuyển đổi số: Trẻ tham gia trò chơi nhận biết các giai đoạn phát triển của bướm trên slide tương tác._**
  + **_Hoạt động STEM: Trẻ tạo mô hình vòng đời của bướm bằng nguyên vật liệu tái chế._**

${isToddler ? `
YÊU CẦU & BỐ CỤC CHUẨN GIÁO ÁN NHÀ TRẺ (24-36 THÁNG) GIỐNG 100% PHƯƠNG PHÁP BIÊN SOẠN SƯ PHẠM MẪU:
Dành riêng cho đối tượng Nhà trẻ 24-36 tháng tuổi, thời gian của hoạt động học bắt buộc từ 12-15 phút.
Hãy tự động phát hiện Môn học / Lĩnh vực phát triển của bài dạy hiện tại và áp dụng đúng 100% bố cục tương ứng dưới đây. Tuyệt đối không thêm bớt, không đảo lộn và không thay thế cách bố trí hay tên đề mục.

CHỌN ĐÚNG 1 TRONG CÁC KHUNG BỐ CỤC DƯỚI ĐÂY PHÙ HỢP VỚI MÔN HỌC / HOẠT ĐỘNG THỨC TẾ ĐANG CHỌN:

--------------------------------------------------
DẠNG 1: LĨNH VỰC PHÁT TRIỂN THỂ CHẤT (VẬN ĐỘNG)
(Áp dụng khi Lĩnh vực là "Phát triển thể chất" hoặc Hoạt động học có liên quan đến Thể dục, Vận động như bò, chạy, ném, nhảy, đi...)

BỐ CỤC GIÁO ÁN BẮT BUỘC GIỐNG 100% MẪU:

LĨNH VỰC PHÁT TRIỂN THỂ CHẤT (VẬN ĐỘNG)
BTPTC: [TÊN BÀI TẬP PHÁT TRIỂN CHUNG IN HOA]
VĐCB: [TÊN VẬN ĐỘNG CƠ BẢN IN HOA]

1. Hoạt động 1: Khởi động (khoảng 1-2 phút)
- Cho trẻ đi kết hợp các kiểu đi: Đi thường – chạy chậm – chạy nhanh - chạy chậm – đi thường – dừng lại, chuyển đội hình.

2. Hoạt động 2: Trọng động (khoảng 12-16 phút)

a. Bài tập phát triển chung
- Nhịp hô: 1, 2 (Nếu động tác nhấn mạnh thì 4l x2n, động tác khác thì 3lx2n)
(Cô bật nhạc bài hát vui bám sát đề tài để trẻ tập hăng say)
+ Động tác 1: [Mô tả chi tiết động tác tay]
+ Động tác 2: [Mô tả chi tiết động tác chân]
+ Động tác 3: [Mô tả chi tiết động tác bụng/lườn]
+ Động tác 4: [Mô tả chi tiết động tác bật nhảy]

b. Vận động cơ bản
- Cô giới thiệu tên vận động
- Cô làm mẫu ít nhất 2 lần:
+ Lần 1: không phân tích
- Cho trẻ quan sát. (Dòng này đứng riêng độc lập, không có dấu cộng ở đầu dòng)
+ Lần 2: Phân tích rõ ràng, chi tiết cụ thể, đúng kỹ thuật.

c. Trẻ thực hiện
- Cô mời 1 trẻ khá tập trước
- Lần lượt cho trẻ tập (Tập lần lượt từng trẻ, nhóm trẻ)
- Tổ thi đua (nếu học sinh thực hiện tốt)
=> Cô quan sát sửa sai cho trẻ...
- Hỏi trẻ tên bài.

d. Trò chơi
- Cô giới thiệu tên trò chơi: [Tên trò chơi vận động phù hợp]
- Cô hướng dẫn cách chơi: ( Nêu trẻ ko biết cô chơi trước )
- Cô cho trẻ chơi 2-3 lần ( Cô chơi cùng trẻ để bao quát trẻ )

3. Hồi tĩnh (khoảng 1-2 phút)
Cô cho trẻ đi nhẹ nhàng 1-2 vòng quanh sân tập rồi cho trẻ nghỉ.

* Lưu ý sư phạm khi soạn bài:
- Với bài tập 1 vận động có trò chơi;
- Với bài tập 2 vận động cơ bản: 01 vận động mới (vận động trẻ chưa thành thạo) và 01 vận động ôn luyện thực hiện dưới hình thức trò chơi. Lưu ý, hai vận động không cùng một dạng vận động mà thực hiện kết hợp, ví dụ: đi-bò; chạy – ném hoặc tung.


--------------------------------------------------
DẠNG 2: MÔN ÂM NHẠC (Thuộc Lĩnh vực Thẩm mỹ hoặc Tình cảm kỹ năng xã hội)
(Bao gồm các hoạt động Dạy hát, Vận động theo nhạc, Nghe hát cho nhóm tuổi 24-36 tháng)

Hãy tự động chia thành 3 tiểu dạng dựa trên kiểu bài dạy âm nhạc được chọn:

Tiểu dạng A: Dạng hoạt động dạy hát (với Dạy hát là Hoạt động trọng tâm HĐTT, Trò chơi âm nhạc là Nội dung kết hợp NDKH)
BỐ CỤC GIÁO ÁN BẮT BUỘC:

II. PHÁT TRIỂN TÌNH CẢM KỸ NĂNG XÃ HỘI VÀ THẨM MỸ
2.1. MÔN ÂM NHẠC
2.1.1. Dạng hoạt động dạy hát
- Dạy hát (HĐTT)
- Trò chơi âm nhạc (NDKH)

TIẾN TRÌNH CHI TIẾT:
1: Trò chuyện giới thiệu bài
2: Dạy hát: [Tên bài hát]
- Cô hát cho trẻ nghe 2 lần
- Lần 2 kết hợp vỗ tay minh hoạ cho bài hát
* Dạy trẻ hát (Cho cả lớp, tổ, nhóm, cá nhân hát thi đua, cô chú ý sửa ngọng)
- Hỏi trẻ tên bài hát
3: Trò chơi
- Cô giới thiệu tên dụng cụ âm nhạc/hoặc tên trò chơi
- Cô chơi mẫu cho trẻ xem 1 lần
- Tổ chức cho trẻ chơi
- Hỏi trẻ tên trò chơi
4: Kết thúc

Tiểu dạng B: Dạng hoạt động vận động theo nhạc (Với Vận động theo nhạc là Nội dung trọng tâm NDTT, Nghe nhạc/Nghe hát là Nội dung kết hợp NDKH)
BỐ CỤC GIÁO ÁN BẮT BUỘC:

II. PHÁT TRIỂN TÌNH CẢM KỸ NĂNG XÃ HỘI VÀ THẨM MỸ
2.1. MÔN ÂM NHẠC
2.1.2. Hoạt động vận động theo nhạc
- Vận động theo nhạc (NDTT)
- Nghe nhạc/Nghe hát (NDKH)

TIẾN TRÌNH CHI TIẾT:
1: Trò chuyện gây hứng thú
2: Dạy vận động
- Cô bằng các hình thức gợi mở cho trẻ đoán tên bài hát để dạy vận động.
- Cô cho trẻ hát lại bài hát 1-2 lần
- Cô làm mẫu vận động cho trẻ quan sát: 2 lần
- Dạy trẻ vận động theo nhạc: Trẻ vừa hát vừa vận động. (Tổ chức cho lớp, tổ, nhóm, cá nhân luân phiên thực hiện)
3: Nghe hát/Nghe nhạc
- Cô dẫn dắt giới thiệu tên bài hát
- Cô hát cho trẻ nghe 2 lần
4: Kết thúc

Tiểu dạng C: Dạng hoạt động Nghe nhạc/Nghe hát (Nghe nhạc/Nghe hát là Nội dung trọng tâm NDTT, Vận động theo nhạc là Nội dung kết hợp NDKH)
BỐ CỤC GIÁO ÁN BẮT BUỘC:

II. PHÁT TRIỂN TÌNH CẢM KỸ NĂNG XÃ HỘI VÀ THẨM MỸ
2.1. MÔN ÂM NHẠC
2.1.3. Hoạt động vận động theo nhạc (Nghe nhạc/Nghe hát NDTT, Vận động theo nhạc NDKH)
- Nghe nhạc/Nghe hát (NDKH)
- Vận động theo nhạc (NDTT)

TIẾN TRÌNH CHI TIẾT:
1. Ổn định, gây hứng thú;
2: Nghe hát:
- Cô giới thiệu tên bài hát, tác giả.
- Cô hát cho trẻ nghe 3-4 lần:
+ Lần 1: Sau khi hát cô giảng giải nội dung;
+ Lần 2: Cô hát kết hợp múa minh họa.
+ Lần 3: Cho trẻ xem băng đĩa
3: Vận động theo nhạc
- Cô giới thiệu tên bài hát cho trẻ vận động.
- Cô và trẻ cùng hát 1-2 lần.
- Cô làm mẫu vận động cho trẻ quan sát: 2 lần
- Trẻ vận động theo nhạc: Trẻ vừa hát vừa vận động.
+ Cho lớp hát vận động 2 lần.
+ Cho tổ hát vận động : 1, 2 lần
+ Cho nhóm hát vận động.
+ Cho cá nhân thuộc lên hát vận động.
- Cô sửa sai, khuyến khích trẻ hát vận động.
- Cô hỏi trẻ tên bài hát.
4: Kết thúc


--------------------------------------------------
DẠNG 3: HOẠT ĐỘNG VỚI ĐỒ VẬT (HĐVĐV)
(Áp dụng khi Hoạt động học có tên "Hoạt động với đồ vật", hoặc các đề tài liên quan đến xếp hình, xâu vòng, lắp ghép, cài khuy, luồn dây cho 24-36 tháng)

BỐ CỤC GIÁO ÁN BẮT BUỘC GIỐNG 100% MẪU:

3. HOẠT ĐỘNG VỚI ĐỒ VẬT
[TÊN ĐỀ TÀI IN HOA, VÍ DỤ: XẾP ĐƯỜNG ĐI TẶNG BẠN]

TIẾN TRÌNH HOẠT ĐỘNG CHI TIẾT:
1: Trò chuyện giới thiệu bài
2: QS đàm thoại mẫu
- Cô cho trẻ quan sát và đàm thoại về mẫu (hỏi các câu hỏi mở kích thích trẻ miêu tả màu sắc, hình dáng...)
3: Cô làm mẫu
- Cô làm mẫu 2 lần phân tích rõ ràng chi tiết
4: Trẻ thực hiện
- Cô cho trẻ thực hiện
- Trong quá trình thực hiện cô bao quát, giúp đỡ trẻ còn lúng túng
5: Nhận xét
4: Kết thúc


--------------------------------------------------
DẠNG 4: TẠO HÌNH (Tô màu, vẽ, nặn, xé dán)
(Áp dụng khi Hoạt động là Tạo hình, Tô màu, Vẽ, Nặn, Xé dán cho trẻ 24-36 tháng)

BỐ CỤC GIÁO ÁN BẮT BUỘC GIỐNG 100% MẪU:

4. TẠO HÌNH: TÔ MÀU, VẼ, NẶN, XÉ DÁN
[TÊN ĐỀ TÀI IN HOA, VÍ DỤ: NẶN QUẢ CAM]

TIẾN TRÌNH HOẠT ĐỘNG CHI TIẾT:
1: Ổn định gây hứng thú giới thiệu bài
2: Quan sát, đàm thoại vật mẫu
3: Cô làm mẫu
- Cô vừa làm mẫu vừa phân tích.
4. Trẻ thực hiện (Cô cho trẻ thực hiện, mở nhạc nhẹ dịu, cô đi quan sát, hướng dẫn cụ thể từng bé)
5. Nhận xét sản phẩm
- Cô cho trẻ dừng tay và nhận xét tuyên dương.
- Cô nhận xét chung chỉ ra bài nặn đẹp đúng và bài nặn chưa đẹp động viên trẻ lần sau cố gắng.
6. Kết thúc.


--------------------------------------------------
DẠNG 5: LĨNH VỰC PHÁT TRIỂN NHẬN THỨC - NHẬN BIẾT PHÂN BIỆT
(Áp dụng khi Hoạt động học hoặc Đề tài là Nhận biết phân biệt màu sắc, kích thước, hình dạng, đồ chơi, hoa quả, con vật,... cho 24-36 tháng)

BỐ CỤC GIÁO ÁN BẮT BUỘC GIỐNG 100% MẪU:

V. LĨNH VỰC PHÁT TRIỂN NHẬN THỨC
NHẬN BIẾT PHÂN BIỆT
[TÊN ĐỀ TÀI IN HOA, VÍ DỤ: NHẬN BIẾT PHÂN BIỆT MÀU ĐỎ - MÀU VÀNG]

TIẾN TRÌNH HOẠT ĐỘNG CHI TIẾT:
1: Trò chuyện
- Cô trò chuyện với trẻ về chủ đề dẫn dắt giới thiệu bài
2: Dạy trẻ nhận biết phân biệt các đối tượng theo đặc điểm, màu sắc (Cô chuẩn bị tranh ảnh, vật thật để trẻ sờ, nắn, gọi tên đặc điểm chi tiết sinh động)
3: Trò chơi
- Cô giới thiệu tên trò chơi:
- Hướng dẫn cách chơi
- Tổ chức cho trẻ chơi 2-3 lần ( trong khi trẻ chơi cô bao quát trẻ )
- Cô hỏi lại tên trò chơi
4. 4: Kết thúc:


--------------------------------------------------
DẠNG 6: LĨNH VỰC PHÁT TRIỂN NGÔN NGỮ

Hãy tự động chia thành 2 tiểu dạng dựa trên kiểu bài dạy:

Tiểu dạng A: Nhận biết tập nói
BỐ CỤC GIÁO ÁN BẮT BUỘC GIỐNG 100% MẪU:

IV. LĨNH VỰC PHÁT TRIỂN NGÔN NGỮ
4.1. NHẬN BIẾT TẬP NÓI
[TÊN ĐỀ TÀI IN HOA, VÍ DỤ: NHẬN BIẾT TẬP NÓI CON MÈO]

TIẾN TRÌNH HOẠT ĐỘNG CHI TIẾT:
1: ổn định tổ chức giới thiệu bài (hoặc 1: Ổn định tổ chức giới thiệu bài)
2: Nhận biết (1 đồ vật hoặc 2 con vật)
- Cô cho trẻ quan sát các vật và nhận xét
- Cô hỏi trẻ tên gọi, tiếng kêu, công dụng ( cho trẻ nhận biết 3,4 đặc điểm)
- Cô hỏi cá nhân 1 vài trẻ, yêu cầu trẻ chỉ được và nói được theo yêu cầu của cô
- Sau mỗi lần nhận biết cô chốt lại những đặc điểm cung dụng của đồ vât (con vật)
* Cô chốt lại bài
- Liên hệ mở rộng
- Giáo dục
3: Trò chơi
4: Nhận xét tiết học rồi ra chơi

Tiểu dạng B: Thơ, Truyện (Đọc thơ / Kể chuyện cho nhóm trẻ 24-36 tháng)
Tự nhận diện và áp dụng 1 trong 2 tiểu dạng phù hợp và in ra đúng 100% bám sát:

Tiểu dạng B1: Dạy trẻ tìm hiểu nội dung bài thơ, câu chuyện (đối với bài trẻ CHƯA biết)
BỐ CỤC GIÁO ÁN BẮT BUỘC GIỐNG 100% MẪU:

IV. LĨNH VỰC PHÁT TRIỂN NGÔN NGỮ
4.2. THƠ, TRUYỆN: [TÊN ĐỀ TÀI IN HOA]
2.1. Dạy trẻ tìm hiểu nội dung bài thơ, câu chuyện (đối với bài trẻ chưa biết)

TIẾN TRÌNH HOẠT ĐỘNG CHI TIẾT:
1: ổn định tổ chức giới thiệu bài
2: Đọc diễn cảm
- đọc lần 1 kết hợp minh hoạ
- đọc lần 2 kết hợp tranh
3: Trích dẫn, giảng giải, đàm thoại (Cô giới thiệu tên bài, tên tác giả; Cô đọc mẫu; Trích danh giảng giải giải nghĩa từ khó, đàm thoại với trẻ)
4: Dạy trẻ đọc thơ hay kể chuyện (Tổ chức cho cả lớp đọc, tổ, nhóm, cá nhân đọc biểu diễn)
5: kết thúc
(Lưu ý: nếu trẻ chưa hiểu nội dung chưa thuộc cô có thể dạy trẻ đọc rồi đàm thoại).

Tiểu dạng B2: Dạy trẻ đọc thuộc thơ, kể chuyện (đối với bài trẻ ĐÃ biết)
BỐ CỤC GIÁO ÁN BẮT BUỘC GIỐNG 100% MẪU:

IV. LĨNH VỰC PHÁT TRIỂN NGÔN NGỮ
4.2. THƠ, TRUYỆN: [TÊN ĐỀ TÀI IN HOA]
2.2. Dạy trẻ đọc thuộc thơ, kể chuyện (đối với bài trẻ đã biết)

TIẾN TRÌNH HOẠT ĐỘNG CHI TIẾT:
- Cô giới thiệu tên bài, tên tác giả (theo hình thức trực tiếp hoặc gián tiếp);
- Cô đọc mẫu (Nếu trẻ đã thuộc cô có thể đọc, kể mẫu hoặc không cần);
- Đàm thoại, trích dẫn, giảng giải;
- Dạy trẻ đọc thơ (Nếu trẻ đã thuộc cô dạy trẻ đọc, kể diễn cảm; nếu trẻ đọc hoặc kể diễn cảm được thì cô cho trẻ trình bày dưới hình thức biểu diễn).

` : isPhysicalEducation ? `
YÊU CẦU & BỐ CỤC CHUẨN GIÁO ÁN LĨNH VỰC PHÁT TRIỂN THỂ CHẤT - THỂ DỤC MẪU GIÁO (3-5 TUỔI) GIỐNG 100% BẢN ĐÍNH KÈM:
Hãy trình bày giáo án theo đúng cấu trúc, cách đặt tên đề mục, bóc tách dòng và tiến trình của Giáo án thể chất đã được quy chuẩn dưới đây. TUYỆT ĐỐI KHÔNG thêm bớt mục lớn hay làm khác thứ tự.

LĨNH VỰC PHÁT TRIỂN THỂ CHẤT
THỂ DỤC: [TÊN BẬT/BÒ/CHẠY/NÉM IN HOA THƯỜNG DÙNG THEO ĐỀ TÀI, VÍ DỤ: BÒ CHUI QUA CỔNG]
TC: [TÊN TRÒ CHƠI VẬN ĐỘNG IN HOA CHỮ, VÍ DỤ: KÉO CO]

I. MỤC ĐÍCH YÊU CẦU:
1. Kiến thức.
+ Mô tả chi tiết kiến thức động tác vận động cơ bản cần học (VD: Trẻ biết cách bò bằng bàn tay và cẳng chân chui qua cổng không chạm cổng, lưng thẳng).
+ Nêu nhiệm vụ trò chơi vận động (VD: Trẻ biết cách chơi trò chơi kéo co đúng luật).
2. Kĩ năng.
+ Rèn luyện sự phối hợp chân tay, mắt, rèn sự khéo léo, dẻo dai cơ thể.
+ Phát triển các nhóm cơ và tố chất vận động thăng bằng tốt.
3. Thái độ
+ Trẻ hào hứng tích cực tham gia vận động nhiệt tình.
+ Có ý thức kỷ luật nề nếp tốt trong hàng ngũ dưới sự hướng dẫn của cô bè bạn.

II. CHUẨN BỊ:
+ Đồ dùng của cô: Sân tập rộng rãi sạch sẽ an toàn, thảm bò, cổng, loa đài bản nhạc sôi nổi bốc lửa.
+ Đồ dùng của trẻ: Trang phục gọn gàng thoải mái, các đồ dùng phục vụ trò chơi.

III. TIẾN HÀNH HOẠT ĐỘNG:

1. Hoạt động 1: Trò chuyện gây hứng thú:
+ Các con ơi, lại đây với cô trò chuyện nào.
+ Hôm nay chúng ta cùng nhau tập luyện thể dục thể thao nâng cao sức khỏe nhé.
+ Chơi trò chơi nhỏ hoặc trò chuyện dẫn dắt nhẹ nhàng thân thương.

2. Hoạt động 2: Khởi động
+ Cho trẻ đi theo vòng tròn kết hợp đi thường -> đi mũi bàn chân -> đi thường -> đi bằng gót bàn chân -> đi thường -> chạy chậm -> chạy nhanh -> chạy chậm -> về hàng ngang tập bài tập phát triển chung. (Chú ý viết đúng ký hiệu mũi tên -> như bản đính kèm mẫu)

3. Hoạt động 3: Trọng động.

a. Bài tập phát triển chung:
(Tập theo nhịp đếm hô, cô bật nhạc sôi động hấp dẫn của chủ đề để trẻ phấn khởi)
+ Động tác hô hấp: Gà gáy (hoặc thổi bóng)
+ Động tác tay: [Tên và mô tả động tác tay, ghi số lần nhịp 2l x 8 nhịp hoặc 3l x 8 nhịp tùy động tác]
+ Động tác chân: [Tên và mô tả động tác chân]
+ Động tác bụng: [Tên và mô tả động tác cơ bụng lườn]
+ Động tác bật: [Tên và mô tả động tác bật nhảy]

b. Vận động cơ bản: [Tên vận động cơ bản cũ hoặc mới tùy đề tài]
- Cô giới thiệu tên vận động cơ bản.
- Cô thực hiện vận động mẫu lần 1 không giải thích đầy tự tin.
- Cô thực hiện vận động mẫu lần 2 kết hợp phân tích kỹ thuật chuẩn xác, tỉ mỉ từng chi tiết (tính từ thế chuẩn bị, tư thế bò/bật/ném, hướng nhìn, cự ly khéo léo).
* Trẻ thực hiện:
- Cô mời 1-2 trẻ khá lên thực hiện cho cả lớp xem.
- Lần lượt cho cả lớp thực hiện (mỗi trẻ thực hiện 2-3 lần, cô bao quát, hướng sửa sai tận tình, kịp thời).
- Tổ chức thi đua sôi nổi giữa các tổ, động viên học sinh nhiệt tình.

c. Trò chơi: [TÊN TRÒ CHƠI HOẶC TC: KÉO CO]
- Cô giới thiệu tên trò chơi.
- Phổ biến luật chơi, cách chơi cực kỳ rõ ràng dễ hiểu.
- Tổ chức cho trẻ chơi hăng hái 2-3 lần liên tục.
- Cô kiểm tra kết quả và tuyên dương thắng cuộc nhẹ nhàng.

3. Hoạt động 3: Hồi tĩnh. (Chú ý lặp lại số thứ tự "3" giống y hệt lỗi đánh số trong bản mẫu đính kèm)
+ Cô cho trẻ đi lại thả lỏng tự do, hít thở nhẹ nhàng quanh sân tập 1-2 vòng êm dịu, cô nhận xét động viên lớp học kết thúc tiết.
` : isTraditional ? `
YÊU CẦU & BỐ CỤC CHUẨN GIÁO ÁN TRUYỀN THỐNG MẪU GIÁO (3-5 TUỔI) GIỐNG 100% TIÊU CHUẨN ĐÍNH KÈM SƯ PHẠM:
Dựa vào môn học/hoạt động thực tế giáo viên đang chọn, hãy tự động nhận dạng và in ra đúng 100% theo các khung đề mục bố trí dưới đây.

CHỌN ĐÚNG 1 TRONG CÁC KHUNG DƯỚI ĐÂY SÁT VỚI MÔN HỌC/ĐỀ TÀI THỰC TẾ:

--------------------------------------------------
DẠNG 1: TRÒ CHUYỆN / ĐÀM THOẠI KHÁM PHÁ (Lĩnh vực Phát triển Nhận thức)
(Thích hợp cho các bài trò chuyện về đồ vật, phương tiện giao thông, con vật, các loài hoa, nghề nghiệp, trường lớp mầm non, ngày tết quê em...)

LĨNH VỰC PHÁT TRIỂN NHẬN THỨC
TRÒ CHUYỆN [TÊN ĐỀ TÀI VIẾT IN HOA CHỮ]

I. MỤC ĐÍCH YÊU CẦU:
1. Kiến thức:
+ Trẻ nhận biết gọi tên được sự vật, nêu các đặc điểm bên ngoài nổi bật của sự vật/đối tượng trò chuyện.
+ Tìm hiểu lợi ích, công dụng hoặc thói quen sinh hoạt liên quan.
2. Kỹ năng:
+ Phát triển vốn từ, rèn luyện kĩ năng quan sát, trò chuyện đàm thoại rõ câu, mạch lạc.
+ Rèn kĩ năng phán đoán, phân tích, so sánh (nếu có).
3. Giáo dục:
+ Giáo dục trẻ tình yêu thiên nhiên, yêu thương gia đình, bảo vệ giữ gìn đồ chơi đồ dùng sạch sẽ ngăn nắp phù hợp chủ đề trò chuyện.

II. CHUẨN BỊ:
+ Đồ dùng của cô: Giáo cụ trực quan, tranh ảnh sinh động, sa bàn, slideshow máy chiếu rõ ràng bắt mắt, nhạc bài hát dẫn dắt.
+ Đồ dùng của trẻ: Hệ thống tranh ảnh thu nhỏ, lô tô đối tượng trò chuyện, ghế ngồi bố trí vòng tròn rộng rãi.

III. TỔ CHỨC HOẠT ĐỘNG:

1. Hoạt động 1: Gây hứng thú
+ Lời dẫn gây hứng thú mở đầu trìu mến của cô: câu đố, món quà nhỏ hay cùng trẻ ca hát tưng bừng.
+ Đàm thoại ngắn cùng trẻ dẫn dắt vào đề tài tự nhiên.

2. Hoạt động 2: Trò chuyện về [TÊN ĐỀ TÀI]
* Quan sát [Đối tượng mốc 1]:
+ Cô đặt câu hỏi mở gợi ý chi tiết cho trẻ quan sát đặc điểm cấu tạo bên ngoài màu sắc hình dáng thế nào.
+ Hoạt động đàm thoại hỏi đáp giữa cô và trẻ phong phú.
-> Cô chốt lại và giáo dục trẻ. (Chốt tri thức khoa học mẫu giáo, định hướng giáo đạo đạo đức nhẹ nhàng).
* Quan sát [Đối tượng mốc 2]:
+ Tiếp tục cô đưa đối tượng quan sát tiếp theo để trẻ sờ nắn khám phá đàm thoại.
-> Cô chốt lại và giáo dục trẻ. (Đưa ra kết quả chốt và ý nghĩa thiết thực).

3. Hoạt động 3: Củng cố
* Trò chơi: [Tên trò chơi củng cố kích thích]
- Cô giới thiệu tên trò chơi.
- Cô nói cách chơi, luật chơi rõ ràng cho cả lớp.
- Tổ chức cho trẻ chơi hăng hái (cô chơi cùng bao quát).
- Cô kiểm tra kết quả chơi động viên khen ngợi.

4. Hoạt động 4: Kết thúc:
+ Cô nhận xét buổi trò chuyện, tuyên dương khuyến khích trẻ rồi chuyển sang hoạt động góc hoặc ngoài trời êm ái.


--------------------------------------------------
DẠNG 2: MÔN TẠO HÌNH: VẼ, TÔ MÀU, NẶN, XÉ DÁN DẠNG TIẾT MẪU (Lĩnh vực Phát triển Thẩm mĩ)
(Áp dụng khi đề tài là tô màu trường mầm non, vẽ hoa, nặn quả, nặn bánh, tô màu ô tô...)

LĨNH VỰC PHÁT TRIỂN THẨM MĨ
VẼ [TÊN ĐỀ TÀI IN HOA TỰ NHIÊN] (Mẫu)
(hoặc TÔ MÀU [TÊN ĐỀ TÀI IN HOA] (Mẫu) / NẶN [TÊN ĐỀ TÀI IN HOA] (Mẫu) / XÉ DÁN [TÊN ĐỀ TÀI IN HOA] (Mẫu))

I. MỤC ĐÍCH - YÊU CẦU:
1. Kiến thức:
+ Trẻ biết cách sử dụng các nét vẽ căn bản (nét cong tròn khép kín, nét xiên, nét thẳng...) hoặc kỹ thuật nặn (xoay tròn, ấn dẹt, chia đất...) để tạo hình sản phẩm mẫu.
+ Biết chọn màu sắc tô màu phối màu hài hòa hợp lý.
2. Kỹ năng:
+ Rèn luyện kỹ năng cầm bút bằng tay phải bằng 3 đầu ngón tay khéo léo, giữ giấy chắc chắn. Rèn sự dẻo dai cơ tay ngón tay thon thả.
+ Phát triển tư duy thẩm mĩ, óc sáng tạo trang trí đẹp mắt.
3. Thái độ:
+ Trẻ trân quý gìn giữ sản phẩm do chính tay mình và bạn bè tạo ra, dọn dẹp cất dọn nề nếp gọn gàng sạch sẽ sau giờ vẽ nặn.

II. CHUẨN BỊ:
+ Đồ dùng của cô: Tranh vẽ mẫu sắc nét/vật nặn mẫu của cô trưng bày đẹp trên bàn, bảng, phấn màu, sáp màu, tăm tre, đất nặn, đĩa đựng đất, bảng con, nhạc nhẹ sảng khoái.
+ Đồ dùng của trẻ: Giấy vẽ, vở tạo hình, đất nặn chất lượng an toàn, bảng nhỏ, bút sáp màu đủ loại cho mỗi học sinh.

III. TỔ CHỨC HOẠT ĐỘNG:

1. Hoạt động 1: Ổn định tổ chức, gợi mở gây hứng thú. (hoặc 1. Hoạt động 1: Trò chuyện gây hứng thú)
+ Cô đàm thoại mở đầu lôi cuốn bằng thơ ca, đồng dao hoặc trò chơi vui vẻ giới thiệu chủ đề tạo hình.

2. Hoạt động 2: Quan sát và đàm thoại tranh mẫu
+ Cô đưa tranh vẽ mẫu (hoặc vật mẫu nặn) ra cho trẻ chiêm ngưỡng trầm trồ.
+ Hệ thống câu hỏi đàm thoại chi tiết cấu tạo, kỹ thuật thực hiện: "Con thấy bức tranh vẽ gì nào?", "Bức tranh được tô màu gì?", "Gồm những nét gì đặc biệt?"...

3. Hoạt động 3: Cô vẽ mẫu (hoặc Cô tô màu mẫu / Cô nặn mẫu)
+ Cô thực hiện mẫu tỉ mỉ, kết hợp vừa làm vừa phân tích rõ kỹ năng từng nét, tư thế ngồi ngay ngắn lưng thẳng đầu hơi cúi, tay giữ bút thế nào, cách tô màu đều tay từ trái sang phải không bị chớm lem ra ngoài.

4. Hoạt động 4: Trẻ thực hiện
+ Cô dặn dò trẻ tư thế cầm bút và điều hành cho trẻ làm bài chăm chỉ.
+ Cô bật một khúc nhạc êm dịu sảng khoái kích thích tâm hồn nghệ thuật.
+ Cô đi xung quanh từng bàn, quan sát giúp đỡ gợi mở cho các trẻ còn yếu hay lúng túng, khích lệ trẻ có năng khiếu vẽ trang trí sáng tạo sáng bừng góc phòng.

5. Hoạt động 5: Trưng bày nhận xét sản phẩm
+ Hướng dẫn trẻ dán bài vẽ mẫu lên bảng trưng bày sinh động hoặc bày đĩa nặn của mình lên bàn triển lãm nghệ thuật bé xinh.
+ Mời 2-3 trẻ xung phong lên nhận xét bài bạn thích nhất (Con thích bài của ai? Vì sao con thích? Trông nét vẽ thế nào?).
+ Cô chốt nhận xét chung, biểu dương tinh thần làm việc, giáo dục nề nếp thói quen giữ gìn vệ sinh sạch sẽ, lau bàn tay rử tay xà phòng nếp sống sạch.

* Kết thúc:
+ Cô và trẻ cùng thu vén dụng cụ gọn gàng, chuyển hoạt động dễ thương.


--------------------------------------------------
DẠNG 3: MÔN THƠ (Lĩnh vực Phát triển Ngôn ngữ)
(Thích hợp cho các tiết học dạy trẻ đọc thơ mẫu giáo như bài thơ dán hoa, mèo hoa đi học, bàn tay cô giáo, yêu mẹ...)

LĨNH VỰC PHÁT TRIỂN NGÔN NGỮ
THƠ: [TÊN BÀI THƠ IN HOA]

I. MỤC ĐÍCH YÊU CẦU:
1. Kiến thức:
+ Trẻ nhớ và đọc thuộc tên bài thơ, tên tác giả sáng tác.
+ Trẻ hiểu nội dung ý nghĩa sâu sắc của bài thơ (miêu tả sự vật hay bài học ý nghĩa).
2. Kỹ năng:
+ Rèn trẻ khả năng đọc thơ diễn cảm, phát âm tròn vành rõ chữ, đúng nhịp phách, ngắt nghỉ hơi đúng câu thơ.
+ Phát triển ngôn ngữ, khả năng ghi nhớ có chủ định, mở rộng vốn từ cho trẻ.
3. Thái độ:
+ Trẻ hào hứng chú ý lắng nghe cô đọc và tích cực biểu diễn hăng sái.
+ Liên hệ bài thơ để giáo dục trẻ kỉ luật, hiếu thảo ngoan ngoãn ngoan hiền.

II. CHUẨN BỊ:
+ Đồ dùng của cô: Tranh thơ minh họa đẹp chuẩn, mô hình sa bàn tuyệt diệu tái hiện cảnh thơ, loa phát nhạc thơ du dương nhẹ nhàng.
+ Đồ dùng của trẻ: Đội hình ngồi ghế hình chữ U thoáng đạt, trang phục ngay ngắn lịch sự.

III. TỔ CHỨC HOẠT ĐỘNG:

1. Hoạt động 1: Trò chuyện gây hứng thú (hoặc 1. Hoạt động 1: Trò chuyên gây hứng thú)
+ Trò chuyện rộn ràng bằng bài hát múa hoặc câu đố dí dỏm về đề tài dẫn lối nhỏ nhẹ vào tìm hiểu bài thơ.

2. Hoạt động 2: Cô đọc mẫu
- Cô giới thiệu tên bài thơ, tác giả sáng tác tự hào.
- Cô đọc thơ mẫu lần 1: Đọc bằng cả trái tim ấm áp, cử chỉ nét mặt nụ cười dịu hiền dạt dào cảm xúc.
- Cô đọc thơ mẫu lần 2: Đọc kết hợp tranh ảnh hoặc sa bàn minh họa chi tiết tuyệt diệu để trẻ dễ tưởng tượng thế giới thơ ca.

3. Hoạt động 3: Trích dẫn giảng giải đàm thoại
- Cô đọc trích dẫn từng câu thơ ngắn bóc tách mầm non giải thích nghĩa từ khó sâu sắc.
- Đàm thoại sâu sắc with trẻ bằng hệ thống câu hỏi liên tục gợi mở đáp án: "Tên bài thơ là gì?", "Có những nhân vật nào?", "Hành động đáng yêu ra sao?"...
- Sau đó cô bồi dưỡng đúc kết bài học lồng ghép tình cảm đạo đức ấm lòng.

4. Hoạt động 4: Trẻ đọc thơ
- Dạy trẻ đọc thuộc thơ bằng cách cho cả lớp cùng đọc với cô 2-3 lần chậm rãi điều chỉnh sửa sai phát âm.
- Tổ chức cho các tổ luân phiên thi đua đọc thơ diễn cảm.
- Cho đại diện nhóm bé trai, nhóm bé gái đọc biểu cảm kết hợp cử chỉ điệu bộ.
- Mời cá nhân học sinh có giọng đọc thơ hay xuất sắc tự tin lên sân khấu nhỏ biểu diễn tưng bừng.
=> Cô chủ động sửa lỗi phát âm sửa ngọng uốn nắn kịp thời nhiệt tình.

5. Hoạt động 5: Kết thúc
- Nhận xét và biểu dương lớp học, khen ngợi từng các bạn trẻ, giáo dục đạo đức chuyển tiếp nhẹ bước ngoài sân.


--------------------------------------------------
DẠNG 4: MÔN ÂM NHẠC TRỌNG TÂM VẬN ĐỘNG / MÚA / GÕ ĐỆM (Lĩnh vực Phát triển Thẩm mĩ)
(Thích hợp khi Hoạt động vận động theo nhạc là chính, nghe hát là phụ kết hợp trò chơi âm nhạc)

LĨNH VỰC PHÁT TRIỂN THẨM MĨ
VĐ: [TÊN BÀI VẬN ĐỘNG IN HOA CHỮ, VÍ DỤ: VTTTTC ĐƯỜNG VÀ CHÂN]
NH: [TÊN BÀI NGHE HÁT IN HOA, VÍ DỤ: CÒ LẢ]
TC: [TÊN TRÒ CHƠI ÂM NHẠC IN HOA, VÍ DỤ: AI NHANH NHẤT]

I. MỤC ĐÍCH YÊU CẦU:
1. Kiến thức:
+ Trẻ nhớ tên bài hát vận động và hiểu cách vận động theo nhạc (vỗ tay theo tiết tấu chậm/nhanh/nhịp hoặc múa dẻo dai vui khỏe).
+ Trẻ cảm nhận sâu, lắng nghe trọn vẹn giai điệu êm dịu bài nghe hát.
2. Kĩ năng:
+ Rèn trẻ phản xạ nhạy bén cảm thụ âm nhạc tốt, kỹ năng vỗ tay múa phối hợp nhịp nhàng thanh thoát.
+ Rèn tai nghe, kĩ năng hát đúng nhạc kết hợp múa khéo léo.
3. Thái độ:
+ Trẻ thích thú tham gia múa hát nhiệt tình hết mình, yêu văn nghệ hồn nhiên.

II. CHUẨN BỊ:
+ Đồ dùng của cô: Bản nhạc máy Mp3 loa đài sôi động, sắc xô, phách tre, trống lắc, dụng cụ hóa trang sinh động, video chất lượng.
+ Đồ dùng của trẻ: Sắc xô, mũ âm nhạc cho trò chơi cá nhân tự tin.

III. TỔ CHỨC HOẠT ĐỘNG:

1. Hoạt động 1: Trò chuyện gây hứng thú.
+ Đón chào và đàm thoại mở màn lôi cuốn khích lệ trẻ hòa nhịp mỉm cười cùng âm nhạc.

2. Hoạt động 2: Dạy VĐ( [Tên phương thức vận động, ví dụ VTTTTC]): [Tên bài hát vận động]
- Cô hát lại bài hát 1 lần dịu hiền đầy nhạc tính cho trẻ nhớ lại điệp khúc.
- Cô thực hiện vận động mẫu lần 1 trọn vẹn bắt mắt.
- Cô thực hiện vận động mẫu lần 2 kết hợp phân tích rõ quy luật vỗ phách hay múa tay múa chân khéo léo để trẻ học theo chính xác.
* Trẻ thực hiện:
- Cho cả lớp vừa hát vừa vận động nhịp nhàng múa ca ngọt ngào 2-3 lần liên tiếp.
- Các tổ thi đua nhau vỗ tay gõ phách biểu diễn.
- Nhóm học sinh lên sân khấu gõ sắc xô thanh phách.
- Mời cá nhân xuất sắc tự nhiên biểu diễn tự tin. Cô bao quát sửa sai uốn nắn chính xác cho trẻ không lo chệch nhịp.

3. Hoạt động 3: Nghe hát: [Tên bài hát nghe hát đầy ý nghĩa]
- Cô giới thiệu xúc động bài hát nghe hát ngọt ngào thắm thiết tình quê hương.
- Cô hát thể hiện lần 1 trực quan ấm áp giảng giải ý nghĩa nội dung dịu dàng.
- Cô hát hoặc nhảy múa phụ họa lần 2 rộn ràng kích thích sự đồng cảm múa hòa nhịp vui đùa của trẻ.

4. Hoạt động 4: Trò chơi [Tên trò chơi âm nhạc đầy sôi bọc]
- Cô giới thiệu luật chơi cách chơi kịch tính lôi cuốn.
- Cho trẻ chơi vui vẻ 2-3 lượt đầy sảng khoái năng nổ.

* Kết thúc:
- Khen biểu dương các con dịu dàng rồi dẫn nghỉ ngơi thư giãn.


--------------------------------------------------
DẠNG 5: MÔN ÂM NHẠC TRỌNG TÂM DẠY HÁT (Lĩnh vực Phát triển Thẩm mĩ)
(Thích hợp khi Hoạt động trọng tâm là Dạy hát bài mới rực rỡ, kết hợp nghe hát ngọt ngào và trò chơi)

LĨNH VỰC PHÁT TRIỂN THẨM MĨ
- DẠY HÁT: [TÊN BÀI HÁT DẠY HÁT IN HOA]
- NGHE HÁT: [TÊN BÀI HÁT NGHE HÁT IN HOA]
- TRÒ CHƠI: [TÊN TRÒ CHƠI IN HOA]

I. MỤC ĐÍCH YÊU CẦU:
1. Kiến thức:
+ Trẻ nhớ tên bài hát dạy hát, nhớ tên tác giả và hát đúng giai điệu, ca từ đáng yêu của bài hát.
+ Trẻ hiểu được nội dung tình yêu thương thông điệp ngọt dịu của bài dạy hát mang đến.
2. Kỹ năng:
+ Hát đúng cao độ, trường độ bài hát, không ngắc ngớ, phát âm rõ tiếng mạch lạc.
+ Rèn luyện kỹ năng hoạt động nhóm thi đua biểu diễn văn nghệ tự tin trên bục.
3. Thái độ:
+ Trẻ tích cực ca vang, hào hứng đung đưa hưởng ứng theo nhịp giai điệu êm ái thích thú.

II. CHUẨN BỊ:
+ Của cô: Đàn organ hoặc nhạc đệm mp3 bài dạy hát và nhạc nghe hát sinh động nghệ thuật, dụng cụ múa mũ múa đáng yêu của mầm non.
+ Của trẻ: Trang phục gọn đẹp rực rỡ nụ cười xinh xắn, các hạt vòng hoa sắc xô gỗ.

III. TỔ CHỨC HOẠT ĐỘNG:

1. Hoạt động 1: Gây hứng thú
+ Trò chuyện bằng tranh mẫu ảnh hay lời rủ rỉ ngọt ngào dẫn lớp vào bài hát mới cực vui nhộn.

2. Hoạt động 2: Dạy hát "[Tên bài dạy hát in hoa tiếng Việt]"
* Cô hát mẫu:
- Cô hát mẫu lần 1: Giọng ca trong trẻo dạt dào cảm xúc biểu diễn chân thực.
- Cô hát mẫu lần 2: Nhấn nhá từ ngữ ngọt ngào kết hợp gõ đệm phách tre sinh động.
+ Dạy trẻ hát:
- Cho tất cả lớp hát vang đều nhịp nhàng 2-4 lần cùng cô nhẹ nhõm.
- Chia tổ thi đua gõ nỗ lực sắc xô thanh phách hát thi.
- Nhóm bé trai hát, nhóm bé gái múa hát thi đua rực rỡ.
- Mời cá nhân lên biểu diễn giọng hát tự tin xuất sắc cô động viên dồi dào. (Cô theo sát sửa chữa lỗi hát sai cao độ sửa ngọng kịp thời).

3. Hoạt động 3: Nghe hát: [Tên bài nghe hát in hoa]
+ Cô hát biểu cảm gieo hạt giai điệu êm đềm giải nghĩa tranh vẽ thơ ca âm nhạc, mời trẻ đứng dậy đung đưa tay chân múa phụ họa sảng khoái.

4. Hoạt động 4: Trò chơi: [Tên trò chơi âm nhạc đầy tiếng cười]
+ Cô nêu luật chơi và cách chơi hấp dẫn bùng nổ, cho trẻ tham gia nồng nàn 2-3 lần tưng bừng sảng khoái.


--------------------------------------------------
DẠNG 6: KHÁM PHÁ XÃ HỘI / TÌM HIỂU ĐỀ TÀI QUEN THUỘC (Lĩnh vực Phát triển Nhận thức)
(Thích hợp cho các bài khám phá Tìm hiểu về trường mầm non của bé, tìm hiểu đồ dùng gia đình...)

LĨNH VỰC PHÁT TRIỂN NHẬN THỨC
TÌM HIỂU VỀ [TÊN CHỦ ĐỀ CHÍNH IN HOA CHỮ]

I. MỤC ĐÍCH YÊU CẦU
1. Kiến thức
+ Trẻ hiểu biết rõ ràng đặc điểm vai trò kết cấu của đối tượng tìm hiểu (VD: Tên gọi của trường mầm non thân yêu, tên cô hiệu trưởng, các hoạt động bé vui vẻ trải qua ở trường mỗi ngày).
2. Kỹ năng
+ Rèn kỹ năng trả lời câu hỏi mạch lạc tròn câu rõ ý sư phạm.
+ Phát triển tư duy logic và ngôn ngữ đàm thoại giao lưu của trẻ mầm non.
3. Thái độ
+ Trẻ yêu mến gắn bó sâu đậm với đối tượng tìm hiểu (VD: Yêu trường, mến bạn, kính trọng cô giáo chăm chỉ học tập sạch sẽ gọn gàng thói quen tốt mỗi sớm mai).

II. CHUẨN BỊ
1. Đồ dùng của cô: Tranh ảnh chụp thực tế sinh động rõ nét, slides phim hoạt hình ngắn chân thực mộc mạc, nhạc bài hát bám sát bài dạy dễ thương.
2. Đồ dùng của trẻ: Thẻ bài lô tô, khối hình, ghế ngồi sạch sẽ an toàn chuẩn chữ U.

III. TỔ CHỨC HOẠT ĐỘNG
1. Hoạt động 1: Gây hứng thú
+ Lời dẫn dắt vui tính mời bạn nhỏ xúm xít quanh cô, kể một câu chuyện ngắn thú vị để thắp sáng tinh thần hào hứng của học sinh.

2. Hoạt động 2: Trò chuyện về [Tên chủ đề chính tìm hiểu]
+ Cô dẫn dắt trò chuyện sâu sắc kết hợp trình chiếu tranh ảnh sinh động tuyệt vời về thế giới quanh bé.
+ Hệ thống đàm thoại tương tác thân mật gợi mở tư suy suy luận tự nhiên của trò nhí.
Củng cố: Cô chốt lại giá trị kiến thức cơ bản bổ ích, mở rộng liên hệ bài học liên hoàn thực tế giáo dục trẻ thói quen tốt.

2. Hoạt động 2 Trò chơi : [Tên trò chơi củng cố nâng tầm]
- Cách chơi : Mô tả luật chơi, cách chơi phân đội kịch tính đầy vui nhộn.
- Luật chơi : Vui tươi công bằng đoàn kết.
- Cho trẻ chơi tích cực đầy phấn khởi.

3. Hoạt động 3: Kết thúc
+ Cô khen ngợi chung hào hứng dịu dàng dặn dò các bé nề nếp ngoan ngoãn rồi cho ra góc hoạt động vui ca.


--------------------------------------------------
DẠNG 7: TRUYỆN: KỂ CHO TRẺ NGHE (Lĩnh vực Phát triển Ngôn ngữ)
(Thích hợp dạy các bài truyện mèo hoa đi học, thỏ con biết vâng lời, câu chuyện về giấy kẻ...)

LĨNH VỰC PHÁT TRIỂN NGÔN NGỮ
- TRUYỆN: [TÊN TRUYỆN IN HOA CHỮ] (Kể cho trẻ nghe)

I. MỤC ĐÍCH YÊU CẦU
1. Kiến thức.
+ Trẻ hiểu và ghi nhớ sâu sắc tên truyện, tên tất cả các nhân vật ngộ nghĩnh có trong câu chuyện hay.
+ Trẻ nắm chắc nội dung diễn biến cơ bản cốt truyện lý thú bài học đạo đức.
2. Kỹ năng.
+ Rèn khả năng chú cảm thụ sâu sắc ngôn ngữ văn học mượt mà, kĩ năng trả lời đàm thoại trôi chảy mạch lạc.
+ Khuyến khích trẻ bắt chước giọng điệu, điệu bộ dễ thương của các nhân vật truyện.
3. Thái độ.
+ Trẻ thích lắng nghe truyện đầy chăm ngoan ham mê thế giới cổ tích nhiệm màu.
+ Biết phân biệt việc tốt việc xấu, vâng lời ông bà cô giáo bố mẹ nếp ngoan.

II. CHUẨN BỊ.
+ Đồ dùng của cô: Bộ tranh kể chuyện minh họa sống động, sa bàn múa rối diệu kỳ, nhạc hoạt cảnh nhẹ nhàng rủ rỉ trìu mến.
+ Đồ dùng của trẻ: Không gian tĩnh lặng thoáng sạch bố trí trẻ ngồi ngay hàng thẳng lối chăm chú nhìn.

III. TỔ CHỨC HOẠT ĐỘNG.

1. Hoạt động 1: Ôn định tổ chức. (hoặc 1. Hoạt động 1: Gây hứng thú)
+ Cô ổn định đội hình bằng việc đố vui dí nhị giới thiệu chuyến phiêu lưu vào xứ sở cổ tích câu chuyện thần kỳ.

2. Hoạt động 2: Truyện: [Tên truyện kể in hoa]
* Cô kể cho trẻ nghe..
- Cô kể lần 1: Giọng điệu hóa thân ngọt lịm gõ nhịp nhịp nhàng sắc thái sống động biểu cảm tuyệt diệu, không dùng tranh để trẻ lắng nghe bằng thính giác tập trung.
- Cô kể lần 2: Kết hợp tranh minh họa hoành tráng trực quan rõ nét sắc mầu hoặc sa bàn biểu diễn nghệ thuật đầy cuốn hút.
* Trích dẫn, giảng giải, đàm thoại
- Trích dẫn giảng giải bóc tách từng chặng truyện kịch tính dễ hiểu.
- Đàm thoại chi tiết dồi dào câu chuyện đan xen câu hỏi mở cho trẻ reo hò đáp lời: "Trong truyện có những ai?", "Mèo Hoa đã làm gì?", "Ai đã giúp bạn ấy ngoan ngoãn ngoan hiền?"...
- Kể lại truyện: Hướng dẫn trẻ cùng cô kể lồng ghép những lời thoại đối đáp ngắn linh động vui tươi rải rác.

3. Hoạt động 3: Kết thúc:
+ Giáo dục bài học nhân văn ấm áp sâu xa, khen cả lớp ngoan giỏi cùng chuyển góc mộc mạc nhẹ chân.


--------------------------------------------------
DẠNG 8: TRUYỆN DẠY TRẺ TẬP KỂ LẠI (TRUYỆN KỂ) (Lĩnh vực Phát triển Ngôn ngữ)
(Thích hợp bài dạy truyện kể giúp học sinh rèn tự nói kể lại câu thoại tranh biểu diễn đóng kịch)

LĨNH VỰC PHÁT TRIỂN NGÔN NGỮ
TRUYỆN KỂ: [TÊN TRUYỆN IN HOA CHỮ]

I. MỤC ĐÍCH - YÊU CẦU:
1. Kiến thức:
+ Trẻ nhớ cốt truyện, hiểu tính cách hành động của các nhân vật.
+ Nhớ được lời thoại mấu chốt then chốt của các vai trong truyện.
2. Kỹ năng:
+ Phát triển kĩ năng nói thành thạo liền mạch, biết kể diễn cảm có ngữ điệu thăng hoa tự nhiên rèn trí nhớ.
+ Tự tin giao tiếp và biểu diễn hoạt cảnh trước lớp.
3. Thái độ:
+ Trẻ đoàn kết, hào hứng phối hợp sắm vai chơi vui cùng chúng bạn.

II. CHUẨN BỊ
+ Đồ dùng của cô: Tranh truyện, mũ phác nhân vật đóng kịch cho vai diễn cực sắc màu, đạo cụ lều tranh cây hoa mầm non sinh động.
+ Đồ dùng của trẻ: Thảm tọa độ sắm vai phong phú, mũ rối tay dễ thương.

III. TỔ CHỨC HOẠT ĐỘNG.

1. Hoạt động 1: Gây hứng thú
+ Đố vui gõ nhịp gõ đập tưng bừng dẫn dụ bé yêu hướng tâm vào câu chuyện sẽ học kể.

2. Hoạt động 2: Kể chuyện cho trẻ nghe
- Cô bắt nhịp kể lại truyện một lần sinh động lôi cuốn đầy cảm xúc mượt mà.
* Đàm thoại:
- Thiết lập nhanh cuộc trò chuyện hỏi đáp sâu về lời thoại tính cách nổi bật: "Bác gấu đã nói thế nào con?", "Giọng thỏ em thỏ anh ra sao?"...
- Cô dẫn dắt chỉ dạy trẻ tập kể từng đoạn truyện tương tác rộn rã từng nhóm thi tài kể nối tiếp sinh động rộn rã.

3. Hoạt động 3: Dạy trẻ kể lại truyện
- Tổ chức phân vai đóng kịch hóa trang thỏ, gấu, cáo... lên biểu diễn kể lại lời thoại tưng bừng tiếng cười phấn khởi.
- Cô nhận xét giáo huấn đạo đức yêu bạn, quý thầy cô, nhẹ nhàng khép tiết học thân ái.


--------------------------------------------------
DẠNG 9: MÔN TOÁN: ÔN NHẬN BIẾT HÌNH DẠNG / HÌNH TRÒN, HÌNH VUÔNG, HÌNH TAM GIÁC (Lĩnh vực Phát triển Nhận thức)
(Thích hợp khi dạy các bài ôn nhận biết gọi tên, phân biệt các dạng hình tròn vuông tam giác chữ nhật)

LĨNH VỰC PHÁT TRIỂN NHẬN THỨC
TOÁN: ÔN NHẬN BIẾT [TÊN CÁC HÌNH IN HOA, VÍ DỤ: HÌNH TRÒN, HÌNH VUÔNG, HÌNH TAM GIÁC]

I. MỤC ĐÍCH - YÊU CẦU:
1. Kiến thức:
+ Trẻ gọi đúng tên các hình tròn vuông tam giác màu sắc rực rỡ, nhận ra đặc điểm cấu tạo cơ bản (VD: hình tròn có đường bao cong tròn lăn được, hình vuông có góc cạnh cạnh thẳng đứng không lăn nổi).
+ Nhận biết được các đồ dùng đồ vật xung quanh lớp có dạng hình học tương thích.
2. Kỹ năng:
+ Rèn năng lực quan sát, so sánh đối chiếu nhanh, tư duy trực quan sắc bén.
+ Phát triển kĩ năng sờ vuốt bao hình chuẩn xác gọi tên hình đúng đắn.
3. Thái độ:
+ Trẻ hào hứng phấn khởi tham gia trò chơi tìm hình ghép hình hợp tác vui vẻ.

II. CHUẨN BỊ:
+ Của cô: Thảm hình lớn, rổ đựng đầy các hình của cô to đẹp, đồ chơi dạng hình đa phong phú xung quanh lớp học, hộp quà kỳ ảo.
+ Của trẻ: Mỗi bé có một rổ đựng hình tròn vuông tam giác nhựa nhỏ đầy màu sắc thanh thoát khác nhau.

III. TỔ CHỨC HOẠT ĐỘNG

1. Hoạt động 1: Ổn định tổ chức, gợi mở gây hứng thú.
+ Cô đố bé thơ rủ tai rực rỡ chào hỏi quà tặng hộp bí mật kỳ diệu chứa các hình hấp dẫn mở màn lôi cuốn.

2. Hoạt động 2: Ôn nhận biết gọi tên hình:
- Cô cùng trẻ khám phá từng hình học xuất hiện trong rổ.
- Hỏi trẻ giơ hình theo yêu cầu hiệu lệnh của cô nhanh tay nhanh mắt gọi tên to rõ đặc điểm hình: lăn được/không lăn được.
- Cô rải hình khắp phòng học cho trẻ thi đua đi tìm các đồ chơi xung quanh có cấu trúc dạng hình mong muốn.
- Tổ chức trò chơi ghép nhà, trò chơi vận động nhảy thông minh vào nhà có hình giống nhau phấn khích tiếng cười reo vui.

* Kết thúc :
- Cô nhận xét tổng hợp động viên các bé dọn rổ gọn gàng sạch sẽ chuyển góc học.


--------------------------------------------------
DẠNG 10: MÔN TOÁN: DẠY TRẺ XẾP TƯƠNG ÚNG 1-1 (Lĩnh vực Phát triển Nhận thức)
(Thích hợp khi dạy trẻ xếp tương ứng 1 hoa 1 chậu, 1 bát 1 thìa, 1 bạn 1 quả thơm...)

LĨNH VỰC PHÁT TRIỂN NHẬN THỨC
DẠY TRẺ XẾP TƯƠNG ÚNG 1-1

I. MỤC ĐÍCH YÊU CẦU:
1.Kiến thức:
+ Trẻ biết xếp tương ứng ghép đôi 1-1 giữa 2 nhóm đối tượng liên quan khăng khít (VD: Xếp tương ứng một chiếc thìa gắn một chiếc bát, một chậu gắn một bông hoa nở).
+ Biết xếp đều tay thành hàng thẳng lối hàng ngang từ trái qua phải nhịp nhàng.
2. Kĩ năng:
+ Rèn kĩ năng xếp tương ứng ghép đôi chuẩn xác, kĩ năng thao tác tinh xảo tay ngón tay khéo léo.
+ Rèn luyện năng lực tư duy toán học và ngôn ngữ diễn đạt rõ câu mạch lạc: xếp 1 hoa - 1 chậu.
3.Thái độ:
+ Trẻ hăng hái chăm chú tham gia học tập nghiêm túc, biết giữ gìn trân quý học cụ sạch xinh chỉnh chu.

II. CHUẨN BỊ:
+ Đồ dùng của cô: Bộ mô hình to dán bảng nam châm, bài hát toán nhạc đệm.
+ Đồ dùng của trẻ: Mỗi bạn có rổ đồ chơi bát thìa hoa chậu sẵn sàng thăng hoa sáng tạo, bảng xếp gọn.

III. TỔ CHỨC HOẠT ĐỘNG:

1. Hoạt động 1: Gây hứng thú:
+ Trò chuyện rủ rủ dẫn cả lớp vào bữa tiệc mầm non kỳ điều cần chúng ta giúp sức chia quà tương hỗ.

2, Hoạt động 2: Ôn
+ Tổ chức cho trẻ ôn nhận biết nhóm số lượng đồ vật quen thuộc trong lớp đếm nhanh tưng bừng.

3 , Hoạt động 3: Xếp tương ứng 1-1
- Cô làm mẫu lần 1: Xếp các đối tượng ra bảng ngang thẳng nếp từ trái qua phải, mỗi một bát xếp kèm đặt một thìa tương ứng kế bên đôi cặp. Cô giải thích tỉ mỉ hành động sư phạm xếp tương ứng 1-1 mẫu mực.
- Dạy trẻ thực hành: Cho các con giăng rổ tự tay thực hiện xếp đều tay bắt mắt từ trái qua phải xếp đúng 1-1 đôi cặp. Cô lượn vòng quan sát tận tụy uốn nắn nâng niu cho bé lúng túng.

4. Hoạt động 4: Luyện tập
+TC1 : [Tên trò chơi vận động hoặc trò chơi trí tuệ xếp tương ứng 1-1 sinh động, ví dụ: trò chơi tìm bạn thân]
- Cô tổ chức cho trẻ chơi sinh động rộn rã đầy náo nức sảng khoái.
- Cô quan sát động viên trẻ .

* Kết thúc:
- Tổng kết khen ngợi biểu dương các nhóm chơi ngoan, thu dọn rổ ngay hàng thẳng lối.


--------------------------------------------------
DẠNG 11: MÔN TOÁN: ĐẾM ĐẾN SỐ / NHẬN BIẾT SỐ LƯỢNG / CHỮ SỐ (Lĩnh vực Phát triển Nhận thức)
(Thích hợp dạy các bài đếm đến 3-4-5-6, nhận biết trong phạm vi số lượng, nhận biết chữ số tương ứng)

LĨNH VỰC PHÁT TRIỂN NHẬN THỨC
ĐẾM ĐẾN [SỐ CẦN HỌC], NHẬN BIẾT TRONG PHẠM VI [SỐ PHẠM VI], NHẬN BIẾT SỐ [SỐ HỌC KHÁP]
(Ví dụ đề tài: ĐẾM ĐẾN 4, NHẬN BIẾT TRONG PHẠM VI 4, NHẬN BIẾT SỐ 4)

I. MỤC ĐÍCH YÊU CẦU
1. Kiến thức
+ Trẻ biết cách đếm lần lượt từ trái sang phải không bỏ sót đối tượng nào trong phạm vi cần học.
+ Biết tạo nhóm có số lượng xác định và nhận biết mặt chữ số tương ứng sinh động.
2. Kỹ năng
+ Rèn luyện kỹ năng chỉ tay vào đối tượng đếm từng chiếc một từ trái qua phải chuẩn xác thăng bằng.
+ Rèn năng lực so sánh phân tách tạo nhóm toán thạo mạch lạc sư phạm.
3. Giáo dục
+ Giáo dục tinh thần hợp tác tập thể, yêu mến các con vật, cây cối, giữ gìn bảo vệ vệ sinh đồ dùng học tập sạch ráo ngăn nắp.

II. CHUẨN BỊ
+ Đồ dùng của cô: Thẻ chữ số lớn dán bảng, các nhóm đồ chơi hoa quả xinh đẹp gắn gọn trực quan nhảy chữ số, loa đài bản nhạc toán bốc lửa sôi nổi.
+ Đồ dùng của trẻ: Mỗi em có một rổ đồ chơi khối, hoa, quả đếm kèm thẻ chữ số tương ứng của bé tinh tươm.

III. TIẾN HÀNH HOẠT ĐỘNG (Chú ý dùng từ "III. TIẾN HÀNH HOẠT ĐỘNG" thay vì "TỔ CHỨC HOẠT ĐỘNG")

1. Hoạt động 1: Gây hứng thú
+ Lời dẫn gây bất ngờ rực rỡ, câu đố hóm hỉnh, dẫn lỗi lớp vào xứ sở những chữ số toán học thăng diệu.

2. Hoạt động 2: Ôn số lượng trong phạm vi [Số phạm vi cũ nhẹ nhàng]
+ Tổ chức cho trẻ chơi game đếm lật hình ảnh đồ vật đồ chơi sờ gõ đếm theo hiệu lệnh cô sướng vui náo nhiệt.

3. Hoạt động 3: Đếm đến [Số mới], nhận biết số lượng trong phạm vi [Số mới], nhận biết số [Đế bài]
- Cô xếp mẫu trên hàng dọc lớn nam châm từ trái sang phải, vừa đếm lớn nhịp nhàng cùng trẻ để thị phạm.
- Đặt thẻ chữ số tương thích kế bên.
- Cho trẻ lấy đồ dùng trong rổ xếp đều tăm tắp thẳng lối từ trái qua phải, chỉ tay đếm dõng dạc 1-2-3-4... đặt chữ số tương ứng. Cô kiên nhẫn sửa lỗi sửa ngọng uốn nắn đếm sót cho các con nhanh chóng.

4. Hoạt động 4: Củng cố
- Trò chơi 1: [Trò chơi khoanh hình ghép số nhanh hăng hái]
- Trò chơi 2: [Trò chơi động nhảy về nhà có chữ số hiệu lệnh tưng bừng sướng thích]
- Cô nói cách chơi luật chơi điều hành lớp chơi phấn chấn 2-3 lần.

5. Hoạt động 5: Kết thúc
- Cô nhận xét giờ học dịu dàng khen ngợi các con học ngoan đếm giỏi, cho ra chơi nhẹ bước.

` : `
YÊU CẦU & BỐ CỤC CHUẨN GIÁO ÁN TÍCH HỢP STEAM / EDP MẪU GIÁO (3-5 TUỔI) GIỐNG 100% QUY CHUẨN:
Vì giáo án này cần có định hướng STEAM hoặc EDP, bạn hãy áp dụng các nguyên lý học liên môn khoa học rực rỡ, bóc tách cụ thể các yếu tố S-T-E-A-M hoặc tiến trình 5 bước EDP phù hợp mầm non một cách tự nhiên. Dưới đây là bố cục giáo án STEAM tối ưu hoàn hảo bám sát các yêu cầu thẩm mỹ dòng trống của trường.

BỐ CỤC GIÁO ÁN STEAM / EDP YÊU CẦU:

GIÁO ÁN CHI TIẾT
+ Lĩnh vực phát triển: ${field}
+ Hoạt động học: ${activity}
+ Chủ đề chính: ${theme}
+ Đề tài bài dạy: ${topic}
+ Độ tuổi áp dụng: ${age}
+ Thời gian dự kiến: (Ước lượng khoảng thời gian phù hợp độ tuổi mẫu giáo từ 20-35 phút)
+ Loại tiết: ${lessonType}
+ Phương pháp tích hợp: STEAM (Khoa học - Công nghệ - Kỹ thuật - Nghệ thuật - Toán) hoặc EDP.

________________________________________

I. MỤC ĐÍCH, YÊU CẦU GỢI Ý

1. Kiến thức
2. Kỹ năng
3. Thái độ

________________________________________

II. CHUẨN BỊ CHI TIẾT

1. Đồ dùng của cô
2. Đồ dùng của trẻ
3. Không gian, đội hình

________________________________________

III. TIẾN TRÌNH HOẠT ĐỘNG SƯ PHẠM

1. Gây hứng thú (Khởi động - Chiếm khoảng 3-5 phút)
+ Lời dẫn trực tiếp của cô (Viết cụ thể bằng văn phong trìu mến: "Chào các con...", có trò chơi nhỏ, hát múa hoặc câu đố, tình huống bất ngờ bám sát chủ đề).
+ Hoạt động của trẻ (Quan sát, trả lời câu hỏi, hòa nhịp cùng cô).

2. Nội dung trọng tâm (Phát triển bài học - Chiếm khoảng 15-20 phút tùy độ tuổi)

Hoạt động 2.1: Trải nghiệm thực tế / Quan sát trực quan
+ Cách cô gợi mở hướng trẻ quan sát vật thật, slide, tranh ảnh.
+ Hệ thống câu hỏi đàm thoại chi tiết của cô và dự kiến câu trả lời của trẻ.
+ Cách giải quyết nếu trẻ trả lời sai hoặc chưa đúng trọng tâm (sư phạm, khích lệ).

Hoạt động 2.2: Đàm thoại chuyên sâu và thực hành, trải nghiệm
+ Cho trẻ tự tay sờ, ngửi, đếm, ghép, lắp ráp, thảo luận nhóm hoặc vẽ tranh...
+ Thể hiện rõ điểm tích hợp STEAM hoặc các bước của tiến trình EDP (Khoa học, Ý tưởng, Kế hoạch, Thiết kế/Kỹ thuật, Nghệ thuật, Toán) Lấy trẻ làm trung tâm.

Hoạt động 2.3: Đúc kết kiến thức giáo dục
+ Cô chốt lại bài học, liên hệ thực tế, lồng ghép giáo dục đạo đức, kỹ năng sống nhẹ nhàng.

3. Luyện tập / Trò chơi củng cố (Chiếm khoảng 3-5 phút)
+ Tên trò chơi: (Nghĩ ra một trò chơi vận động hoặc trò chơi trí tuệ kịch tính, hấp dẫn bám sát đề tài)
+ Luật chơi & Cách chơi: (Mô tả cực kỳ rõ ràng để giáo viên có thể tổ chức được ngay)
+ Tổ chức thực hiện: (Cách phân nhóm hoặc phân vai)

4. Kết thúc tiết học
+ Nhận xét buổi học dịu dàng, biểu dương cả lớp và một số cá nhân nổi bật.
+ Hướng dẫn chuyển sang hoạt động góc hoặc hoạt động ngoài trời.
`}

________________________________________

IV. GỢI Ý ĐỒ DÙNG TRỰC QUAN & HỌC LIỆU SỐ
+ (Gợi ý nhạc nền, âm thanh hiệu ứng, các nguyên vật liệu dễ tìm để làm đồ chơi tự chế).

V. BÀI THƠ / ĐỒNG DAO / LỜI DẪN BẮT TAI (30 GIÂY THẦN KỲ)
+ (Viết tặng riêng 1 bài thơ ngắn, bài vè, đồng dao hoặc lời dẫn cực kỳ bắt tai để cô giới thiệu đề tài thu hút sự chú ý của trẻ 100%).

VI. GỢI Ý CÂU HỎI ĐÀM THOẠI "MỞ" KÍCH THÍCH TƯ DUY
+ (Liệt kê 4-5 câu hỏi mở kích thích sự tò mò của trẻ theo mô hình Bloom: Phân tích, Đánh giá, Sáng tạo).

VII. GỢI Ý MẪU PROMPT AI ĐỂ CÔ TẠO ẢNH GIÁO CỤ MINH HỌA
+ (Cung cấp 1-2 prompt chi tiết bằng tiếng Anh và tiếng Việt để giáo viên có thể sao chép và tự tạo ảnh minh họa bài dạy trên Midjourney/Bing Image Creator).

VIII. GỢI Ý HỌC LIỆU, HÌNH ẢNH PHÙ HỢP CHO BÀI DẠY
+ Tranh ảnh minh họa cần chuẩn bị
+ Video / âm thanh gợi ý nếu có
+ Thẻ học tập / mô hình / vật thật
+ Học liệu số có thể dùng
+ Gợi ý cách sử dụng học liệu trong từng hoạt động
`;

      const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      let response = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`Đang gọi model ${modelName} để soạn giáo án...`);
          const res = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  lessonPlan: {
                    type: "STRING",
                    description: "Nội dung giáo án chi tiết và hoàn chỉnh bám sát theo tất cả các quy tắc định dạng và bố cục chuẩn.",
                  },
                },
                required: ["lessonPlan"],
              },
            },
          });
          if (res && res.text) {
            try {
              const parsed = JSON.parse(res.text.trim());
              if (parsed && typeof parsed.lessonPlan === "string") {
                response = { text: parsed.lessonPlan };
                break;
              }
            } catch (jsonErr) {
              console.warn(`Không thể parse JSON từ ${modelName}, dùng fallback text.`);
              if (res.text.includes('"lessonPlan"')) {
                const match = res.text.match(/"lessonPlan"\s*:\s*"([\s\S]*?)"\s*}/);
                if (match && match[1]) {
                  response = { text: match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\t/g, "\t") };
                  break;
                }
              }
              response = res;
              break;
            }
          }
        } catch (err: any) {
          console.error(`Lỗi khi dùng model ${modelName}:`, err.message || err);
          lastError = err;
        }
      }

      if (!response) {
        throw new Error(
          lastError?.message || 
          "Hệ thống AI hiện đang bận hoặc quá tải trên tất cả các dòng máy chủ. Cô vui lòng nhấn 'Tiến hành soạn giáo án gốc' để thử lại sau vài giây."
        );
      }

      const lessonPlan = response.text || "Không thể tạo nội dung giáo án.";
      res.json({ lessonPlan });
    } catch (error: any) {
      console.error("Lỗi khi soạn giáo án với Gemini:", error);
      res.status(500).json({ error: error.message || "Lỗi máy chủ khi tạo giáo án." });
    }
  });

  // API router to refine an existing lesson plan
  app.post("/api/refine-lesson-plan", async (req, res) => {
    try {
      const { currentPlan, refinementRequest, age, field, activity, lessonType, theme, topic } = req.body;

      if (!currentPlan || !refinementRequest) {
        return res.status(400).json({ error: "Vui lòng cung cấp giáo án hiện tại và nội dung yêu cầu điều chỉnh." });
      }

      const ai = getGeminiClient();

      const prompt = `
Bạn là trợ lý soạn giáo án mầm non. Khi nhận thông tin từ người dùng, hãy tạo giáo án theo đúng cấu trúc yêu cầu. Kết quả trả về bắt buộc là JSON hợp lệ, không có markdown, không có HTML, không có giải thích bên ngoài JSON. Tất cả chuỗi phải đặt trong dấu ngoặc kép, không dùng dấu phẩy thừa.

GIÁO ÁN HIỆN TẠI ĐANG CÓ:
${currentPlan}

YÊU CẦU ĐIỀU CHỈNH / CẢI TIẾC HOẶC BỔ SUNG CỦA GIÁO VIÊN:
"${refinementRequest}"

QUY TẮC ĐỊNH DẠNG VÀ TRÌNH BÀY BẮT BUỘC (PHẢI TUÂN THỦ TUYỆT ĐỐI KHI PHẢN HỒI):
1. BỐ CỤC CHUNG VÀ THÔNG TIN BÀI DẠY:
- PHẦN THÔNG TIN CHUNG PHẢI TRÌNH BÀY MỖI NỘI DUNG TRÊN MỘT DÒNG RIÊNG BIỆT (Không được phép viết gộp hay viết liền nhiều nội dung trên cùng một dòng).
  Ví dụ định dạng bắt buộc:
  CHỦ ĐỀ: [Tên chủ đề]
  ĐỀ TÀI: [Tên đề tài]
  LĨNH VỰC: [Lĩnh vực chính]
  ĐỘ TUỔI: [Độ tuổi áp dụng]
  THỜI GIAN: [Thời gian phút tự động xác định]
  NGÀY DẠY: ……………
  GIÁO VIÊN: ……………
  (Phải xuống dòng rõ ràng riêng từng thông tin trên, không viết chung dòng).

- TỰ ĐỘNG XÁC ĐỊNH THỜI GIAN DỰ KIẾN PHÙ HỢP THEO ĐỘ TUỔI để ghi vào mục 'THỜI GIAN':
  + Nhóm Nhà trẻ 24-36 tháng: 12 - 15 phút
  + Nhóm Mẫu giáo 3-4 tuổi: 20 - 25 phút
  + Nhóm Mẫu giáo 4-5 tuổi: 25 - 30 phút
  + Nhóm Mẫu giáo 5-6 tuổi: 30 - 35 phút
  + Nếu là hoạt động trải nghiệm, STEAM, STEM, dự án hoặc thao giảng: Hãy tăng thêm 5 - 10 phút.

- KHI ĐIỀU CHỈNH HOẶC HOÀN THIỆN:
  + Không để các đoạn văn quá dài. Mỗi ý tưởng hoặc phát biểu của cô phải xuống dòng riêng biệt.
  + Không tự động gộp dòng, không tự động dồn nội dung vào một dòng dài. Ưu tiên giữ đúng bố cục truyền thống của Phòng Giáo dục mầm non Việt Nam để giáo viên dễ đọc và dễ in.
  + Không có khoảng trắng rỗng thừa vô ích giữa các dòng.

2. QUY ĐỊNH TIÊU ĐỀ MỤC LỚN BẮT BUỘC (VIẾT IN HOA, IN ĐẬM):
- Các mục lớn bắt buộc phải VIẾT HOA TOÀN BỘ và IN ĐẬM (dùng ký pháp markdown "**") và luôn đứng ở dòng riêng biệt.
- Danh sách 4 tiêu đề mục lớn bắt buộc gồm:
  **I. MỤC ĐÍCH - YÊU CẦU:**
  **II. CHUẨN BỊ:**
  **III. TỔ CHỨC HOẠT ĐỘNG:**
  **IV. ĐÁNH GIÁ CUỐI HOẠT ĐỘNG:**

3. QUY ĐỊNH MỤC NHỎ:
- Các mục nhỏ dưới đây viết in đậm (dùng ký pháp markdown "**"), và luôn xuống dòng riêng biệt (không viết liền văn bản ở cùng dòng tiêu đề):
  **1. Kiến thức:**
  **2. Kỹ năng:**
  **3. Thái độ:**
  **1. Hoạt động mở đầu:**
  **2. Hoạt động trọng tâm:**
  **3. Hoạt động kết thúc:**
  - Tuyệt đối xếp các đề mục nhỏ này đứng ở một dòng độc lập.

4. ĐIỀU CHỈNH ĐỊNH DẠNG BẢNG "HOẠT ĐỘNG CỦA CÔ - HOẠT ĐỘNG CỦA TRẺ" (CHUẨN KHÔNG CÓ LẶP LẠI TIÊU ĐỀ):
- Toàn bộ tiến trình hoạt động tương tác giữa cô và trẻ trong mục "**III. TỔ CHỨC HOẠT ĐỘNG:**" bắt buộc phải được trình bày trong MỘT BẢNG 2 CỘT bằng cú pháp bảng MarkDown.
- Bảng này bắt buộc phải có cấu trúc như sau:
  + Trong toàn bộ giáo án chỉ được phép tạo DUY NHẤT MỘT LẦN dòng tiêu đề bảng ở đầu bảng:
    | HOẠT ĐỘNG CỦA CÔ | HOẠT ĐỘNG CỦA TRẺ |
    |---|---|
  + Tuyệt đối KHÔNG ĐƯỢC tạo thêm bảng mới, không chia thành nhiều bảng nhỏ, không lặp lại dòng tiêu đề cột trên khi nội dung chuyển sang trang mới hay phần sự vụ mới. Toàn bộ tiến trình hoạt động là một thể liền mạch trong đúng một bảng duy nhất.
  + Toàn bộ nội dung chi tiết bài dạy của cô phải nằm liên tục trong cùng một ô bên trái (ô nội dung của cột 1).
  + Toàn bộ phản hồi, hành động dự kiến hay câu trả lời của trẻ tương ứng phải nằm liên tục trong cùng một ô bên phải (ô nội dung của cột 2).
  + Bảng CHỈ ĐƯỢC CÓ đúng 1 hàng tiêu đề đầu tiên và đúng 1 HÀNG NỘI DUNG DUY NHẤT ở bên dưới. Tuyệt đối không chia thành nhiều hàng ngang hay phân tách các hoạt động thành các hàng riêng biệt.
  + Để xuống dòng ngăn cách giữa các hoạt động hoặc xuống dòng ghi nội dung trong cùng một ô hoạt động, BẮT BUỘC sử dụng thẻ "<br>" (hoặc nhiều thẻ "<br>" nếu cần) trong Markdown để phân tách các ý, các đoạn, các hoạt động một cách rõ ràng và đẹp mắt, không để khoảng trắng trống thừa.
  + Trong ô hoạt động của cô (ô trái), trình bày lần lượt các hoạt động và ghi rõ tiêu đề bằng chữ viết hoa, in đậm (ví dụ: "**1. Hoạt động mở đầu:**", "**2. Hoạt động trọng tâm:**", "**3. Hoạt động kết thúc:**" hoặc "**HOẠT ĐỘNG 1: ...**", "**HOẠT ĐỘNG 2: ...**") làm tiêu mốc lớn. Các mục nhỏ hơn bên trong viết chữ thường, in đậm (ví dụ: "**a. Tiến trình thực hiện:**").
  + Trong ô hoạt động của trẻ (ô phải), trình bày toàn bộ các nội dung phản ứng tương ứng của trẻ, bám sát các Hoạt động 1, 2, 3 của cô nằm gọn trong cùng một ô này, không chia hàng ngang.
- Ví dụ mẫu định dạng cú pháp MarkDown chuẩn bắt buộc (Chú ý dùng thẻ <br> để xuống dòng nội bộ trong ô):
| HOẠT ĐỘNG CỦA CÔ | HOẠT ĐỘNG CỦA TRẺ |
|---|---|
| **1. Hoạt động mở đầu** <br> Cô xúm xít trẻ lại gần, giới thiệu hộp quà bí mật... <br><br> **2. Hoạt động trọng tâm** <br> **a. Tiến trình hoạt động:** <br> Cô hướng dẫn trẻ làm mẫu... <br><br> **3. Hoạt động kết thúc** <br> Cô cho trẻ thu dọn đồ chơi nhẹ nhàng... | Trẻ xúm xít quanh cô và háo hức chờ đợi món quà. <br><br> Trẻ chú ý quan sát cô làm mẫu. <br><br> Trẻ cùng cô thu dọn đồ chơi gọn gàng. |
- Nghiêm cấm tạo thêm bất kỳ hàng ngang nào khác dưới bảng. Tất cả mọi thứ phải nằm trọn vẹn trong đúng 1 ô duy nhất cho cô và 1 ô duy nhất cho trẻ. Không viết tự do ngoài bảng đối với phần tiến trình.
- Áp dụng thống nhất mẫu bảng duy nhất này cho tất cả giáo án (Nhà trẻ, 3-4 tuổi, 4-5 tuổi, 5-6 tuổi, mọi lĩnh vực, mọi hoạt động học, mọi giáo án thao giảng, dự thi, STEM, STEAM, AI).

5. QUY ĐỊNH NGHIÊM NGẶT VỀ DẤU GẠCH ĐẦU DÒNG (KHÔNG DÙNG BULLET):
- TUYỆT ĐỐI KHÔNG SỬ DỤNG DANH SÁCH BULLET HOẶC KÝ TỰ CHẤM TRÒN, Ô VUÔNG: Nghiêm cấm hoàn toàn tất cả các ký tự như "•", "○", "●", "◦", "▪", "♦", "▫" cả trong Markdown lẫn khi xuất văn bản.
- CHỈ SỬ DỤNG DUY NHẤT DẤU GẠCH NGANG TRƠN ĐƠN GIẢN ("-") ở đầu mỗi ý nhỏ (Ví dụ: "- Trẻ nhận biết...", "- Rèn kỹ năng...", "- Hứng thú tham gia...").
- Quy tắc này bắt buộc áp dụng cho TẤT CẢ giáo án (Nhà trẻ, 3-4 tuổi, 4-5 tuổi, 5-6 tuổi, mọi lĩnh vực, mọi môn học, mọi chủ đề, mọi hoạt động, mọi giáo án thường, giáo án thao giảng, giáo án dự thi, giáo án tích hợp STEM, STEAM, AI, Chuyển đổi số...).
- Tất cả các mục dưới đây khi liệt kê các ý nhỏ đều phải sử dụng gạch ngang "-":
  + I. Mục đích - yêu cầu (Kiến thức, Kỹ năng, Thái độ)
  + II. Chuẩn bị
  + III. Tổ chức hoạt động (Nội dung hoạt động của cô, Hoạt động của trẻ bên trong bảng)
  + IV. Đánh giá cuối hoạt động
  + * Các phần phụ như: Gợi ý học liệu, Sáng kiến sáng tạo, Nội dung tích hợp, STEM, STEAM, AI, Chuyển đổi số...
- Không sử dụng các tính năng tạo danh sách tự động của Word/Markdown mà hãy tự gõ dấu gạch ngang "-" và dấu cách thủ công ở đầu dòng để khi xuất ra file Word hiển thị đẹp nhất dưới dạng ký tự gạch ngang thuần túy.

6. QUY ĐỊNH KHÁC:
- Không chèn dòng trống thừa giữa các đoạn, dòng thừa rỗng.
- Bảo toàn các phần nội dung hay đã có khác trong giáo án, chỉ tập trung sửa đổi chính xác theo mong muốn của cô.

7. QUY QUY ĐỊNH LÀM NỔI BẬT NỘI DUNG CÔNG NGHỆ, ĐIỆN TỬ, CHUYỂN ĐỔI SỐ VÀ STEM/STEAM:
- Đối với tất cả giáo án được tạo ra từ hệ thống, bất kể độ tuổi, chủ đề, lĩnh vực, môn học, loại tiết, giáo án thường, thao giảng, dự thi... các nội dung liên quan đến:
  + AI
  + Trí tuệ nhân tạo
  + Chuyển đổi số
  + Năng lực số
  + Công nghệ số
  + STEM
  + STEAM
  + Học liệu số
  + Slide tương tác
  + Video học liệu
  + Thiết bị số
  + Trò chơi tương tác
  + Ứng dụng công nghệ
  bắt buộc phải được tự động làm nổi bật bằng cách vừa IN ĐẬM vừa IN NGHIÊM để giáo viên dễ nhận biết.
- Trong văn bản phản hồi, hãy viết các cụm từ, câu hoặc phần này sử dụng cú pháp markdown: \`**_Nội dung..._**\` (hoặc \`**_*Nội dung...*_**\`), để hệ thống bóc tách tự động và hiển thị chữ màu xanh dương đậm trong ứng dụng trực tuyến và cả khi tải về file Word/PDF.
- Ví dụ mẫu bắt buộc:
  + **_Ứng dụng AI: Trẻ quan sát hình ảnh mô phỏng vòng đời con bướm trên màn hình tương tác._**
  + **_Chuyển đổi số: Trẻ tham gia trò chơi nhận biết các giai đoạn phát triển của bướm trên slide tương tác._**
  + **_Hoạt động STEM: Trẻ tạo mô hình vòng đời của bướm bằng nguyên vật liệu tái chế._**

Hãy tạo ra giáo án cải tiến hoàn chỉnh (trả về toàn bộ nội dung giáo án hoàn chỉnh đã sửa đổi từ đầu tới cuối, không viết lửng lơ hay ghi tóm tắt).
`;

      const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      let response = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`Đang gọi model ${modelName} để cập nhật giáo án theo yêu cầu cải tiến...`);
          const res = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  lessonPlan: {
                    type: "STRING",
                    description: "Nội dung giáo án chi tiết và hoàn chỉnh bám sát theo tất cả các quy tắc định dạng và bố cục chuẩn đã điều chỉnh.",
                  },
                },
                required: ["lessonPlan"],
              },
            },
          });
          if (res && res.text) {
            try {
              const parsed = JSON.parse(res.text.trim());
              if (parsed && typeof parsed.lessonPlan === "string") {
                response = { text: parsed.lessonPlan };
                break;
              }
            } catch (jsonErr) {
              console.warn(`Không thể parse JSON cải tiến từ ${modelName}, dùng fallback text.`);
              if (res.text.includes('"lessonPlan"')) {
                const match = res.text.match(/"lessonPlan"\s*:\s*"([\s\S]*?)"\s*}/);
                if (match && match[1]) {
                  response = { text: match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\t/g, "\t") };
                  break;
                }
              }
              response = res;
              break;
            }
          }
        } catch (err: any) {
          console.error(`Lỗi khi dùng model ${modelName} chỉnh sửa giáo án:`, err.message || err);
          lastError = err;
        }
      }

      if (!response) {
        throw new Error(
          lastError?.message || 
          "Hệ thống AI hiện đang bận. Cô vui lòng thử lại yêu cầu điều chỉnh sau vài giây."
        );
      }

      const refinedPlan = response.text || "Không thể điều chỉnh nội dung giáo án.";
      res.json({ lessonPlan: refinedPlan });
    } catch (error: any) {
      console.error("Lỗi khi điều chỉnh giáo án:", error);
      res.status(500).json({ error: error.message || "Lỗi máy chủ khi điều chỉnh giáo án." });
    }
  });

  // Client SPA setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
