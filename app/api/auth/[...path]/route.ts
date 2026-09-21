import { getAuth } from "@/lib/auth";

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) { return getAuth().handler().GET(request, context); }
export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) { return getAuth().handler().POST(request, context); }
export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) { return getAuth().handler().PUT(request, context); }
export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) { return getAuth().handler().PATCH(request, context); }
export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) { return getAuth().handler().DELETE(request, context); }
