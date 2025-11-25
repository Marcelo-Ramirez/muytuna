
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const POST = async (req: Request) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: "No file received"
      }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({
        success: false,
        error: "Only images are allowed"
      }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: "Image must be less than 5MB"
      }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "images", "products", "otros");
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const ext = file.name.split(".").pop()?.toLowerCase();
    const fileName = `product_${timestamp}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    const imageUrl = `/images/products/otros/${fileName}`;

    return NextResponse.json({
      success: true,
      imageUrl
    });

  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
};