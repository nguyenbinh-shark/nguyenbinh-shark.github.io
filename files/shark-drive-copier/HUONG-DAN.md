# Shark Drive Copier

Chrome extension Manifest V3, TypeScript + Vite, giao diện tiếng Việt. Copy file và toàn bộ cây thư mục Google Drive được chia sẻ sang Drive của tài khoản đã đăng nhập. Nội dung file được Google sao chép bằng **Drive API v3 `files.copy`**, không tải về rồi upload qua máy. Thư mục đích được tạo bằng `files.create` với metadata; extension chỉ đọc/ghi metadata và trạng thái công việc. Xem [API `files.copy`](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/copy).

Giải nén gói mã nguồn rồi mở thư mục `drive-copier/`. Mọi JavaScript, CSS và icon đều đóng gói trong `dist/`; không tải mã thực thi từ bên ngoài.

## 1. Build và load unpacked

Yêu cầu Node.js `^22.12.0 || ^24.0.0 || >=26.0.0`, npm và **Google Chrome 116 trở lên**. API mở side panel bằng thao tác của người dùng có từ Chrome 116: [tài liệu Side Panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel#method-open).

Trong thư mục project:

```sh
cd drive-copier
npm i && npm run build
npm test
```

Với Windows PowerShell 5.1, chạy `npm i` và `npm run build` thành hai lệnh riêng vì phiên bản này chưa hỗ trợ `&&`.

1. Mở `chrome://extensions`, bật **Developer mode**.
2. Chọn **Load unpacked**, chọn thư mục `drive-copier/dist/`.
3. Ghi lại **ID** của Shark Drive Copier để cấu hình OAuth ở bước tiếp theo.
4. Có thể ghim icon extension trên thanh công cụ; bấm icon để mở side panel.

Bản build đầu tiên dùng `extension.config.example.json` với `clientId` placeholder và một public key phát triển hợp lệ. Key mẫu cố định ID và giúp Chrome load được extension; **đăng nhập chưa dùng được cho đến khi thay OAuth Client ID**. Không thay `key` bằng chuỗi chữ placeholder vì Chrome cần public key DER/SPKI mã hóa Base64 hợp lệ.

Sau mỗi lần sửa cấu hình hoặc mã nguồn, chạy lại `npm run build`, bấm **Reload** trên thẻ extension. Reload cả tab Drive đang mở để nạp content script mới.

## 2. Tạo Google Cloud project và OAuth Client

1. Mở [Google Cloud Console](https://console.cloud.google.com/), tạo project riêng.
2. Vào **APIs & Services → Library**, bật **Google Drive API**.
3. Mở **Google Auth Platform** / **OAuth consent screen**. Điền tên app, email hỗ trợ và thông tin liên hệ. Chọn Audience **External**; khi phát triển, giữ trạng thái **Testing**.
4. Trong **Data Access / Scopes**, thêm đúng scope:

   ```text
   https://www.googleapis.com/auth/drive
   ```

   Scope `drive.file` chỉ cho phép truy cập các file được mở/chọn/chia sẻ với app theo cơ chế tương ứng. Nó không đủ để duyệt tùy ý mọi file con trong thư mục chia sẻ từ một link; project này dùng scope `drive` theo yêu cầu. [Phân loại và quyền của các scope Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

5. Trong **Audience → Test users**, thêm email của từng tài khoản Google sẽ dùng extension.
6. Vào **Clients / Credentials → Create OAuth client ID**, chọn loại ứng dụng **Chrome Extension**. Nhập tên và **Item ID / Extension ID** lấy từ `chrome://extensions`. Không chọn loại Web application hoặc Desktop app.
7. Copy **Client ID**, thường kết thúc bằng `.apps.googleusercontent.com`. Không cần client secret.
8. Copy `extension.config.example.json` thành `extension.config.json`, giữ nguyên `key`, thay `clientId`:

   ```json
   {
     "clientId": "YOUR_CLIENT_ID.apps.googleusercontent.com",
     "key": "GIU_NGUYEN_PUBLIC_KEY_HOP_LE_DA_COPY_TU_FILE_MAU"
   }
   ```

   Đoạn JSON trên minh họa trường cần sửa; giá trị `key` phải là chuỗi Base64 thật trong file mẫu. `extension.config.json` được Git ignore; build ưu tiên file này. Build ghi `clientId` vào `oauth2.client_id` và public key vào `key` của `dist/manifest.json`.
9. Chạy `npm run build`, reload extension, kiểm tra ID vẫn trùng OAuth Client. Bấm **Đăng nhập** trong side panel và cấp quyền cho đúng tài khoản test.

Nếu chưa thấy loại **Chrome Extension**, kiểm tra đang ở trang tạo OAuth Client của đúng project. Quy trình đăng ký client theo ID và thiết lập `oauth2`/`key` được mô tả trong [hướng dẫn OAuth của Chrome](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth).

## 3. Public key để giữ Extension ID cố định

Chrome suy ra ID từ public key trong manifest. Dùng cùng `key` giúp ID giữ nguyên khi đổi đường dẫn project hoặc rebuild. Key mẫu dành cho phát triển; có thể tạo public key riêng **trước khi đăng ký OAuth Client**:

```sh
npm run keygen
npm run build
```

Script tạo RSA 2048-bit, ghi public key SPKI/DER Base64 vào `extension.config.json` và in Extension ID tương ứng. Private key không được lưu; public key này chỉ để giữ ID của bản unpacked, không dùng để ký gói `.crx`. Khi file cấu hình đã tồn tại, script dừng và giữ nguyên file. Chỉ khi chủ động muốn thay key, ID và cấu hình OAuth:

```sh
npm run keygen -- --force
```

`--force` ghi lại `clientId` placeholder. Điền Client ID gắn với **ID mới**, rebuild và load/reload extension. Đổi public key làm đổi ID, đồng thời có thể khiến Chrome xem đây là extension khác với vùng lưu trữ riêng.

Khi chuẩn bị phát hành trên Chrome Web Store, dùng public key của item trên Developer Dashboard để bản phát triển và bản phát hành dùng chung ID: upload ZIP chưa publish, mở **Package → View public key**, bỏ dòng `BEGIN/END PUBLIC KEY` và xuống dòng, rồi đặt vào `key`. Đăng ký OAuth Client cho đúng ID của item đó. Xem [hướng dẫn public key chính thức](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth#keep-a-consistent-extension-id).

## 4. Cách dùng

1. Mở side panel từ icon extension và **Đăng nhập**. Email hiển thị được lấy bằng Drive `about.get`, không cần thêm scope email.
2. Dán link hoặc ID nguồn. Các dạng được hỗ trợ: `/folders/<id>`, `/file/d/<id>`, `/d/<id>`, `?id=<id>` và ID trần.
3. **Thư mục đích** có thể bỏ trống để dùng My Drive, hoặc nhập link/ID thư mục có quyền tạo file. **Tên mới** là tùy chọn cho file/thư mục gốc của bản sao.
4. Bấm **Bắt đầu**. Thư mục nguồn được duyệt theo chiều rộng (BFS), có phân trang. Tối đa bốn request copy file chạy đồng thời; job mới xếp vào hàng chờ khi job khác đang chạy.
5. Side panel hiển thị file đã copy/file đã phát hiện, số thư mục, đường dẫn hiện tại, tiến độ, lỗi và lịch sử gần đây. Tổng số file tăng khi phát hiện thêm nội dung nên phần trăm có thể giảm trong lúc duyệt cây thư mục.
6. **Tạm dừng**, **Tiếp tục**, **Huỷ** áp dụng cho job đang chọn. Request đã gửi có thể hoàn tất sau khi bấm Tạm dừng/Huỷ; bản sao đã tạo được giữ lại trong Drive.
7. Khi xong, mở link kết quả hoặc dùng nút trong thông báo Chrome. Một số file bị bỏ qua sẽ được ghi trong danh sách lỗi; kiểm tra log trước khi coi cây thư mục là đầy đủ.

Trên trang Drive có URL `/drive/folders/<id>` hoặc `/file/d/<id>`, nút nổi **Copy vào Drive của tôi** mở side panel và điền link nguồn. Content script dùng Shadow DOM, theo dõi thay đổi trang/URL khi Drive điều hướng dạng SPA. Có thể bấm chuột phải trên trang Drive hoặc trên link `drive.google.com` rồi chọn **Copy vào Drive của tôi**. Thao tác này chỉ điền nguồn; việc copy bắt đầu sau khi bấm Bắt đầu.

Shortcut được giải quyết đến file/thư mục đích thật; mỗi ID nguồn/đích shortcut được xử lý một lần trong mỗi job để tránh vòng lặp và copy trùng. Nếu nhiều shortcut trỏ tới cùng một đối tượng, extension chỉ tạo một bản sao tại đường dẫn gặp đầu tiên, không tạo bản sao riêng ở mọi đường dẫn shortcut. File có `canCopy=false` được bỏ qua với lỗi **chủ sở hữu chặn copy**. Extension không vượt qua quyền chia sẻ hoặc hạn chế của chủ sở hữu. Tránh thay đổi cây nguồn trong khi chạy: Drive không cung cấp snapshot nhất quán cho toàn bộ cây thư mục qua `files.list`.

## 5. Resume, lỗi và giới hạn

Service worker MV3 có thể bị Chrome dừng. Engine lưu checkpoint sau mỗi bước nhỏ: hàng đợi thư mục, page token, ánh xạ thư mục nguồn/đích, thao tác chưa hoàn tất, ID file đã copy, bộ đếm và lỗi. Extension đọc lại trạng thái khi worker khởi động; alarm mỗi phút đánh thức worker khi có job chạy, và được gỡ khi không còn job chạy. Mở lại side panel sẽ đọc state từ `chrome.storage.local`. Chrome phải đang chạy; alarm không chạy khi trình duyệt đã thoát.

Trước thao tác tạo/copy, engine lưu ý định và gắn marker riêng vào `appProperties` của bản sao. Khi resume, nó tìm bản sao có marker để đối soát thay vì copy lại những file đã có checkpoint. **Drive API và storage của Chrome không có giao dịch chung hay khóa idempotency tuyệt đối**: nếu kết nối mất sau khi Google nhận request, có thể chưa biết thao tác đã thành công hay chưa. Engine tạm dừng và báo trạng thái mơ hồ thay vì gửi lại request một cách mù quáng; kiểm tra Drive/log trước khi xử lý tiếp. Marker giảm nguy cơ trùng lặp, không phải cam kết exactly-once cho mọi lỗi mạng hoặc độ trễ hiển thị của Drive.

- HTTP 401: xóa token cache, xin token mới rồi retry một lần. Khi cần đăng nhập lại, job chờ người dùng cấp quyền.
- HTTP 429/500/503 và 403 với `rateLimitExceeded`/`userRateLimitExceeded`: retry có giới hạn bằng exponential backoff + jitter. Request ghi bị từ chối rõ ràng (429/403 rate limit) được đối soát marker rồi retry; sau 500/503, chỉ retry truy vấn đối soát, không gửi lại request ghi khi kết quả chưa xác định.
- Hết dung lượng (`storageQuotaExceeded`) hoặc chạm giới hạn copy/ngày: dừng job và thông báo; các bản sao trước đó vẫn được giữ.
- Mỗi job gắn với tài khoản Drive ban đầu. Job cũ không tự chạy sang tài khoản khác. Sau **Đăng xuất**, worker không tự xin lại token; đăng nhập đúng tài khoản rồi Tiếp tục khi phù hợp.
- `chrome.storage.local` có giới hạn khoảng 10 MB trên Chrome hiện tại. Project không xin `unlimitedStorage`; cây cực lớn hoặc log nhiều có thể đầy vùng lưu trữ và khiến job phải dừng. Lịch sử giữ tối đa 20 job đã kết thúc, còn các job đang chờ/tạm dừng vẫn được giữ. [Giới hạn storage của Chrome](https://developer.chrome.com/docs/extensions/reference/api/storage#property-local).
- App đang testing/chưa verify có thể hiện cảnh báo và bị giới hạn **100 user**; đây là giới hạn OAuth, không phải số job. [Google: Unverified apps](https://support.google.com/googleapi/answer/7454865), [các trường hợp không cần verification](https://support.google.com/cloud/answer/13464323).
- Scope `drive` là **restricted**. Phát hành app cho đại chúng cần Google OAuth verification cho scope này, cùng yêu cầu Chrome Web Store. Security assessment áp dụng khi app có thể truy cập dữ liệu restricted qua server bên thứ ba; bản này chạy trong Chrome và gọi trực tiếp Google, không có server riêng, nên không thể kết luận rằng mọi lần publish đều tự động phải assessment. Cần xác nhận phân loại/ngoại lệ với Google khi chuẩn bị phát hành. [Google: restricted scope verification và security assessment](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).
- Google tài liệu hóa hạn mức khoảng **750 GB/ngày tổng upload + copy mỗi tài khoản Google Workspace**, tính gộp My Drive và shared drives; hạn mức còn chịu chính sách/dung lượng tài khoản, không phải tốc độ mà extension bảo đảm. [Hạn mức Drive API](https://developers.google.com/workspace/drive/api/guides/limits#additional_constraints).
- Cách đăng nhập này dùng `chrome.identity.getAuthToken` và chỉ hỗ trợ **Google Chrome**. Không hỗ trợ Edge/Brave trong bản này; muốn hỗ trợ phải thêm OAuth fallback `launchWebAuthFlow` với cấu hình redirect/client phù hợp. [Edge không hỗ trợ `getAuthToken`](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support), [issue về Brave](https://github.com/brave/brave-browser/issues/7693).

## 6. Quyền truy cập và dữ liệu

Manifest xin `identity`, `storage`, `alarms`, `contextMenus`, `notifications`, `sidePanel`. Quyền host cho `https://www.googleapis.com/*` dùng Drive API, `https://drive.google.com/*` dùng nút trên Drive và các link kết quả. Có thêm `https://oauth2.googleapis.com/revoke*` để gọi endpoint Google thu hồi token khi Đăng xuất.

Access token do Chrome Identity quản lý; extension không ghi token vào `chrome.storage.local` hoặc log. State cục bộ chứa ID file/thư mục, tên, đường dẫn, lỗi và thông tin tài khoản để khôi phục job. Marker đối soát nằm trong metadata `appProperties` của bản sao trên Google Drive. Không có analytics, server trung gian hoặc remote code.

**Xuất log .txt** tạo một file văn bản metadata/lỗi trên máy; đây không phải tải nội dung file nguồn từ Drive. Log có thể chứa tên file và ID Drive, nên kiểm tra trước khi chia sẻ. Đăng xuất xóa token cache và gọi revoke; thao tác này không xóa lịch sử cục bộ hay bản sao đã tạo. Gỡ extension sẽ xóa vùng lưu trữ của extension; bản sao trong Drive vẫn còn.

## 7. Cấu trúc và kiểm tra

```text
extension.config.example.json    OAuth placeholder + public key mẫu hợp lệ
extension.config.json            Cấu hình riêng, Git ignore
src/background/                 Service worker, hàng chờ, alarm, auth, thông báo
src/sidepanel/                  HTML/CSS/TypeScript, tiến độ và lịch sử
src/content/                    Nút nổi trên Drive qua Shadow DOM
src/lib/driveClient.ts           Fetch, auth, retry và đối soát
src/lib/copyEngine.ts            Engine nhận Drive client qua tham số
src/lib/store.ts                 Persist checkpoint
src/lib/parseLink.ts             Parse và kiểm tra link/ID
scripts/generate-key.mjs         Tạo public key và in Extension ID
scripts/generate-icons.mjs       Sinh PNG 16/32/48/128 bằng Node builtins
public/icons/logo.svg            Logo cá mập dạng vector để chỉnh sửa
public/icons/icon512.png         Logo lớn dùng cho hình giới thiệu
dist/                           Bản build để Load unpacked
```

```sh
npm run icons       # Sinh lại icon; không cần thư viện đồ họa bên ngoài
npm test            # Vitest: parseLink, engine và mock API/retry
npm run build       # Typecheck + Vite; tạo dist/manifest.json và các entry
```

Unit test mô phỏng Drive client/fetch; test pass không thay thế kiểm tra OAuth và quyền thực tế. Sau khi có Client ID, thử một thư mục nhỏ gồm file, thư mục con và shortcut; kiểm tra đích, Tạm dừng/Tiếp tục, reload extension khi job đang chạy và đối chiếu log. Có thể dùng **Service worker → Inspect** trên thẻ extension để xem lỗi; đóng DevTools khi thử hành vi worker bị dừng vì DevTools có thể giữ worker sống.

Nếu gặp `OAuth2 not granted`, kiểm tra ID extension/Item ID, Client ID, Drive API đã bật, scope và email trong Test users. Nếu copy trả 403/404, kiểm tra quyền nguồn/đích bằng chính tài khoản hiển thị trong side panel. Sửa cấu hình nguồn, không sửa trực tiếp `dist/manifest.json` vì lần build sau sẽ ghi lại file này.
