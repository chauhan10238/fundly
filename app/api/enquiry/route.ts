import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const formData = await request.formData()
  console.log("New enquiry:", Object.fromEntries(formData.entries()))
  return NextResponse.redirect(
    new URL("/?enquiry=received#contact", request.url),
    303,
  )
}
