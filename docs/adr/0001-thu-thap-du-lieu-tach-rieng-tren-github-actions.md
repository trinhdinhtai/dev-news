# Thu thập dữ liệu chạy riêng trên GitHub Actions, phần web chỉ đọc cơ sở dữ liệu

Việc lấy dữ liệu từ các Source chạy bằng script theo lịch trên GitHub Actions. Script ghi vào Postgres, xong thì gọi API revalidate của web. Ứng dụng Next.js trên Vercel không bao giờ gọi thẳng tới Source mà chỉ đọc cơ sở dữ liệu.

Mình không dùng Vercel Cron vì gói Hobby chỉ cho cron chạy mỗi ngày một lần, mà Source như HN hay Reddit cần cập nhật khoảng 30 phút một lần. Hàm serverless cũng bị giới hạn thời gian chạy. GitHub Actions miễn phí với repo public và không có giới hạn đó.

## Hệ quả

- Lịch chạy của GitHub Actions có thể bị trễ hoặc bị bỏ qua khi GitHub quá tải. Vì vậy mỗi Source lưu thời điểm cập nhật thành công gần nhất và hiện thời điểm này trên giao diện.
- Code thu thập là một script độc lập, mỗi Source là một bộ chuyển đổi (adapter). Muốn cần tự thử lại khi lỗi hoặc có màn hình theo dõi thì có thể chuyển sang Trigger.dev hay Inngest mà không phải viết lại các bộ chuyển đổi.
