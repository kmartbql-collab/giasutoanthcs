import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, email, phone, grade } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: "Yêu cầu mã xác thực OAuth (accessToken)" }, { status: 400 });
    }
    if (!email || !phone || !grade) {
      return NextResponse.json({ error: "Thiếu thông tin người học" }, { status: 400 });
    }

    // 1. Search for existing Google Sheet
    const query = encodeURIComponent("name='Gia Sư Toán Lớp 6-9 - Danh sách Học viên' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}`;
    
    const searchRes = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error("Drive search error:", errText);
      return NextResponse.json({ error: "Lỗi khi tìm kiếm tệp trên Google Drive", details: errText }, { status: searchRes.status });
    }

    const searchData = await searchRes.json();
    let spreadsheetId = "";

    if (searchData.files && searchData.files.length > 0) {
      spreadsheetId = searchData.files[0].id;
    } else {
      // 2. Create a new Google Sheet if not found
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            title: "Gia Sư Toán Lớp 6-9 - Danh sách Học viên",
          },
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Sheets create error:", errText);
        return NextResponse.json({ error: "Không thể tạo tệp Google Sheet mới", details: errText }, { status: createRes.status });
      }

      const createData = await createRes.json();
      spreadsheetId = createData.spreadsheetId;

      // 3. Initialize header row for newly created sheet
      const headerRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:D1?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: "A1:D1",
          majorDimension: "ROWS",
          values: [
            ["Gmail", "Số điện thoại", "Lớp học", "Thời gian đăng ký"]
          ],
        }),
      });

      if (!headerRes.ok) {
        console.warn("Failed to write headers to Google Sheet:", await headerRes.text());
      }
    }

    // 4. Append the learner data row to the sheet
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:D:append?valueInputOption=USER_ENTERED`;
    const appendRes = await fetch(appendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range: "A:D",
        majorDimension: "ROWS",
        values: [
          [email, phone, grade, new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })]
        ],
      }),
    });

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      console.error("Sheets append error:", errText);
      return NextResponse.json({ error: "Lỗi khi lưu thông tin vào Google Sheet", details: errText }, { status: appendRes.status });
    }

    return NextResponse.json({ success: true, spreadsheetId });

  } catch (error: any) {
    console.error("Save to sheet API error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi hệ thống", details: error.message }, { status: 500 });
  }
}
