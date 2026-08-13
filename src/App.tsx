import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, Sparkles, Wand2, Copy, Trash2, BookOpen, Clock, 
  Download, Edit3, Eye, FilePlus, RefreshCw, CheckCircle2, 
  Printer, Calendar, Smile, Info, Check, ChevronRight, X,
  Music, Tv, Hammer, Volume2, Image
} from "lucide-react";

import { LessonPlanRequest, SavedLessonPlan } from "./types";
import { PRESET_TOPICS } from "./presets";

const AGE_OPTIONS = [
  "Nhà trẻ 24-36 tháng",
  "Mẫu giáo 3-4 tuổi",
  "Mẫu giáo 4-5 tuổi",
  "Mẫu giáo 5-6 tuổi",
  "Lớp ghép"
];

const FIELD_OPTIONS = [
  "Phát triển thể chất",
  "Phát triển nhận thức",
  "Phát triển ngôn ngữ",
  "Phát triển tình cảm và kỹ năng xã hội",
  "Phát triển thẩm mỹ",
  "Phát triển ngôn ngữ lớp ghép",
  "Phát triển nhận thức lớp ghép"
];

const ACTIVITY_OPTIONS = [
  "Khám phá khoa học",
  "Làm quen với toán",
  "Làm quen chữ cái",
  "Làm quen văn học",
  "Âm nhạc",
  "Tạo hình",
  "Giáo dục thể chất",
  "Kỹ năng sống",
  "Làm quen chữ cái tiết ghép",
  "Làm quen với toán tiết ghép"
];

const LESSON_TYPE_OPTIONS = [
  { value: "Tiết dạy bình thường trên lớp", label: "Tiết dạy bình thường" },
  { value: "Tiết thao giảng", label: "Tiết thao giảng cấp Tổ/Trường" },
  { value: "Tiết thi giáo viên giỏi", label: "Tiết thi Giáo viên giỏi cấp Quận/Huyện" }
];

const sanitizeLessonPlanText = (text: string): string => {
  if (!text) return "";
  return text
    // Clean up any remaining markdown heading hashes at the start of lines
    .split("\n")
    .map(line => {
      let cleanLine = line;
      if (cleanLine.trim().startsWith("#")) {
        cleanLine = cleanLine.replace(/^[#\s]+/, "");
      }
      let trimmed = cleanLine.trim();
      // Replace bullet characters at the start of lines with "- "
      if (/^[•●▪◆⁃◦■*+]\s+/.test(trimmed)) {
        return cleanLine.replace(/^[ \t]*[•●▪◆⁃◦■*+]\s+/, "- ");
      }
      return cleanLine;
    })
    .join("\n");
};

const applyTechHighlighting = (text: string): string => {
  if (!text) return "";
  const terms = [
    "Ứng dụng công nghệ",
    "Ứng dụng AI",
    "Trí tuệ nhân tạo",
    "Trò chơi tương tác",
    "Chuyển đổi số",
    "Video học liệu",
    "Slide tương tác",
    "Năng lực số",
    "Công nghệ số",
    "Học liệu số",
    "Thiết bị số",
    "STEAM",
    "STEM",
    "AI"
  ];
  let result = text;
  for (const term of terms) {
    let regex: RegExp;
    if (term === "AI" || term === "STEM" || term === "STEAM") {
      regex = new RegExp(`(?<![A-Za-z0-9_*_\\/])(${term})(?![A-Za-z0-9_*_\\/])`, "g");
    } else {
      regex = new RegExp(`(?<![A-Za-z0-9_đăâêôơưĐĂÂÊÔƠƯ_*_])(${term})(?![A-Za-z0-9_đăâêôơưĐĂÂÊÔƠƯ_*_])`, "gi");
    }
    result = result.replace(regex, "**_$1_**");
  }
  return result;
};

const applyTechWordStyling = (html: string): string => {
  if (!html) return "";
  let res = html;
  res = res.replace(/\*\*_(.*?)_\*\*/g, '<span style="color:#002060 !important; font-weight:bold !important; font-style:italic !important;">$1</span>');
  res = res.replace(/_\*\*(.*?)\*\*_/g, '<span style="color:#002060 !important; font-weight:bold !important; font-style:italic !important;">$1</span>');
  res = res.replace(/\*\*\*(.*?)\*\*\*/g, '<span style="color:#002060 !important; font-weight:bold !important; font-style:italic !important;">$1</span>');
  res = res.replace(/\*_(.*?)_\*/g, '<span style="color:#002060 !important; font-weight:bold !important; font-style:italic !important;">$1</span>');
  res = res.replace(/_\*(.*?)\*_/g, '<span style="color:#002060 !important; font-weight:bold !important; font-style:italic !important;">$1</span>');
  return res;
};

const convertTextToHtml = (text: string): string => {
  if (!text) return "";
  
  const highlighted = applyTechHighlighting(text);

  // Escape HTML characters
  let html = highlighted
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Restore line breaks
  html = html.replace(/&lt;br\s*\/?&gt;/gi, "<br/>");

  // Style technology words
  html = applyTechWordStyling(html);

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  const lines = html.split("\n");
  const processedLines: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Tables parsing
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--; // Step back because outer loop increments

      if (tableLines.length > 0) {
        processedLines.push('<div class="overflow-x-auto my-4">');
        processedLines.push('<table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse !important; border:1px solid #000000 !important; font-family:\'Times New Roman\', serif; background-color:#ffffff !important;">');
        processedLines.push('<tbody>');
        let isFirstRow = true;
        
        for (let j = 0; j < tableLines.length; j++) {
          const tableRow = tableLines[j];
          const isSeparator = /^\|[\s-|-]*\|$/.test(tableRow) && tableRow.includes("---");
          if (isSeparator) {
            continue;
          }

          const rawCols = tableRow.split("|");
          const cols = rawCols.slice(1, rawCols.length - 1).map(c => c.trim());

          if (isFirstRow) {
            processedLines.push('<tr>');
            for (const col of cols) {
              let formattedCol = col
                .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/g, "<strong>$1</strong>");
              formattedCol = applyTechWordStyling(formattedCol);
              formattedCol = formattedCol.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
              processedLines.push(`<td style="border:1px solid #000000 !important; padding:6px 8px !important; text-align:center !important; font-weight:bold !important; background-color:#ffffff !important; font-family:\'Times New Roman\', serif; font-size:14pt; color:#000000 !important; vertical-align:top !important;">${formattedCol}</td>`);
            }
            processedLines.push('</tr>');
            isFirstRow = false;
          } else {
            processedLines.push('<tr>');
            for (const col of cols) {
              let formattedCol = col
                .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/g, "<strong>$1</strong>");
              formattedCol = applyTechWordStyling(formattedCol);
              formattedCol = formattedCol.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
              processedLines.push(`<td style="border:1px solid #000000 !important; padding:6px 8px !important; text-align:left !important; vertical-align:top !important; font-family:\'Times New Roman\', serif; font-size:14pt; color:#000000 !important; background-color:#ffffff !important;">${formattedCol}</td>`);
            }
            processedLines.push('</tr>');
          }
        }
        
        processedLines.push('</tbody>');
        processedLines.push('</table>');
        processedLines.push('</div>');
      }
      continue;
    }

    if (trimmed.startsWith("+ ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (inList) {
        processedLines.push("</ul>");
        inList = false;
      }
      const itemContent = trimmed.replace(/^(\+\s*)|(-\s*)|(\*\s*)/, "");
      processedLines.push(`<p style="margin-left: 0; padding-left: 0; margin-bottom: 6pt;">- ${itemContent}</p>`);
    } else {
      if (inList) {
        processedLines.push("</ul>");
        inList = false;
      }
      if (trimmed === "") {
        processedLines.push('<p class="empty-line">&nbsp;</p>');
      } else {
        // Check if line is a header like "I. MỤC ĐÍCH YÊU CẦU" or "Hoạt động 1:" or "Thứ hai ngày..." or full capitals
        const isHeader = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC|PHẦN|CHỦ ĐỀ|ĐỀ TÀI)\.?\s+/i.test(trimmed) || 
                         /^(Hoạt động|Trò chơi|Phần|Bước)\s+\d+/i.test(trimmed) ||
                         /^[A-ZĐĂÂÊÔƠƯ\s]{6,120}$/.test(trimmed) ||
                         (trimmed.startsWith("<strong>") && trimmed.endsWith("</strong>"));
        if (isHeader) {
          const cleanText = trimmed.replace(/<[^>]+>/g, "").trim();
          const hasUppercase = /[A-ZĐĂÂÊÔƠƯ]/.test(cleanText);
          const hasLowercase = /[a-zđăâêôơư]/.test(cleanText);
          const livesInTitle = hasUppercase && !hasLowercase && !/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC|PHẦN)\.?\s+/i.test(cleanText);
          if (livesInTitle) {
            processedLines.push(`<h2 class="title-header" style="text-align: center !important; font-weight: bold !important; margin: 4px 0 !important; font-size: 14pt !important; margin-left: 0 !important; padding-left: 0 !important; text-indent: 0 !important;">${trimmed}</h2>`);
          } else {
            processedLines.push(`<h2>${trimmed}</h2>`);
          }
        } else {
          const cleanText = trimmed.replace(/<[^>]+>/g, "").trim();
          const hasUppercase = /[A-ZĐĂÂÊÔƠƯ]/.test(cleanText);
          const hasLowercase = /[a-zđăâêôơư]/.test(cleanText);
          const livesInTitle = hasUppercase && !hasLowercase && !/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC|PHẦN)\.?\s+/i.test(cleanText) && cleanText.length > 5;
          if (livesInTitle) {
            processedLines.push(`<p class="title-header" style="text-align: center !important; font-weight: bold !important; margin: 4px 0 !important; font-size: 14pt !important; margin-left: 0 !important; padding-left: 0 !important; text-indent: 0 !important;">${trimmed}</p>`);
          } else {
            processedLines.push(`<p>${trimmed}</p>`);
          }
        }
      }
    }
  }

  if (inList) {
    processedLines.push("</ul>");
  }

  return processedLines.join("\n");
};

const INTEGRATION_OPTIONS = [
  { id: "trung-tam", label: "Lấy trẻ làm trung tâm", description: "Trẻ chủ động trải nghiệm, cô gợi mở" },
  { id: "steam", label: "Phương pháp STEAM", description: "Khoa học, Ý tưởng, Kỹ thuật, Nghệ thuật, Toán" },
  { id: "ai", label: "Ứng dụng trí tuệ AI", description: "Màn chiếu AI, bé tương tác hội thoại" },
  { id: "digital", label: "Năng lực số", description: "Công cụ tương tác số, nhạc nền thông minh" },
  { id: "cam-xuc-xa-hoi", label: "Giáo dục cảm xúc - kỹ năng xã hội", description: "Nhận biết cảm xúc, hợp tác, chia sẻ, giao tiếp tích cực" },
  { id: "bao-ve-moi-truong", label: "Giáo dục bảo vệ môi trường", description: "Tiết kiệm nước, phân loại rác, trồng cây, bảo vệ thiên nhiên" },
  { id: "gia-tri-song", label: "Giáo dục giá trị sống", description: "Yêu thương, trung thực, trách nhiệm, biết quan tâm người khác" },
  { id: "an-toan", label: "Giáo dục an toàn cho trẻ", description: "An toàn giao thông, an toàn điện, phòng tránh tai nạn thương tích" },
  { id: "dia-phuong", label: "Giáo dục địa phương", description: "Văn hóa dân tộc, lễ hội, nghề truyền thống, cảnh đẹp quê hương" },
  { id: "trai-nghiem", label: "Hoạt động trải nghiệm", description: "Quan sát, khám phá, thực hành, học qua tình huống thực tế" },
  { id: "montessori", label: "Phương pháp Montessori", description: "Trẻ tự lựa chọn, thao tác với học liệu, rèn tính tự lập" },
  { id: "hoa-nhap", label: "Giáo dục hòa nhập", description: "Tôn trọng sự khác biệt, hỗ trợ trẻ yếu, trẻ chậm phát triển" },
  { id: "van-hoa-doc", label: "Văn hóa đọc", description: "Làm quen sách, kể chuyện sáng tạo, góc thư viện của bé" },
  { id: "tu-duy-sang-tao", label: "Phát triển tư duy sáng tạo", description: "Đặt câu hỏi mở, giải quyết vấn đề, sáng tạo sản phẩm" }
];

const getSuggestedMaterials = (topic: string, activity: string) => {
  const t = (topic || "").toLowerCase();
  const act = (activity || "").toLowerCase();
  
  if (t.includes("bướm") || t.includes("sâu") || t.includes("côn trùng") || t.includes("động vật") || t.includes("chim") || t.includes("cá") || t.includes("rừng")) {
    return {
      songs: [
        { name: "🎵 Kìa Con Bướm Vàng", desc: "Nhạc khởi động vui tươi giúp bé hóa thân thành bướm xinh dạo chơi" },
        { name: "🎵 Chị Ong Nâu Và Em Bé", desc: "Âm điệu nhí nhảnh khơi gợi tinh thần chăm chỉ yêu thiên nhiên" }
      ],
      diyMaterials: [
        { name: "🍂 Lá cây, cành khô rụng ngoài sân", desc: "Cô hướng dẫn bé làm thủ công cánh bướm rực rỡ dán lên bảng" },
        { name: "🥄 Thìa sữa chua nhựa cũ + Giấy màu", desc: "Sáng chế chú sâu nhỏ bò ngộ nghĩnh tương tác câu chuyện" }
      ],
      digitalResources: [
        { name: "📺 Video 'Quá trình lột xác của Bác Sâu béo'", desc: "Clip khoa học mầm non sinh động dài 2 phút lý thú" },
        { name: "📱 Kho slide tương tác côn trùng", desc: "Hình ảnh kích thước lớn sống động chiếu tương tác thông minh" }
      ],
      soundEffects: "🔊 Âm thanh chim hót rì rào, tiếng suối chảy ngọt ngào nâng giấc trí tưởng tượng.",
      imagePrompt: "A cute fluffy cartoon caterpillar turning into a beautiful colorful butterfly, magical enchanted forest background, watercolor pastel art style, warm cozy lighting, highly detailed for kindergarten kids."
    };
  }
  
  if (t.includes("toán") || t.includes("số") || t.includes("đếm") || t.includes("gấu") || t.includes("hình") || act.includes("toán")) {
    return {
      songs: [
        { name: "🎵 Bé Tập Đếm (1-2-3-4-5)", desc: "Hát vỗ tay đồng dao vui vẻ giúp bé ghi nhớ nhanh thứ tự các số" },
        { name: "🎵 Năm Ngón Tay Ngoan", desc: "Nhịp điệu nhí nhảnh nhận biết bàn tay và lượng số lượng" }
      ],
      diyMaterials: [
        { name: "🔘 Cúc áo màu sắc + Hạt nhựa tròn", desc: "Trẻ tập chia nhóm tập đếm, xếp tương ứng 1-1 và đúc kết" },
        { name: "📦 Hộp bìa cát-tông cũ tái chế", desc: "Sơn màu tạo ngôi nhà số thần kỳ để bé chơi trò tìm giấu đồ chơi" }
      ],
      digitalResources: [
        { name: "📺 Hoạt hình 'Những con số đáng yêu'", desc: "Video hoạt họa sinh động 3 phút giới thiệu mặt các chữ số" },
        { name: "📱 Trò chơi đếm lê, táo trên màn chiếu", desc: "Slide bé tương tác chọn ô ghép số lượng tương ứng hào hứng" }
      ],
      soundEffects: "🔊 Hiệu ứng âm thanh 'Ting Ting' vui tai khi trẻ đếm chuẩn reo vang ngọt lành.",
      imagePrompt: "A cute happy cartoon teddy bear holding a big glowing number 3 board, friendly colorful classroom background, soft watercolor and line art art style, bright warm colors."
    };
  }

  if (t.includes("mẹ") || t.includes("gia đình") || t.includes("thơ") || t.includes("văn học") || t.includes("chữ") || act.includes("văn học") || act.includes("chữ cái")) {
    return {
      songs: [
        { name: "🎵 Yêu Mẹ (Đọc thơ trên nền nhạc)", desc: "Nền nhạc violon và piano êm dịu nâng niu cảm xúc ngọt thương của bé" },
        { name: "🎵 Cả Nhà Thương Nhau", desc: "Bài hát gia đình kinh điển tạo không khí lớp học ấm áp sum vầy tâm tình" }
      ],
      diyMaterials: [
        { name: "🪵 Que kem gỗ nhiều màu + Keo sữa", desc: "Bé tự lắp ghép khung ảnh lưu giữ khoảnh khắc gia đình yêu thương" },
        { name: "🎭 Rối dẹt ngón tay bằng bìa dạ dán", desc: "Cô trang bị rối miêu tả các nhân vật trong bài thơ ngọt ngào" }
      ],
      digitalResources: [
        { name: "📺 Kể chuyện tranh cát 'Tình mẹ bao la'", desc: "Học liệu số chạm đến cảm xúc sâu sắc lòng hiếu thảo của trẻ" },
        { name: "📱 Bộ chữ cái/từ khóa cách điệu vui nhộn", desc: "Ảnh phông chữ to rõ nét trình chiếu góc tương tác từ vựng sư phạm" }
      ],
      soundEffects: "🔊 Âm thanh tiếng cười vui trẻ thơ ấm áp đầy yêu thương làm điểm nhấn bài dạy thắm thiết.",
      imagePrompt: "A cozy loving cartoon family together, mother, father and cozy cute child hugging, garden with lots of nice flowers, watercolor paper textured art style, heartwarming and beautiful, pastel coloring."
    };
  }

  if (t.includes("vẽ") || t.includes("nặn") || t.includes("tạo hình") || t.includes("xà phòng") || t.includes("cầu vồng") || t.includes("bong bóng") || act.includes("tạo hình")) {
    return {
      songs: [
        { name: "🎵 Cho Tôi Đi Làm Mưa Với", desc: "Giai điệu vui sướng rộn rã kích thích óc liên tưởng thiên nhiên của trẻ" },
        { name: "🎵 Mưa Rơi Tí Tách", desc: "Nhạc không lời réo rắt dịu êm kích thích tư duy phát triển thẩm mỹ sắc màu" }
      ],
      diyMaterials: [
        { name: "🧴 Nước xà phòng tắm em bé dịu nhẹ", desc: "Dung dịch thổi bong bóng an toàn tuyệt hảo không lo cay mắt dồi dào" },
        { name: "🎨 Màu nước ngũ sắc + Khay giấy bánh", desc: "Bé thực hành loang màu bong bóng tạo bức tranh mầm non nguyên bản rực rỡ" }
      ],
      digitalResources: [
        { name: "📺 Video hoạt cảnh hiện tượng 'Cầu vồng sau mưa'", desc: "Cung cấp kiến thức trực quan sắc màu khúc xạ ánh sáng" },
        { name: "📱 Gợi ý bộ tranh tạo hình đa chất liệu mẫu", desc: "Tranh cô làm bằng cúc áo, lá khô giúp trẻ khơi mạch sáng tạo nghệ thuật" }
      ],
      soundEffects: "🔊 Tiếng giọt mưa tí tách rơi rộn rã, tiếng bong bóng xà phòng nổ xèo xèo vui nhộn rộn ràng.",
      imagePrompt: "Cheerful happy cartoon kindergarten children blowing large beautiful soap bubbles in a sunny flower park, cute colors, hand-drawn colored pencils and light watercolor style."
    };
  }

  if (t.includes("thể chất") || t.includes("bò") || t.includes("chạy") || t.includes("ném") || t.includes("bóng") || act.includes("thể chất") || t.includes("an toàn") || t.includes("kỹ năng")) {
    return {
      songs: [
        { name: "🎵 Đường và Chân", desc: "Bài hát nhịp bước đều 1-2 giúp bé rèn phản xạ đi nề nếp khỏe khoắn" },
        { name: "🎵 Tập Thể Dục Buổi Sáng", desc: "Nhạc khỏe khoắn réo rắt khơi gợi năng lượng vươn vai chào ngày sôi động" }
      ],
      diyMaterials: [
        { name: "🎈 Bóng bay bọc vải bền chắc + Vòng nhựa", desc: "Tận dụng tập ném trúng đích nhẹ nhàng an toàn tuyệt đối cho bé" },
        { name: "🚩 Cờ lệnh nhiều sắc màu rực rỡ", desc: "Tạo vạch phân tuyến thi đua và ranh giới đường đua cho trò chơi hào hứng" }
      ],
      digitalResources: [
        { name: "📺 Hoạt hình hướng dẫn tư thế tập chuẩn", desc: "Giúp trẻ mầm non dễ dàng học bắt chước kỹ năng bò đi khéo léo" },
        { name: "📱 Clip kỹ năng thoát hiểm khi hỏa hoạn", desc: "Tình huống số tương tác hữu ích dạy trẻ giữ bình tĩnh khói bụi" }
      ],
      soundEffects: "🔊 Tiếng còi hiệu lệnh vui nhộn vang dội thúc giục tinh thần thể thao hào nhoáng khỏe khoắn.",
      imagePrompt: "Cute excited cartoon kindergarten toddlers jumping and playing with bubbles and balls, clean meadow background, warm morning sunshine, pastel watercolor oil brush style, high contrast, safe play design."
    };
  }

  return {
    songs: [
      { name: "🎵 Trường Cháu Đây Là Trường Mầm Non", desc: "Giai điệu tưng bừng tạo hứng khởi và nề nếp hăng say tích cực" },
      { name: "🎵 Vui Đến Trường", desc: "Nhịp điệu rộn ràng cười mỉm, kích thích bé tự giác thích thú đi lớp" }
    ],
    diyMaterials: [
      { name: "📦 Thùng cát-tông, giấy báo cũ, chai lọ sạch", desc: "Hô biến chế tác đa năng thành nhạc cụ gõ đệm gõ thanh handmade siêu vui" },
      { name: "🌈 Bộ khối gỗ màu sắc sặc sỡ hoặc sỏi cuội vẽ nhẵn", desc: "Học liệu đa giác quan học xếp sáng tạo hình thù đa dạng" }
    ],
    digitalResources: [
      { name: "📺 Phim ngắn khám phá thế giới quan quanh em", desc: "Học tập trực quan 3D kỳ thú nâng tầm nhận thức cho trẻ em mầm non" },
      { name: "📱 Nhạc không lời Baroque phát nhẹ nhàng", desc: "Nhạc nền kích thích sóng não tập trung sáng tạo, thư giãn tuyệt đối" }
    ],
    soundEffects: "🔊 Tiếng vỗ tay reo hò rộn rã động viên tinh thần, tiếng âm thanh thiên nhiên sinh động tươi vui.",
    imagePrompt: "Vibrant cheerful cartoon kindergarten classroom with lovely toys, cartoon watercolor design illustration, bright pleasant colors, perfect play space."
  };
};

const getIllustrationUrl = (topic: string, seed: number) => {
  const cleanTopic = (topic || "kindergarten").replace(/[^a-zA-Z0-9\s]/g, "");
  return `https://loremflickr.com/640/480/cartoon,kids,learning,${encodeURIComponent(cleanTopic)}?lock=${seed}`;
};

export default function App() {
  // Input states
  const [form, setForm] = useState<LessonPlanRequest>({
    age: "Mẫu giáo 4-5 tuổi",
    field: "Phát triển nhận thức",
    activity: "Khám phá khoa học",
    lessonType: "Tiết dạy bình thường trên lớp",
    theme: "",
    topic: "",
    integrate: ["Lấy trẻ làm trung tâm"],
    extra: "",
    materials: "",
    adjustRequest: "",
    lessonSampleName: "",
    lessonSampleContent: "",
    attachmentNames: [],
    attachmentContent: ""
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [refinementText, setRefinementText] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [imgSeed, setImgSeed] = useState(1);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [isMaterialsAuto, setIsMaterialsAuto] = useState(true);
  const [showLessonTypeDropdown, setShowLessonTypeDropdown] = useState(false);
  const [showIntegrateDropdown, setShowIntegrateDropdown] = useState(false);
  
  // App state & local storage persistence
  const [savedPlans, setSavedPlans] = useState<SavedLessonPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Loading steps animation
  const loadingSteps = [
    "Đang phân tích độ tuổi và lĩnh vực phát triển của trẻ...",
    "Đang tích hợp phương pháp dạy học tích cực...",
    "Đang xây dựng kịch bản lời dẫn, câu đố mở đầu hóm hỉnh...",
    "Đang xây dựng trò chơi vận động và thử thách củng cố...",
    "Đang biên soạn prompt ảnh minh họa AI để cô làm giáo cụ...",
    "Đang tổng hợp thành giáo án mầm non hoàn chỉnh..."
  ];

  const refinementSteps = [
    "Đang tiếp nhận phản hồi điều chỉnh của Cô...",
    "Đang phân tích chi tiết mong muốn bổ sung đối tượng...",
    "Đang tinh chỉnh các hoạt động dạy học theo chỉ đạo mới...",
    "Đang sắp xếp bố cục chuẩn sư phạm, mạch lạc và thoáng đạt..."
  ];

  useEffect(() => {
    // Load saved plans on start
    try {
      const val = localStorage.getItem("giao_an_mam_non_saved");
      if (val) {
        setSavedPlans(JSON.parse(val));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Update loading interval step
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentStepsCount = isRefining ? refinementSteps.length : loadingSteps.length;
    if (loading) {
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev < currentStepsCount - 1 ? prev + 1 : prev));
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(timer);
  }, [loading, isRefining]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleFieldChange = (key: keyof LessonPlanRequest, val: any) => {
    if (key === "materials") {
      if (typeof val === "string" && val.trim() === "") {
        setIsMaterialsAuto(true);
      } else {
        setIsMaterialsAuto(false);
      }
    }

    setForm((prev) => {
      const nextForm = { ...prev, [key]: val };
      if (key === "topic" || key === "activity") {
        const topicVal = key === "topic" ? val : prev.topic;
        if (isMaterialsAuto && typeof topicVal === "string" && topicVal.trim()) {
          const sug = getSuggestedMaterials(topicVal.trim(), nextForm.activity);
          nextForm.materials = `1. Trực quan & Học cụ: Tranh ảnh sinh động về Đề tài "${topicVal.trim()}", ${sug.diyMaterials.map(m => m.name).join(", ")}
2. Học liệu số & Trình chiếu: ${sug.digitalResources.map(r => r.name).join(", ")}
3. Âm thanh & Âm nhạc: Nhạc bài ${sug.songs.map(s => s.name).join(", ")} và ${sug.soundEffects}`;
        } else if (isMaterialsAuto && typeof topicVal === "string" && !topicVal.trim()) {
          nextForm.materials = "";
        }
      }
      return nextForm;
    });
    setErrorMsg("");
  };

  const toggleIntegrate = (label: string) => {
    setForm((prev) => {
      const list = prev.integrate.includes(label)
        ? prev.integrate.filter((i) => i !== label)
        : [...prev.integrate, label];
      return { ...prev, integrate: list };
    });
  };

  const handleApplyPreset = (preset: typeof PRESET_TOPICS[number]) => {
    const sug = getSuggestedMaterials(preset.topic, preset.activity);
    const presetMaterials = `1. Trực quan & Học cụ: Tranh ảnh sinh động về Đề tài "${preset.topic.trim()}", ${sug.diyMaterials.map(m => m.name).join(", ")}
2. Học liệu số & Trình chiếu: ${sug.digitalResources.map(r => r.name).join(", ")}
3. Âm thanh & Âm nhạc: Nhạc bài ${sug.songs.map(s => s.name).join(", ")} và ${sug.soundEffects}`;

    setForm({
      age: preset.age,
      field: preset.field,
      activity: preset.activity,
      lessonType: "Tiết dạy bình thường trên lớp",
      theme: preset.theme,
      topic: preset.topic,
      integrate: preset.integrate,
      extra: preset.extra,
      materials: presetMaterials,
      adjustRequest: "",
      lessonSampleName: "",
      lessonSampleContent: "",
      attachmentNames: [],
      attachmentContent: ""
    });
    setIsMaterialsAuto(true);
    setErrorMsg("");
    showToast(`Đã tải mẫu gợi ý: "${preset.title}"`);
  };

  const handleGenerate = async () => {
    if (!form.theme.trim()) {
      setErrorMsg("Cô vui lòng nhập tên Chủ đề bài học.");
      return;
    }
    if (!form.topic.trim()) {
      setErrorMsg("Cô vui lòng nhập Đề tài chi tiết tiết dạy.");
      return;
    }

    setIsRefining(false);
    setLoading(true);
    setErrorMsg("");
    setResult("");
    setIsEditing(false);

    try {
      const response = await fetch("/api/lesson-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          age: form.age,
          field: form.field,
          activity: form.activity,
          lessonType: form.lessonType,
          theme: form.theme.trim(),
          topic: form.topic.trim(),
          integrate: form.integrate.join(", ") || "Không tích hợp thêm",
          extra: form.extra.trim(),
          materials: (form.materials || "").trim(),
          adjustRequest: (form.adjustRequest || "").trim(),
          lessonSampleName: form.lessonSampleName,
          lessonSampleContent: form.lessonSampleContent,
          attachmentNames: form.attachmentNames || [],
          attachmentContent: form.attachmentContent || ""
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Có lỗi bất ngờ xảy ra.");
      }

      const cleanedPlan = sanitizeLessonPlanText(data.lessonPlan);
      setResult(cleanedPlan);
      setEditedText(cleanedPlan);
      setImgSeed(Math.floor(Math.random() * 1000) + 1);
      showToast("Tạo giáo án thành công nâng cao!");
      setTimeout(() => {
        (window as any).xoaKhoangTrangGiaoAn?.();
      }, 200);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể kết nối máy chủ hoặc lỗi API.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateImg = () => {
    setIsGeneratingImg(true);
    setTimeout(() => {
      setImgSeed((prev) => prev + 1);
      setIsGeneratingImg(false);
      showToast("Đã vẽ tranh minh họa mới xinh xắn bằng AI cho Cô!");
    }, 1000);
  };

  const handleRefine = async () => {
    if (!refinementText.trim()) {
      showToast("Cô vui lòng nhập yêu cầu điều chỉnh giáo án.");
      return;
    }

    setIsRefining(true);
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/refine-lesson-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPlan: isEditing ? editedText : result,
          refinementRequest: refinementText.trim(),
          age: form.age,
          field: form.field,
          activity: form.activity,
          lessonType: form.lessonType,
          theme: form.theme,
          topic: form.topic
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi điều chỉnh giáo án.");
      }

      const cleanedPlan = sanitizeLessonPlanText(data.lessonPlan);
      setResult(cleanedPlan);
      setEditedText(cleanedPlan);
      setRefinementText("");
      showToast("Đã điều chỉnh giáo án thành công theo yêu cầu của Cô!");
      setTimeout(() => {
        (window as any).xoaKhoangTrangGiaoAn?.();
      }, 200);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể kết nối máy chủ để thực hiện yêu cầu.");
      showToast("Lỗi khi điều chỉnh giáo án.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = () => {
    if (!result) return;
    
    // Check if modifying an already active saved plan
    if (activePlanId) {
      const updated = savedPlans.map((p) => {
        if (p.id === activePlanId) {
          return {
            ...p,
            content: isEditing ? editedText : result,
            request: form,
            createdAt: new Date().toLocaleString("vi-VN")
          };
        }
        return p;
      });
      setSavedPlans(updated);
      localStorage.setItem("giao_an_mam_non_saved", JSON.stringify(updated));
      showToast("Đã cập nhật thay đổi giáo án này!");
    } else {
      const newPlan: SavedLessonPlan = {
        id: "plan_" + Date.now(),
        createdAt: new Date().toLocaleString("vi-VN"),
        title: `${form.topic} (${form.age})`,
        request: { ...form },
        content: isEditing ? editedText : result
      };
      const updated = [newPlan, ...savedPlans];
      setSavedPlans(updated);
      setActivePlanId(newPlan.id);
      localStorage.setItem("giao_an_mam_non_saved", JSON.stringify(updated));
      showToast("Đã lưu giáo án vào hộp nhật ký của Cô!");
    }
  };

  const handleLoadSavedPlan = (plan: SavedLessonPlan) => {
    setForm(plan.request);
    setResult(plan.content);
    setEditedText(plan.content);
    setActivePlanId(plan.id);
    setIsEditing(false);
    setIsMaterialsAuto(false);
    showToast(`Đã mở giáo án: "${plan.title}"`);
  };

  const handleDeleteSavedPlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedPlans.filter((p) => p.id !== id);
    setSavedPlans(updated);
    localStorage.setItem("giao_an_mam_non_saved", JSON.stringify(updated));
    if (activePlanId === id) {
      setActivePlanId(null);
    }
    showToast("Đã xóa khỏi lịch sử học liệu.");
  };

  const handleCopy = () => {
    const textToCopy = isEditing ? editedText : result;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Đã sao chép toàn bộ văn bản giáo án!");
  };

  const downloadAsWord = () => {
    const textToConvert = isEditing ? editedText : result;
    if (!textToConvert) return;

    // Direct helper to turn markdown headers, bullets, and text into basic HTML styled for Microsoft Word natively.
    const formatMarkdownToBasicHtml = (md: string): string => {
      const highlighted = applyTechHighlighting(md);
      let html = highlighted;
      
      // Escape HTML chars
      html = html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Restore line breaks
      html = html.replace(/&lt;br\s*\/?&gt;/gi, "<br/>");

      // Render lines
      const lines = html.split("\n");
      let parsedLines: string[] = [];
      let inList = false;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();

        // Tables parsing
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          const tableLines: string[] = [];
          while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
            tableLines.push(lines[i].trim());
            i++;
          }
          i--; // Step back

          if (tableLines.length > 0) {
            parsedLines.push('<table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse !important; margin-top:12px; margin-bottom:12px; border:1px solid #000000 !important; background-color:#ffffff !important;">');
            parsedLines.push('<tbody>');
            let isFirstRow = true;

            for (let j = 0; j < tableLines.length; j++) {
              const tableRow = tableLines[j];
              const isSeparator = /^\|[\s-|-]*\|$/.test(tableRow) && tableRow.includes("---");
              if (isSeparator) {
                continue;
              }

              const rawCols = tableRow.split("|");
              const cols = rawCols.slice(1, rawCols.length - 1).map(c => c.trim());

              if (isFirstRow) {
                parsedLines.push('<tr>');
                for (const col of cols) {
                  let formattedCol = col
                    .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/g, "<strong>$1</strong>");
                  formattedCol = applyTechWordStyling(formattedCol);
                  formattedCol = formattedCol.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                  parsedLines.push(`<td style="border:1px solid #000000 !important; padding:6px 8px !important; text-align:center !important; font-weight:bold !important; background-color:#ffffff !important; font-family:\'Times New Roman\', serif; font-size:14pt; color:#000000 !important; vertical-align:top !important;">${formattedCol}</td>`);
                }
                parsedLines.push('</tr>');
                isFirstRow = false;
              } else {
                parsedLines.push('<tr>');
                for (const col of cols) {
                  let formattedCol = col
                    .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/g, "<strong>$1</strong>");
                  formattedCol = applyTechWordStyling(formattedCol);
                  formattedCol = formattedCol.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                  parsedLines.push(`<td style="border:1px solid #000000 !important; padding:6px 8px !important; text-align:left !important; vertical-align:top !important; font-family:\'Times New Roman\', serif; font-size:14pt; color:#000000 !important; background-color:#ffffff !important;">${formattedCol}</td>`);
                }
                parsedLines.push('</tr>');
              }
            }

            parsedLines.push('</tbody>');
            parsedLines.push('</table>');
          }
          continue;
        }

        // Headers
        if (trimmed.startsWith("# ")) {
          if (inList) { parsedLines.push("</ul>"); inList = false; }
          let hText = trimmed.substring(2);
          hText = applyTechWordStyling(hText);
          const cleanText = hText.replace(/<[^>]+>/g, "").trim();
          const hasUppercase = /[A-ZĐĂÂÊÔƠƯ]/.test(cleanText);
          const hasLowercase = /[a-zđăâêôơư]/.test(cleanText);
          const livesInTitle = hasUppercase && !hasLowercase && !/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC|PHẦN)\.?\s+/i.test(cleanText);
          if (livesInTitle) {
            parsedLines.push(`<h1 class="title-header" style="text-align: center !important; font-weight: bold !important; margin-top: 18pt; margin-bottom: 12pt; margin-left: 0 !important; padding-left: 0 !important; text-indent: 0 !important;">${hText}</h1>`);
          } else {
            parsedLines.push(`<h1>${hText}</h1>`);
          }
        } else if (trimmed.startsWith("## ")) {
          if (inList) { parsedLines.push("</ul>"); inList = false; }
          let hText = trimmed.substring(3);
          hText = applyTechWordStyling(hText);
          const cleanText = hText.replace(/<[^>]+>/g, "").trim();
          const hasUppercase = /[A-ZĐĂÂÊÔƠƯ]/.test(cleanText);
          const hasLowercase = /[a-zđăâêôơư]/.test(cleanText);
          const livesInTitle = hasUppercase && !hasLowercase && !/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC|PHẦN)\.?\s+/i.test(cleanText);
          if (livesInTitle) {
            parsedLines.push(`<h2 class="title-header" style="text-align: center !important; font-weight: bold !important; margin-top: 18pt; margin-bottom: 8pt; margin-left: 0 !important; padding-left: 0 !important; text-indent: 0 !important;">${hText}</h2>`);
          } else {
            parsedLines.push(`<h2>${hText}</h2>`);
          }
        } else if (trimmed.startsWith("### ")) {
          if (inList) { parsedLines.push("</ul>"); inList = false; }
          let hText = trimmed.substring(4);
          hText = applyTechWordStyling(hText);
          const cleanText = hText.replace(/<[^>]+>/g, "").trim();
          const hasUppercase = /[A-ZĐĂÂÊÔƠƯ]/.test(cleanText);
          const hasLowercase = /[a-zđăâêôơư]/.test(cleanText);
          const livesInTitle = hasUppercase && !hasLowercase && !/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC|PHẦN)\.?\s+/i.test(cleanText);
          if (livesInTitle) {
            parsedLines.push(`<h3 class="title-header" style="text-align: center !important; font-weight: bold !important; margin-top: 12pt; margin-bottom: 6pt; margin-left: 0 !important; padding-left: 0 !important; text-indent: 0 !important;">${hText}</h3>`);
          } else {
            parsedLines.push(`<h3>${hText}</h3>`);
          }
        } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("+ ")) {
          if (inList) { parsedLines.push("</ul>"); inList = false; }
          let leadMarker = "";
          let text = trimmed;
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("+ ")) {
            leadMarker = "- ";
            text = trimmed.substring(2);
          }
          text = text.replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/g, "<strong>$1</strong>");
          text = applyTechWordStyling(text);
          text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
          parsedLines.push(`<p style="margin-left: 0; padding-left: 0; margin-bottom: 6pt;">${leadMarker}${text}</p>`);
        } else if (trimmed.startsWith("---") || trimmed.startsWith("___")) {
          if (inList) { parsedLines.push("</ul>"); inList = false; }
          parsedLines.push("<hr/>");
        } else if (trimmed === "") {
          if (inList) { parsedLines.push("</ul>"); inList = false; }
          parsedLines.push("<br/>");
        } else {
          if (inList) { parsedLines.push("</ul>"); inList = false; }
          let text = trimmed;
          text = applyTechWordStyling(text);
          text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
          text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
          
          const cleanText = text.replace(/<[^>]+>/g, "").trim();
          const hasUppercase = /[A-ZĐĂÂÊÔƠƯ]/.test(cleanText);
          const hasLowercase = /[a-zđăâêôơư]/.test(cleanText);
          const livesInTitle = hasUppercase && !hasLowercase && !/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC|PHẦN)\.?\s+/i.test(cleanText) && cleanText.length > 5;
          if (livesInTitle) {
            parsedLines.push(`<p class="title-header" style="text-align: center !important; font-weight: bold !important; margin-top: 4px; margin-bottom: 4px; margin-left: 0 !important; padding-left: 0 !important; text-indent: 0 !important;">${text}</p>`);
          } else {
            parsedLines.push(`<p>${text}</p>`);
          }
        }
      }
      if (inList) parsedLines.push("</ul>");

      return parsedLines.join("\n");
    };

    const docTitle = form.topic || "Giao_An_Mam_Non";

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${docTitle}</title>
        <style>
          body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 1in; color: #1e293b; }
          h1 { color: #1e3a8a; font-size: 20pt; margin-top: 18pt; margin-bottom: 12pt; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; text-indent: 0 !important; font-weight: bold !important; }
          h2 { color: #2563eb; font-size: 15pt; border-bottom: 2px solid #cbd5e1; margin-top: 18pt; margin-bottom: 8pt; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; text-indent: 0 !important; font-weight: bold !important; padding-bottom: 4px; }
          h3 { font-size: 12.5pt; color: #0f172a; margin-top: 12pt; margin-bottom: 6pt; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; text-indent: 0 !important; font-weight: bold !important; }
          .title-header { text-align: center !important; font-weight: bold !important; margin-left: 0 !important; padding-left: 0 !important; text-indent: 0 !important; display: block; width: 100%; }
          p { font-size: 11.5pt; margin-bottom: 8pt; text-align: justify; }
          ul { margin-bottom: 8pt; padding-left: 20pt; list-style-type: disc; }
          li { font-size: 11.5pt; margin-bottom: 4pt; }
          hr { border: none; border-top: 1px solid #cbd5e1; margin: 20px 0; }
          strong { font-weight: bold; }
          em { font-style: italic; }
          table {
            width: 100%;
            border-collapse: collapse !important;
            border: 1px solid #000000 !important;
            margin-top: 12px;
            margin-bottom: 12px;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: 6px 8px !important;
            vertical-align: top !important;
            text-align: left !important;
            font-family: 'Times New Roman', serif;
            font-size: 14pt;
            color: #000000 !important;
          }
          th {
            text-align: center !important;
            font-weight: bold !important;
            background-color: #ffffff !important;
          }
        </style>
      </head>
      <body>
         ${formatMarkdownToBasicHtml(textToConvert)}
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + wordHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GiaoAn_${form.topic.replace(/\s+/g, "_") || "MamNon"}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Đã tải giáo án Word (.doc) về máy thành công!");
  };

  const handlePrint = () => {
    const printContent = document.getElementById("output")?.innerHTML;
    if (!printContent) return;
    const windowUrl = "about:blank";
    const uniqueName = new Date().getTime();
    const windowName = "Print" + uniqueName;
    const printWindow = window.open(windowUrl, windowName, "left=50,top=50,width=850,height=900");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>In giáo án: ${form.topic}</title>
            <style>
              @page {
                size: A4;
                margin: 2cm 2cm 2cm 3cm;
              }
              body {
                margin: 0;
                padding: 0;
              }
              #output, #output * {
                box-sizing: border-box !important;
                font-family: "Times New Roman", serif !important;
                font-size: 14pt !important;
                line-height: 1.15 !important;
                white-space: normal !important;
              }
              #output {
                margin: 0 !important;
                padding: 2cm 2cm 2cm 3cm !important;
                background: #fff !important;
                color: #000 !important;
                text-align: justify !important;
              }
              #output p,
              #output div,
              #output section,
              #output article,
              #output li {
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.15 !important;
                min-height: 0 !important;
                height: auto !important;
              }
              #output h1,
              #output h2,
              #output h3,
              #output h4 {
                margin: 4px 0 !important;
                padding: 0 !important;
                line-height: 1.15 !important;
                text-align: left !important;
                margin-left: 0 !important;
                padding-left: 0 !important;
                text-indent: 0 !important;
                font-weight: bold !important;
              }
              #output .title-header,
              #output p.title-header,
              #output h2.title-header {
                text-align: center !important;
                margin-left: auto !important;
                margin-right: auto !important;
                text-indent: 0 !important;
                font-weight: bold !important;
              }
              /* #output br { display: none !important; } */
              #output .empty-line,
              #output .blank-line {
                display: none !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              #output table {
                width: 100% !important;
                border-collapse: collapse !important;
                border: 1px solid #000000 !important;
                margin-top: 12px !important;
                margin-bottom: 12px !important;
                background-color: #ffffff !important;
              }
              #output th, #output td {
                border: 1px solid #000000 !important;
                padding: 6px 8px !important;
                vertical-align: top !important;
                text-align: left !important;
                background-color: #ffffff !important;
              }
              #output th {
                text-align: center !important;
                font-weight: bold !important;
                background-color: #ffffff !important;
              }
              @media print {
                #output table, #output th, #output td {
                  border: 1px solid #000000 !important;
                  border-collapse: collapse !important;
                }
              }
            </style>
          </head>
          <body>
            <div id="output">
              ${printContent}
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="min-h-screen bg-[#F1EFE9] text-slate-800 selection:bg-rose-200">
      
      {/* Visual Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl flex items-center space-x-2 text-sm border border-slate-705"
            id="app-toast"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating loading overlay for delightful interaction */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#FFFDF9]/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center"
            id="generator-overlay"
          >
            <div className="max-w-md w-full flex flex-col items-center">
              {/* Spinning/pulsing animation */}
              <div className="relative mb-8">
                <motion.div 
                  className="w-24 h-24 rounded-full border-4 border-rose-100 border-t-rose-500 absolute top-0 left-0"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-amber-50">
                  <Sparkles size={36} className="text-amber-500 animate-bounce" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2 font-serif tracking-tight">
                {isRefining ? "Đang điều chỉnh giáo án..." : "Cô chờ chút nhé..."}
              </h3>
              <p className="text-[#E15A7A] font-medium text-sm mb-6 uppercase tracking-wider">
                {isRefining ? "Trợ lý đang cập nhật nội dung theo yêu cầu của Cô" : "Trợ lý đang thiết lập khóa học mẫu giáo đạt chuẩn"}
              </p>

              {/* Progress feedback */}
              <div className="bg-amber-100/30 border border-amber-200/50 rounded-2xl p-5 w-full text-slate-700 min-h-[90px] shadow-sm flex items-center justify-center">
                <motion.p 
                  key={loadingStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="font-medium text-center"
                >
                  {isRefining ? refinementSteps[loadingStep] : loadingSteps[loadingStep]}
                </motion.p>
              </div>

              {/* Tips */}
              <div className="mt-8 text-xs text-slate-400 space-y-1">
                <p>💡 Tip: Giáo án tích hợp STEAM giúp trẻ vừa học kĩ thuật vừa sáng tạo nghệ thuật.</p>
                <p>Nội dung hoàn thành sẽ tự động tích hợp lời dẫn sư phạm sinh động.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Friendly Application Header */}
      <header className="bg-white border-b border-[#F1ECE4]/80 py-6 px-4 md:px-8 shadow-sm relative overflow-hidden" id="app-header">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 -ml-16 -mb-16 w-64 h-64 bg-rose-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div className="flex items-start space-x-4">
            <div className="bg-gradient-to-tr from-rose-400 to-amber-400 text-white p-3.5 rounded-2xl shadow-md transform rotate-1 shrink-0 mt-2">
              <Sparkles size={28} className="animate-pulse" />
            </div>
            <div className="bg-[#FAF9F5]/90 border-2 border-[#1E3A8A] rounded-2xl p-4 md:p-5 shadow-md max-w-xl md:max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="bg-rose-100 text-[#E15A7A] text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border border-rose-200">
                  Chương trình chuẩn Bộ GD&ĐT
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-[#1E3A8A] font-serif tracking-tight mt-2.5 leading-tight md:whitespace-nowrap">
                CHUYÊN GIA SOẠN GIÁO ÁN MẦM NON
              </h1>
              <p className="text-[#E15A7A] text-base md:text-lg font-black mt-1.5">
                Cô giáo Bbling
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0 self-end md:self-center">
            {/* Folder of Saved Plans Toggle Button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                showHistory 
                  ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-md"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm"
              }`}
              id="toggle-history-btn"
            >
              <Calendar size={16} />
              <span>Nhật ký Giáo án ({savedPlans.length})</span>
            </button>

            {/* Quick clean/reset app states */}
            <button
              onClick={() => {
                if (window.confirm("Cô muốn thiết lập lại toàn bộ biểu mẫu?")) {
                  setForm({
                    age: "Mẫu giáo 4-5 tuổi",
                    field: "Phát triển nhận thức",
                    activity: "Khám phá khoa học",
                    lessonType: "Tiết dạy bình thường trên lớp",
                    theme: "",
                    topic: "",
                    integrate: ["Lấy trẻ làm trung tâm"],
                    extra: "",
                    materials: "",
                    adjustRequest: "",
                    lessonSampleName: "",
                    lessonSampleContent: "",
                    attachmentNames: [],
                    attachmentContent: ""
                  });
                  setResult("");
                  setActivePlanId(null);
                  setIsMaterialsAuto(true);
                  showToast("Đã đưa thông số về mặc định!");
                }
              }}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all shadow-sm"
              title="Thiết lập lại biểu mẫu"
              id="reset-form-btn"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {/* Banner Informational Section */}
        <div className="bg-gradient-to-r from-blue-500/10 via-amber-500/10 to-rose-500/10 border border-[#F1ECE4] rounded-2xl p-4 md:p-5 mb-8 text-sm text-slate-800 leading-relaxed shadow-sm flex items-start gap-3">
          <Smile size={20} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-[#1e3a8a]">Cô giáo mầm non mến thương ơi!</span> Ứng dụng này hỗ trợ cô tự soạn bài theo 5 lĩnh vực phát triển toàn diện. Để đạt hiệu quả cao nhất, cô có thể kết hợp thêm định hướng <strong>STEAM</strong> và <strong>Lấy trẻ làm trung tâm</strong>. Hãy dùng tính năng lưu trữ để bảo tồn bài dạy đã soạn và xuất sang Word hoàn hảo để nộp hay in ấn bất cứ lúc nào!
          </div>
        </div>

        {/* Collapsible History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white border border-slate-100 rounded-2xl p-6 mb-8 shadow-sm overflow-hidden"
              id="history-plans-panel"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-105">
                <h3 className="font-bold text-slate-900 flex items-center space-x-2 text-md">
                  <BookOpen size={18} className="text-indigo-600" />
                  <span>Kho học liệu / Giáo án Cô đã lưu</span>
                </h3>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>

              {savedPlans.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <p>Hộp lưu trữ đang trống. Giáo án sau khi tạo, Cô nhấn "Lưu giáo án" để lưu lại tại đây nhé!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedPlans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => handleLoadSavedPlan(plan)}
                      className={`group p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        activePlanId === plan.id
                          ? "bg-rose-50/50 border-rose-300 ring-1 ring-rose-200"
                          : "bg-stone-50/50 border-slate-200 hover:border-slate-350 hover:bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full">
                          {plan.request.age}
                        </span>
                        <button
                          onClick={(e) => handleDeleteSavedPlan(plan.id, e)}
                          className="text-slate-350 hover:text-rose-600 p-1 rounded transition-all opacity-0 group-hover:opacity-100"
                          title="Xóa giáo án"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <h4 className="font-bold text-slate-800 text-sm line-clamp-1 mt-2 group-hover:text-[#1E3A8A]">
                        {plan.request.topic}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        Chủ đề: {plan.request.theme}
                      </p>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {plan.createdAt.split(" ")[0]}
                        </span>
                        <span className="text-slate-500 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                          Mở giáo án <ChevronRight size={10} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Outer Split Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Config Panel (lg:span-5) */}
          <div className="lg:col-span-5 space-y-6">

            {/* Config Form Card */}
            <div className="bg-white border border-[#F1ECE4]/80 rounded-3xl p-6 shadow-sm relative overflow-hidden" id="lesson-config-form">
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-rose-400 via-amber-400 to-teal-400" />

              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Wand2 className="text-rose-500" size={20} />
                <span>Thiết lập thông tin Tiết dạy</span>
              </h2>

              <div className="space-y-5">
                
                {/* Age selector */}
                <div>
                  <label className="block text-slate-900 font-bold text-sm md:text-base mb-2">
                    1. Đối tượng / Độ tuổi trẻ
                  </label>
                  <select
                    value={form.age}
                    onChange={(e) => handleFieldChange("age", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-350 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-450 focus:bg-white transition-all cursor-pointer"
                    id="form-age-select"
                  >
                    {AGE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Field selector */}
                <div>
                  <label className="block text-slate-900 font-bold text-sm md:text-base mb-2">
                    2. Lĩnh vực phát triển chính
                  </label>
                  <select
                    value={form.field}
                    onChange={(e) => handleFieldChange("field", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-350 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-450 focus:bg-white transition-all cursor-pointer"
                    id="form-field-select"
                  >
                    {FIELD_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Activity Selector */}
                <div>
                  <label className="block text-slate-900 font-bold text-sm md:text-base mb-2">
                    3. Hoạt động học áp dụng
                  </label>
                  <select
                    value={form.activity}
                    onChange={(e) => handleFieldChange("activity", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-350 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-450 focus:bg-white transition-all cursor-pointer"
                    id="form-activity-select"
                  >
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Lesson Type */}
                <div className="relative">
                  <label className="block text-slate-900 font-bold text-sm md:text-base mb-2">
                    4. Loại tiết dạy
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLessonTypeDropdown(!showLessonTypeDropdown);
                      setShowIntegrateDropdown(false);
                    }}
                    className="w-full bg-slate-50 border border-slate-350 text-slate-800 rounded-xl px-3 py-2.5 text-sm flex items-center justify-between focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-450 focus:bg-white transition-all cursor-pointer"
                    id="lesson-type-dropdown-trigger"
                  >
                    <span className="font-semibold text-slate-700">
                      {LESSON_TYPE_OPTIONS.find(o => o.value === form.lessonType)?.label || form.lessonType}
                    </span>
                    <ChevronRight size={16} className={`text-slate-400 transition-transform duration-200 ${showLessonTypeDropdown ? "rotate-90" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showLessonTypeDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={() => setShowLessonTypeDropdown(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 space-y-1 max-h-60 overflow-y-auto"
                        >
                          {LESSON_TYPE_OPTIONS.map((opt) => {
                            const isSelected = form.lessonType === opt.value;
                            return (
                              <div
                                key={opt.value}
                                onClick={() => {
                                  handleFieldChange("lessonType", opt.value);
                                  setShowLessonTypeDropdown(false);
                                }}
                                className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? "bg-rose-50 text-rose-700 font-bold border border-rose-200"
                                    : "hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <p className="font-bold">{opt.label}</p>
                              </div>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Theme text input */}
                <div>
                  <label className="block text-slate-900 font-bold text-sm md:text-base mb-2">
                    5. Chủ đề bài học lớn
                  </label>
                  <input
                    type="text"
                    value={form.theme}
                    onChange={(e) => handleFieldChange("theme", e.target.value)}
                    placeholder="Ví dụ: Thế giới Động vật quanh em, Gia đình yêu thương..."
                    className="w-full bg-slate-50 border border-slate-350 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-450 focus:bg-white transition-all"
                    id="form-theme-input"
                  />
                </div>

                {/* Topic text input */}
                <div>
                  <label className="block text-slate-900 font-bold text-sm md:text-base mb-2">
                    6. Đề tài tiết học chi tiết
                  </label>
                  <input
                    type="text"
                    value={form.topic}
                    onChange={(e) => handleFieldChange("topic", e.target.value)}
                    placeholder="Ví dụ: Vòng đời tò mò của bướm xinh, Bé làm quen số 3..."
                    className="w-full bg-slate-50 border border-slate-350 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-450 focus:bg-white transition-all"
                    id="form-topic-input"
                  />
                </div>

                {/* Integration checklist with nice modern select badges */}
                <div className="relative">
                  <label className="block text-slate-900 font-bold text-sm md:text-base mb-2">
                    7. Tích hợp định hướng sư phạm tiên tiến
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowIntegrateDropdown(!showIntegrateDropdown);
                      setShowLessonTypeDropdown(false);
                    }}
                    className="w-full bg-slate-50 border border-slate-350 text-slate-800 rounded-xl px-3 py-2.5 text-sm flex items-center justify-between focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-450 focus:bg-white transition-all cursor-pointer"
                    id="integrate-dropdown-trigger"
                  >
                    <span className="font-semibold text-slate-700 truncate pr-2 text-left">
                      {form.integrate.length > 0 
                        ? `Đã chọn (${form.integrate.length}): ${form.integrate.join(", ")}` 
                        : "Chưa chọn lựa chọn tích hợp"}
                    </span>
                    <ChevronRight size={16} className={`text-slate-400 transition-transform duration-200 shrink-0 ${showIntegrateDropdown ? "rotate-90" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showIntegrateDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={() => setShowIntegrateDropdown(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 max-h-[380px] overflow-y-auto"
                        >
                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chọn định hướng tích hợp</span>
                            <button 
                              type="button"
                              onClick={() => setShowIntegrateDropdown(false)}
                              className="text-xs text-[#E15A7A] hover:text-rose-600 font-black cursor-pointer"
                            >
                              Hoàn thành
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {INTEGRATION_OPTIONS.map((opt) => {
                              const isSelected = form.integrate.includes(opt.label);
                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => toggleIntegrate(opt.label)}
                                  className={`p-3 rounded-xl border text-left cursor-pointer select-none transition-all ${
                                    isSelected
                                      ? "bg-indigo-50/50 border-indigo-600 border-2 shadow-sm"
                                      : "bg-slate-50/50 border-slate-350 hover:bg-slate-100"
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                      isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-400 bg-white"
                                    }`}>
                                      {isSelected && <Check size={10} strokeWidth={3} />}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800">{opt.label}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">{opt.description}</p>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* 8 & 9. Real-time Side-by-side uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 8. Tải tài liệu đính kèm */}
                  <div>
                    <label className="block text-slate-900 font-bold text-sm md:text-base mb-2" id="upload-attachments-label">
                      8. Tải tài liệu đính kèm
                    </label>
                    <div 
                      id="attachmentFiles-container"
                      className="w-full min-h-[170px] bg-[#f6fff7] border-[2.5px] border-dashed border-[#16a34a] hover:border-[#15803d] rounded-xl p-5 text-center cursor-pointer transition-all relative group flex flex-col justify-center items-center shadow-sm"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const files = Array.from(e.dataTransfer.files || []);
                        if (files.length > 0) {
                          const newNames = files.map(f => f.name);
                          setForm(prev => {
                            const currentNames = prev.attachmentNames || [];
                            const mergedNames = Array.from(new Set([...currentNames, ...newNames]));
                            
                            let attachmentInfo = "Người dùng đã tải lên các tài liệu đính kèm sau:\n";
                            mergedNames.forEach(name => {
                              attachmentInfo += `- ${name}\n`;
                            });
                            attachmentInfo += `\nHãy tham khảo các tài liệu này để:\n- hiểu rõ yêu cầu bài dạy\n- học theo cách trình bày\n- tham khảo học liệu\n- tham khảo hình ảnh\n- tham khảo chuyên môn\n- hỗ trợ soạn giáo án phù hợp hơn\n`;

                            return {
                              ...prev,
                              attachmentNames: mergedNames,
                              attachmentContent: attachmentInfo
                            };
                          });
                          showToast(`Đã nhận ${files.length} tài liệu đính kèm.`);
                        }
                      }}
                    >
                      <input 
                        type="file" 
                        id="attachmentFiles"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.ppt,.pptx"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            const newNames = files.map(f => f.name);
                            setForm(prev => {
                              const currentNames = prev.attachmentNames || [];
                              const mergedNames = Array.from(new Set([...currentNames, ...newNames]));
                              
                              let attachmentInfo = "Người dùng đã tải lên các tài liệu đính kèm sau:\n";
                              mergedNames.forEach(name => {
                                attachmentInfo += `- ${name}\n`;
                              });
                              attachmentInfo += `\nHãy tham khảo các tài liệu này để:\n- hiểu rõ yêu cầu bài dạy\n- học theo cách trình bày\n- tham khảo học liệu\n- tham khảo hình ảnh\n- tham khảo chuyên môn\n- hỗ trợ soạn giáo án phù hợp hơn\n`;

                              return {
                                ...prev,
                                attachmentNames: mergedNames,
                                attachmentContent: attachmentInfo
                              };
                            });
                            showToast(`Đã tải lên ${files.length} tài liệu đính kèm.`);
                          }
                        }}
                      />
                      
                      {(form.attachmentNames && form.attachmentNames.length > 0) ? (
                        <div className="flex flex-col items-center justify-center space-y-2 w-full">
                          <div className="p-2 bg-green-100 text-[#16a34a] rounded-full">
                            <Check className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-semibold text-slate-800">
                            Đã đính kèm {form.attachmentNames.length} tệp tài liệu:
                          </p>
                          <div className="text-xs text-slate-600 max-h-24 overflow-y-auto w-full px-4 py-1 text-left bg-white/50 rounded-lg border border-green-100/50 space-y-1">
                            {form.attachmentNames.map((name, idx) => (
                              <div key={idx} className="flex justify-between items-center gap-2">
                                <span className="truncate flex-1">{idx + 1}. {name}</span>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setForm(prev => {
                                      const currentNames = prev.attachmentNames || [];
                                      const filtered = currentNames.filter(n => n !== name);
                                      let attachmentInfo = "";
                                      if (filtered.length > 0) {
                                        attachmentInfo = "Người dùng đã tải lên các tài liệu đính kèm sau:\n";
                                        filtered.forEach(n => {
                                          attachmentInfo += `- ${n}\n`;
                                        });
                                        attachmentInfo += `\nHãy tham khảo các tài liệu này để:\n- hiểu rõ yêu cầu bài dạy\n- học theo cách trình bày\n- tham khảo học liệu\n- tham khảo hình ảnh\n- tham khảo chuyên môn\n- hỗ trợ soạn giáo án phù hợp hơn\n`;
                                      }
                                      return {
                                        ...prev,
                                        attachmentNames: filtered,
                                        attachmentContent: attachmentInfo
                                      };
                                    });
                                    showToast(`Đã gỡ tệp: ${name}`);
                                  }}
                                  className="text-rose-500 hover:text-rose-700 p-0.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setForm(prev => ({
                                ...prev,
                                attachmentNames: [],
                                attachmentContent: ""
                              }));
                              const inputElem = document.getElementById("attachmentFiles") as HTMLInputElement;
                              if (inputElem) {
                                inputElem.value = "";
                              }
                              showToast("Đã gỡ bỏ toàn bộ tài liệu đính kèm.");
                            }}
                            className="text-[10px] text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 py-1 px-3 rounded-lg flex items-center gap-1 mx-auto transition-colors mt-1"
                          >
                            <X className="w-3 h-3" /> Gỡ bỏ toàn bộ
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                          <div className="p-2.5 bg-green-50 text-[#16a34a] rounded-full group-hover:scale-105 transition-transform">
                            <FilePlus className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700">
                            Thả tài liệu đính kèm vào đây hoặc click chọn
                          </p>
                          <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed mx-auto">
                            Hỗ trợ .pdf, .doc, .docx, .txt, .png, .jpg, .jpeg, .ppt...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 9. Tải giáo án mẫu tham khảo */}
                  <div>
                    <label className="block text-slate-900 font-bold text-sm md:text-base mb-2">
                      9. Tải giáo án mẫu tham khảo
                    </label>
                    <div 
                      id="uploadgiaoan"
                      className="w-full min-h-[170px] bg-[#f7fbff] border-[2.5px] border-dashed border-[#1f6feb] hover:border-blue-700 rounded-xl p-5 text-center cursor-pointer transition-all relative group flex flex-col justify-center items-center shadow-sm"
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const text = event.target?.result as string;
                            setForm(prev => ({
                              ...prev,
                              lessonSampleName: file.name,
                              lessonSampleContent: text || ""
                            }));
                            showToast(`Đã tải lên giáo án mẫu: ${file.name}`);
                          };
                          if (file.name.endsWith(".txt")) {
                            reader.readAsText(file);
                          } else {
                            setForm(prev => ({
                              ...prev,
                              lessonSampleName: file.name,
                              lessonSampleContent: `[Người dùng đã tải giáo án mẫu dạng tệp tên: ${file.name} - kích thước ${(file.size / 1024).toFixed(1)} KB]`
                            }));
                            showToast(`Đã nhận tệp tham khảo: ${file.name}`);
                          }
                        }
                      }}
                    >
                      <input 
                        type="file" 
                        id="lessonSample" 
                        accept=".txt,.doc,.docx,.pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const text = event.target?.result as string;
                              setForm(prev => ({
                                ...prev,
                                lessonSampleName: file.name,
                                lessonSampleContent: text || ""
                              }));
                              showToast(`Đã tải lên giáo án mẫu: ${file.name}`);
                            };
                            if (file.name.endsWith(".txt")) {
                              reader.readAsText(file);
                            } else {
                              setForm(prev => ({
                                ...prev,
                                lessonSampleName: file.name,
                                lessonSampleContent: `[Người dùng đã tải giáo án mẫu dạng tệp tên: ${file.name} - kích thước ${(file.size / 1024).toFixed(1)} KB]`
                              }));
                              showToast(`Đã nhận tệp tham khảo: ${file.name}`);
                            }
                          }
                        }}
                      />
                      
                      {form.lessonSampleName ? (
                        <div className="flex flex-col items-center justify-center space-y-2 w-full">
                          <div className="p-2 bg-blue-100 text-[#1f6feb] rounded-full">
                            <FileText className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-medium text-slate-800 line-clamp-1 max-w-[200px] mx-auto">
                            {form.lessonSampleName}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setForm(prev => ({
                                ...prev,
                                lessonSampleName: "",
                                lessonSampleContent: ""
                              }));
                              const inputElem = document.getElementById("lessonSample") as HTMLInputElement;
                              if (inputElem) {
                                inputElem.value = "";
                              }
                              showToast("Đã gỡ bỏ giáo án mẫu tham khảo.");
                            }}
                            className="text-[10px] text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 py-1 px-3 rounded-lg flex items-center gap-1 mx-auto transition-colors mt-1"
                          >
                            <X className="w-3 h-3" /> Gỡ bỏ tệp
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                          <div className="p-2.5 bg-blue-50 text-[#1f6feb] rounded-full group-hover:scale-105 transition-transform">
                            <FilePlus className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700">
                            Thả giáo án mẫu vào đây hoặc click chọn
                          </p>
                          <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed mx-auto">
                            Hỗ trợ .txt, .doc, .docx, .pdf...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Proposed materials/images prompt */}
                <div>
                  <label className="block text-slate-900 font-bold text-sm md:text-base mb-2">
                    10. Gợi ý học liệu, hình ảnh cho bài dạy
                  </label>
                  <textarea
                    value={form.materials || ""}
                    onChange={(e) => handleFieldChange("materials", e.target.value)}
                    placeholder="Ví dụ: tranh ảnh con vật, video ngắn, thẻ chữ cái, mô hình, rối tay, nhạc nền, ảnh minh họa AI..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-350 text-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-450 focus:bg-white transition-all resize-none"
                    id="materials"
                  />
                </div>

                {/* Adjustments prompt */}
                <div>
                  <label className="block text-slate-900 font-bold text-sm md:text-base mb-2">
                    11. Yêu cầu điều chỉnh / bổ sung khác
                  </label>
                  <textarea
                    value={form.adjustRequest || ""}
                    onChange={(e) => handleFieldChange("adjustRequest", e.target.value)}
                    placeholder="Ví dụ: Viết lại phần mở đầu hấp dẫn hơn, thêm trò chơi vận động, rút ngắn giáo án, đổi sang thao giảng, thêm câu hỏi đàm thoại, chỉnh sửa bất kỳ phần nào của kế hoạch đã tạo..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-350 text-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-450 focus:bg-white transition-all resize-none"
                    id="adjustRequest"
                  />
                </div>

                {/* Error validation block */}
                {errorMsg && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center space-x-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping mr-1" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                {/* Action build button */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-gradient-to-tr from-[#E15A7A] to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md focus:outline-none transition-all flex items-center justify-center space-x-2 transform active:scale-[0.98]"
                  id="generate-button"
                >
                  <Sparkles size={18} />
                  <span>TIẾN HÀNH SOẠN GIÁO ÁN GỐC</span>
                </button>

              </div>
            </div>

          </div>

          {/* Right Preview/Editor Panel (lg:span-7) */}
          <div className="lg:col-span-7 h-full">
            <div className="bg-white border border-[#F1ECE4]/80 rounded-3xl overflow-hidden shadow-sm flex flex-col h-full min-h-[500px]" id="lesson-preview-container">
              
              {/* Header Action Row */}
              <div className="bg-[#FAF9F5] border-b border-stone-200/60 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Văn Bản Giáo Án Chuyên Nghiệp</h3>
                    <p className="text-[11px] text-slate-400">Cô có thể sao chép hoặc tải file Word tương thích ngay</p>
                  </div>
                </div>

                {result && (
                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    
                    {/* Mode switcher (Preview vs Edit) */}
                    <button
                      onClick={() => {
                        if (isEditing) {
                          setResult(editedText);
                        }
                        setIsEditing(!isEditing);
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-lg transition-all border border-sky-200"
                      title={isEditing ? "Chuyển sang xem thử" : "Sửa văn bản trực tiếp"}
                      id="edit-mode-toggle"
                    >
                      {isEditing ? <Eye size={13} /> : <Edit3 size={13} />}
                      <span>{isEditing ? "Xem bài soạn" : "Sửa nhanh"}</span>
                    </button>

                    {/* Print option */}
                    <button
                      onClick={handlePrint}
                      className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg shadow-sm transition-all text-xs"
                      title="In giáo án ra giấy"
                    >
                      <Printer size={14} />
                    </button>
                    
                    {/* Copy to Clipboard */}
                    <button
                      onClick={handleCopy}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-all shadow-sm"
                      id="copy-text-btn"
                    >
                      <Copy size={13} />
                      <span>{copied ? "Đã sao!" : "Sao chép"}</span>
                    </button>

                    {/* Keep as Saved Lesson */}
                    <button
                      onClick={handleSavePlan}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
                      id="save-plan-btn"
                    >
                      <CheckCircle2 size={13} />
                      <span>Lưu lại của Cô</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Render area */}
              <div className="flex-1 p-6 min-h-[400px]">
                {result ? (
                  <div>
                    {!isEditing ? (
                      <div className="relative">
                        
                        {/* Hàng nút Tải giáo án / Tải phần gợi ý ở phía trên đầu */}
                        <div className="flex flex-wrap items-center gap-3 mb-6" id="tai-giao-an-top-box">
                          <button
                            onClick={() => {
                              if (typeof (window as any).taiGiaoAnRieng === "function") {
                                (window as any).taiGiaoAnRieng();
                              } else {
                                downloadAsWord();
                              }
                            }}
                            className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-sm shrink-0 flex items-center space-x-2 cursor-pointer"
                            id="download-giaoan-rieng-btn"
                          >
                            <span>Tải giáo án</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              if (typeof (window as any).taiGoiYRieng === "function") {
                                (window as any).taiGoiYRieng();
                              } else {
                                showToast("Không tìm thấy phần gợi ý!");
                              }
                            }}
                            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-sm shrink-0 flex items-center space-x-2 cursor-pointer"
                            id="download-goiy-rieng-btn"
                          >
                            <span>Tải phần gợi ý</span>
                          </button>
                        </div>

                        {/* Word download top banner */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
                          <div className="flex items-start space-x-2.5">
                            <span className="text-xl">📄</span>
                            <div>
                              <p className="text-emerald-900 font-bold text-xs sm:text-sm">Trình bày đẹp mắt & Đầy đủ</p>
                              <p className="text-emerald-700 text-[11px] leading-snug">Hệ thống gợi ý thơ, học liệu số và prompt ảnh minh họa AI đã được lồng ghép ở cuối.</p>
                            </div>
                          </div>
                          <button
                            onClick={downloadAsWord}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm shrink-0 flex items-center space-x-1.5 inline-flex"
                            id="download-doc-btn"
                          >
                            <Download size={13} />
                            <span>Tải Bài soạn (.doc)</span>
                          </button>
                        </div>

                        {/* Print area wrapper */}
                        <div 
                          className="select-text shadow-sm rounded-2xl border border-stone-200 bg-white" 
                          id="output"
                          dangerouslySetInnerHTML={{ __html: convertTextToHtml(result) }}
                        />

                        {/* Ô GỢI Ý HỌC LIỆU & HÌNH ẢNH BIÊN SOẠN CHO TIẾT DẠY */}
                        <div className="mt-8 pt-6 border-t border-slate-200/80">
                          <div className="bg-[#FAF9F6] border border-[#EBE5DB] rounded-3xl p-6 shadow-xs">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                              <div className="flex items-center space-x-2.5">
                                <div className="bg-[#FFF2E0] text-amber-700 p-2.5 rounded-2xl">
                                  <BookOpen size={18} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-sm uppercase">Gợi ý học liệu & ảnh minh họa giáo cụ</h4>
                                  <p className="text-[11px] text-slate-400">Thiết lập học cụ trực quan, âm thanh sinh động tương thích với Đề tài</p>
                                </div>
                              </div>
                              <span className="bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">
                                Đạt chuẩn mầm non
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Cột trái: Học liệu mầm non gợi ý */}
                              <div className="space-y-4">
                                <div className="bg-white rounded-2xl p-4 border border-stone-200/60 shadow-xs">
                                  <div className="flex items-center space-x-2 text-[#E15A7A] font-bold text-xs mb-2.5">
                                    <Music size={14} />
                                    <span>KHUYẾN NGHỊ ÂM NHẠC & HIỆU ỨNG</span>
                                  </div>
                                  <div className="space-y-2">
                                    {getSuggestedMaterials(form.topic, form.activity).songs.map((song, idx) => (
                                      <div key={idx} className="bg-[#FFFBFB] p-2.5 rounded-xl border border-rose-50/50">
                                        <p className="font-bold text-slate-800 text-xs">{song.name}</p>
                                        <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{song.desc}</p>
                                      </div>
                                    ))}
                                    <p className="text-[10px] text-slate-500 italic mt-1 leading-normal flex items-start space-x-1">
                                      <span className="text-[#E15A7A] shrink-0">✨</span>
                                      <span>{getSuggestedMaterials(form.topic, form.activity).soundEffects}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="bg-white rounded-2xl p-4 border border-stone-200/60 shadow-xs">
                                  <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs mb-2.5">
                                    <Hammer size={14} />
                                    <span>ĐỒ DÙNG TỰ CHẾ & TRỰC QUAN</span>
                                  </div>
                                  <div className="space-y-1.5 list-none pl-0">
                                    {getSuggestedMaterials(form.topic, form.activity).diyMaterials.map((mat, idx) => (
                                      <div key={idx} className="text-xs text-slate-700 flex items-start space-x-1.5 leading-normal">
                                        <span className="text-[#E15A7A] shrink-0 mt-0.5">🌸</span>
                                        <div>
                                          <strong className="text-slate-800">{mat.name}</strong>: {mat.desc}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="bg-white rounded-2xl p-4 border border-stone-200/60 shadow-xs">
                                  <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs mb-2.5">
                                    <Tv size={14} />
                                    <span>HỌC LIỆU SỐ & TRÌNH CHIẾU</span>
                                  </div>
                                  <div className="space-y-1.5 list-none pl-0">
                                    {getSuggestedMaterials(form.topic, form.activity).digitalResources.map((res, idx) => (
                                      <div key={idx} className="text-xs text-slate-700 flex items-start space-x-1.5 leading-normal">
                                        <span className="text-indigo-400 shrink-0 mt-0.5">⚡</span>
                                        <div>
                                          <strong className="text-slate-800">{res.name}</strong>: {res.desc}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Cột phải: Tranh vẽ tranh treo minh họa bằng AI */}
                              <div className="bg-white rounded-2xl p-4 border border-[#EBE5DB] flex flex-col justify-between shadow-xs">
                                <div>
                                  <div className="flex items-center space-x-2 text-amber-700 font-bold text-xs mb-2.5">
                                    <Image size={14} />
                                    <span>TRANH TREO DẠY HỌC MINH HỌA AI</span>
                                  </div>
                                  
                                  {/* Khung ảnh rực rỡ */}
                                  <div className="relative rounded-xl overflow-hidden aspect-4/3 bg-stone-100 border border-stone-200/60 flex items-center justify-center group">
                                    {isGeneratingImg ? (
                                      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 z-10">
                                        <RefreshCw className="animate-spin text-white mb-2" size={24} />
                                        <span className="text-xs font-bold tracking-wider animate-pulse uppercase">AI đang phác họa họa nét...</span>
                                      </div>
                                    ) : null}
                                    <img
                                      src={getIllustrationUrl(form.topic, imgSeed)}
                                      alt={form.topic}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <span className="absolute bottom-2 right-2 bg-slate-900/70 text-[9px] text-white font-mono px-1.5 py-0.5 rounded-md">
                                      AI Generated - Bản vẽ #{imgSeed}
                                    </span>
                                  </div>

                                  <div className="mt-3 bg-stone-50 p-2.5 rounded-xl border border-stone-100 text-[10px] text-slate-500 leading-normal">
                                    <strong>💡 Gợi ý Prompt vẽ tranh:</strong> "{getSuggestedMaterials(form.topic, form.activity).imagePrompt}"
                                  </div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                  <button
                                    onClick={handleRegenerateImg}
                                    disabled={isGeneratingImg}
                                    className="flex-1 bg-[#E15A7A] hover:bg-rose-600 disabled:bg-rose-350 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1 text-center"
                                  >
                                    <RefreshCw size={12} className={isGeneratingImg ? "animate-spin" : ""} />
                                    <span>ĐỔI TRANH MINH HỌA AI 🎨</span>
                                  </button>
                                  <a
                                    href={getIllustrationUrl(form.topic, imgSeed)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center shadow-xs"
                                    title="Mở ảnh kích thước lớn để tải xuống"
                                  >
                                    <span>XEM & TẢI ẢNH</span>
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Refinement input box at the bottom of the generated lesson plan */}
                        <div className="mt-8 pt-6 border-t border-slate-200/80">
                          <div className="bg-gradient-to-tr from-[#FFF7F5] to-[#FFFBF9] border border-rose-100 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center space-x-2.5 mb-3">
                              <div className="bg-rose-150 text-[#E15A7A] p-2 rounded-xl">
                                <Wand2 size={16} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm">Cô muốn điều chỉnh gì trong Giáo án này?</h4>
                                <p className="text-[11px] text-slate-400">Trợ lý AI sẽ tối ưu và sửa đổi chính xác phân đoạn Cô yêu cầu.</p>
                              </div>
                            </div>
                            
                            <div className="relative">
                              <textarea
                                value={refinementText}
                                onChange={(e) => setRefinementText(e.target.value)}
                                placeholder="Cô muốn thay đổi, bổ sung hay viết lại phân đoạn nào? Ví dụ: 'Thêm hoạt động giáo dục bảo vệ môi trường', hoặc 'Viết thêm một bài thơ ngắn liên quan tới chủ đề vào mục VI'..."
                                rows={3}
                                className="w-full bg-white border border-slate-350 focus:border-rose-500 focus:ring-1 focus:ring-rose-450 text-slate-800 rounded-xl p-3.5 text-xs focus:outline-none transition-all resize-none shadow-inner"
                                id="refinement-textarea"
                              />
                            </div>
                            
                            <div className="mt-3 flex items-center justify-between gap-2.5 flex-wrap">
                              <p className="text-[10px] text-slate-400 italic">
                                * Toàn bộ các phần nội dung hay khác trong giáo án sẽ được giữ nguyên vẹn.
                              </p>
                              <button
                                onClick={handleRefine}
                                disabled={loading || !refinementText.trim()}
                                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center space-x-1.5 shrink-0 transform active:scale-95"
                                id="submit-refinement-btn"
                              >
                                <Sparkles size={12} className="animate-pulse" />
                                <span>ÁP DỤNG ĐIỀU CHỈNH</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl text-xs flex items-center space-x-2">
                          <Info size={14} className="shrink-0" />
                          <p>Cô đang sửa bản gốc giáo án. Sau khi sửa cô hãy bấm "Xem bài soạn" để xem bản đẹp mới hoặc bấm "Lưu lại" để lưu trữ.</p>
                        </div>
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="w-full min-h-[500px] font-mono text-sm bg-slate-50 border border-slate-350 p-4 rounded-xl focus:outline-none focus:border-slate-550 focus:bg-white resize-y"
                          id="raw-markdown-editor"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 max-w-sm mx-auto" id="no-lesson-placeholder">
                    <div className="bg-slate-50 p-6 rounded-full border border-slate-100 mb-4 animate-pulse">
                      <FilePlus size={44} className="text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-700 text-base mb-1">
                      Chưa có giáo án nào được tạo
                    </p>
                    <p className="text-xs text-slate-400 leading-normal">
                      Hãy điền đầy đủ Chủ đề, Đề tài và lựa chọn độ tuổi học sinh mầm non ở biểu mẫu bên trái, sau đó nhấn nút <strong>"Tiến hành soạn giáo án gốc"</strong>.
                    </p>
                    
                    {/* Instant testing suggestion link */}
                    <div className="mt-6 p-3.5 bg-amber-50/40 rounded-2xl border border-amber-200/40 text-[11px] text-amber-800">
                      💡 <strong>Mẹo nhỏ:</strong> Nhấn thử mẫu gợi ý <strong>"Vòng Đời Con Bướm Xinh"</strong> ở phía trên biểu mẫu để điền nhanh đề tài mẫu khám phá thú vị!
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom informational card */}
              {result && (
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex items-center justify-between text-xs text-slate-400">
                  <span>Trợ Lý Giáo Án Mầm Non AI v2.5</span>
                  <span>Bảo lưu bản quyền phòng học © 2026</span>
                </div>
              )}

            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
