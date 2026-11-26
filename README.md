# React Quiz

Ứng dụng trắc nghiệm React + Vite, dùng dữ liệu JSON tĩnh trong `public/res/`.

## Chạy local

```bash
npm install
npm run dev
```

## Build production

```bash
npm run build
npm run preview
```

Bản build được tạo trong thư mục `dist/`.

## Tính năng

- Chọn bộ câu hỏi từ `public/res/manifest.json`.
- Hỗ trợ câu hỏi chọn một hoặc nhiều đáp án (`single`, `multi` hoặc `mutil`).
- Hiển thị đáp án và giải thích sau khi nộp.
- Chuyển giao diện sáng/tối; lựa chọn được lưu trên trình duyệt.
- Đồng hồ đếm ngược nhập giờ/phút, Start/Pause/Reset và cảnh báo khi hết giờ.
- Nhập tên người làm bài; tiến độ và lựa chọn được tự động lưu trong `localStorage` theo tên + bộ đề.
- Skip câu hỏi, dùng thanh số câu để quay lại; tổng kết số đúng, sai và chưa trả lời.

## Lưu ý về lưu tiến độ

Tiến độ được lưu trên trình duyệt và thiết bị hiện tại, không đồng bộ lên GitHub hoặc giữa các thiết bị. Nếu xóa dữ liệu trang web/trình duyệt, tiến độ đã lưu có thể mất.

## Thêm bộ câu hỏi

Thêm ba file tương ứng vào `public/res/`:

- `question_2.json`
- `answer_2.json`
- `resionable_2.json`

Sau đó thêm ID vào `public/res/manifest.json`, ví dụ:

```json
{ "datasets": ["1", "2"] }
```
