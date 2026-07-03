import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, phone, grade, accessToken } = await req.json();

    if (!email || !phone || !grade) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ email, số điện thoại và lớp học." },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Thiếu mã xác thực Google để lưu vào Google Sheets." },
        { status: 401 }
      );
    }

    // 1. Search for existing Google Sheet named "AI Tutor Students"
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='AI Tutor Students' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    const searchRes = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error("Error searching Google Drive:", errText);
      return NextResponse.json(
        { error: "Không thể kết nối tới Google Drive của bạn." },
        { status: 500 }
      );
    }

    const searchData = await searchRes.json();
    let spreadsheetId = "";

    if (searchData.files && searchData.files.length > 0) {
      spreadsheetId = searchData.files[0].id;
    } else {
      // 2. Create a new Google Sheet if not found
      const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "AI Tutor Students",
          mimeType: "application/vnd.google-apps.spreadsheet",
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Error creating Google Sheet:", errText);
        return NextResponse.json(
          { error: "Không thể tạo file Google Sheet mới trên Drive của bạn." },
          { status: 500 }
        );
      }

      const createData = await createRes.json();
      spreadsheetId = createData.id;

      // 3. Initialize headers for new spreadsheet
      const initUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW`;
      await fetch(initUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [["Email", "Số điện thoại", "Lớp học", "Ngày đăng ký"]],
        }),
      });
    }

    // 4. Append user info
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW`;
    const appendRes = await fetch(appendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [[email, phone, grade, new Date().toLocaleString("vi-VN")]],
      }),
    });

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      console.error("Error appending to Google Sheet:", errText);
      return NextResponse.json(
        { error: "Không thể lưu thông tin vào Google Sheet." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    });
  } catch (error: any) {
    console.error("Sheet API error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lưu thông tin người học." },
      { status: 500 }
    );
  }
}
