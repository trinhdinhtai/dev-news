# Dev News

Nơi để developer trên toàn thế giới nắm bắt những gì đang trending trên các nền tảng họ theo dõi: repo hot, bài viết, video và bài đăng. Ngoài các Source quốc tế, ứng dụng có thêm một số Source của Việt Nam như Viblo.

## Thuật ngữ

**Source** (Nguồn):
Một nền tảng bên ngoài mà nội dung trending được thu thập từ đó, ví dụ GitHub Trending, Hacker News, Viblo hay YouTube.
_Tránh dùng_: provider, platform, kênh, feed

**Regional Source** (Nguồn khu vực):
Một Source mà nội dung chủ yếu thuộc một ngôn ngữ hoặc khu vực, ví dụ Viblo. Mặc định nó bị ẩn, trừ khi giao diện đang dùng đúng ngôn ngữ đó hoặc Member tự bật lên.
_Tránh dùng_: local source, nguồn Việt

**Item** (Mục):
Một nội dung trending đơn lẻ đến từ một Source: một repo, một bài viết, một video hoặc một bài đăng.
_Tránh dùng_: post, bài, content, entry, link

**Source Ranking** (Bảng xếp hạng của nguồn):
Danh sách Item có thứ tự, đang trending trong một Time Window. Thường thì chính Source công bố bảng này. Khi Source không có bảng riêng (như YouTube), mình tự lập bảng từ dữ liệu của Source. Một Item được coi là "trending" khi và chỉ khi nó nằm trong một Source Ranking.
_Tránh dùng_: leaderboard, top list, bảng hot

**Time Window** (Khung thời gian):
Khoảng thời gian mà một Source Ranking bao phủ: một ngày hoặc một tuần.
_Tránh dùng_: period, range, giai đoạn

**Dev Keyword** (Từ khoá dev):
Một từ khoá liên quan đến lập trình, như "react" hay "rust", dùng để tìm Item trên những Source không có bảng xếp hạng riêng.
_Tránh dùng_: tag, topic, search term

**Ranking Snapshot** (Bản chụp bảng xếp hạng):
Bản lưu lại một Source Ranking của một ngày, tính theo giờ UTC. Đó là lần thu thập thành công cuối cùng trước 0:00 UTC, giữ nguyên để có thể xem lại về sau.
_Tránh dùng_: archive, history, log

**Overview** (Tổng hợp):
Trang gộp vài Item đứng đầu của mỗi Source vào một chỗ, không so sánh điểm giữa các Source với nhau.
_Tránh dùng_: unified feed, home feed, feed chung

## Người dùng

**Member** (Thành viên):
Người đã đăng nhập. Người chưa đăng nhập vẫn xem được mọi Source Ranking và Overview.
_Tránh dùng_: account, user (khi muốn nói riêng người đã đăng nhập)

**Saved Item** (Item đã lưu):
Một Item mà Member đánh dấu để xem lại sau. Nó vẫn còn kể cả khi bản gốc đã bị xoá hoặc đã rơi khỏi Source Ranking.
_Tránh dùng_: bookmark, favorite, yêu thích

**Source Selection** (Nguồn đã chọn):
Tập các Source mà một Member muốn thấy. Overview của Member chỉ hiện các Source trong tập này. Nếu Member chưa chọn, tập này gồm mọi Source không phải Regional Source, cộng thêm các Regional Source đúng với ngôn ngữ giao diện.
_Tránh dùng_: subscription, follow, preferences
