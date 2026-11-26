# React Quiz Practice

## Chạy trên máy
1. Cài Node.js bản LTS.
2. Giải nén thư mục, mở terminal tại thư mục `react-quiz`.
3. Chạy:
   ```bash
   npm install
   npm run dev
   ```
4. Mở địa chỉ Vite hiển thị trong terminal (thường là http://localhost:5173).

## Thêm bộ câu hỏi mới
- Thêm `question_2.json`, `answer_2.json`, `resionable_2.json` vào `public/res/`.
- Sửa `public/res/manifest.json`:
  ```json
  { "datasets": ["1", "2"] }
  ```
- Tên `resionable` được giữ đúng như tên file bạn đang dùng.

## Cấu trúc dữ liệu
- `question_N.json`: object theo ID câu hỏi; mỗi câu có `question`, `type`, và các lựa chọn `A`, `B`, `C`...
- `type`: dùng `single` cho radio hoặc `multi` cho checkbox. Code cũng chấp nhận `mutil` vì file mẫu hiện tại đang dùng giá trị này.
- `answer_N.json`: mỗi ID là mảng đáp án, ví dụ `"5": ["B", "D"]`.
- `resionable_N.json`: mỗi ID là object giải thích theo từng lựa chọn, ví dụ `"5": {"A": "...", "B": "..."}`.

Lưu ý: Đây là web tĩnh. Các JSON trong `public/res/` sẽ được tải công khai từ trình duyệt, không đặt dữ liệu bí mật trong đó.
