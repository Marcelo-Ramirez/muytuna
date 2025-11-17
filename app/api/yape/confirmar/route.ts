// pages/api/yape/confirmar.ts

import { NextRequest, NextResponse } from "next/server";

const YAPE_API_KEY = process.env.YAPE_API_KEY || "e8B4fG9tPz6jL1wA0sD2hY5uQ7xN3rK"; 

export async function POST(req: NextRequest) {
  // 1. SOLO ACEPTAR PETICIONES POST
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
  }

  // 2. OBTENER Y VALIDAR EL TOKEN SECRETO (X-Auth-Token)
  const clientToken = req.headers.get('x-auth-token');

  if (!clientToken || clientToken !== YAPE_API_KEY) {
    // ❌ Rechazar si el token es incorrecto
    console.warn('❌ [YAPE SECURITY] Acceso denegado: Token inválido.');
    return NextResponse.json({ error: 'Token de aplicación inválido.' }, { status: 401 });
  }

  // 3. PROCESAR DATOS (Si el Token es VÁLIDO)
  const { text } = await req.json();
  
  // **********************************************
  // ** TODO: Lógica de Conciliación y DB **
  // **********************************************
  console.log(`✅ [YAPE RECEIVED] Texto: ${text}`);

  // Responder 200 OK para la App Android
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Notificación recibida y autenticada.' 
  }, { status: 200 });
}