"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail, sendSMS } from "@/lib/notifications";
import * as fs from 'fs';

export type NotificationType = "WELCOME" | "OTP_SIGN" | "PROXY_DOCUMENT";
export type NotificationChannel = "EMAIL" | "SMS";

export interface NotificationTemplate {
  id?: string;
  assembly_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
}

// Default templates for fallbacks
const DEFAULT_TEMPLATES: Record<NotificationType, Record<NotificationChannel, { subject: string | null, body: string }>> = {
  WELCOME: {
    EMAIL: {
      subject: "Credenciales de Acceso a su Asamblea",
      body: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Acceso a Plataforma – Asamblea General</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d3b6e 0%,#1a6faf 100%);padding:36px 40px 28px;text-align:center;">
              <p style="margin:0 0 10px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#7ec8f7;font-weight:600;">PH Core Latam</p>
              <img src="{{appUrl}}/ph-core-logo.png" alt="PH Core Icon" height="52" style="display:block;margin:0 auto 16px; border:0;" />
              <p style="margin:0;font-size:14px;color:#a8d4f0;line-height:1.5;">Acceso a Plataforma – Asamblea General<br/><strong style="color:#ffffff;">{{assembly_name}}</strong></p>
            </td>
          </tr>

          <!-- SALUDO + PRESENTACIÓN -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0 0 16px;font-size:17px;color:#1a2e45;font-weight:700;">Estimado/a <span style="color:#1a6faf;">{{name}}</span>,</p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#3d5166;">
                Para <strong>PH Core</strong> es un honor acompañarlos en su próxima asamblea general. Somos una plataforma líder en soluciones tecnológicas para la propiedad horizontal, y nuestro objetivo es facilitarles una experiencia de participación ágil, transparente y moderna.
              </p>
            </td>
          </tr>

          <!-- DIVISOR -->
          <tr>
            <td style="padding:24px 40px 0;">
              <hr style="border:none;border-top:1px solid #e2eaf2;margin:0;" />
            </td>
          </tr>

          <!-- CREDENCIALES -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0d3b6e;">🔐 Sus datos para ingresar a la plataforma</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fafd;border-radius:10px;border:1px solid #d0e4f7;overflow:hidden;">
                <tr>
                  <td style="padding:8px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:14px 24px;border-bottom:1px solid #e2eaf2;">
                          <span style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#7a9bb5;font-weight:600;">👤 Usuario</span><br/>
                          <span style="font-size:18px;font-weight:800;color:#0d3b6e;letter-spacing:1px;">{{doc_number}}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 24px;">
                          <span style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#7a9bb5;font-weight:600;">🔑 Contraseña</span><br/>
                          <span style="font-size:18px;font-weight:800;color:#0d3b6e;letter-spacing:2px;">{{password}}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIVISOR -->
          <tr>
            <td style="padding:24px 40px 0;">
              <hr style="border:none;border-top:1px solid #e2eaf2;margin:0;" />
            </td>
          </tr>

          <!-- PASOS -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#0d3b6e;">🚀 Cómo ingresar a la plataforma</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <tr>
                  <td style="padding:8px 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td valign="top" style="padding-right:14px;padding-top:1px;" width="32">
                          <div style="width:26px;height:26px;background:#1a6faf;border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:800;color:#fff;">1</div>
                        </td>
                        <td>
                          <p style="margin:0 0 10px;font-size:14px;color:#3d5166;line-height:1.6;">Ingrese a la plataforma haciendo clic en el siguiente botón:</p>
                          <a href="{{appUrl}}/login?user={{doc_number}}" style="display:inline-block;background:#1a6faf;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:6px;">Acceder a PH Core</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:8px 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td valign="top" style="padding-right:14px;padding-top:1px;" width="32">
                          <div style="width:26px;height:26px;background:#1a6faf;border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:800;color:#fff;">2</div>
                        </td>
                        <td><p style="margin:0;font-size:14px;color:#3d5166;line-height:1.6;">Escriba su usuario y contraseña tal como aparecen en este correo.</p></td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:8px 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td valign="top" style="padding-right:14px;padding-top:1px;" width="32">
                          <div style="width:26px;height:26px;background:#1a6faf;border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:800;color:#fff;">3</div>
                        </td>
                        <td><p style="margin:0;font-size:14px;color:#3d5166;line-height:1.6;">Verá un <strong>código QR</strong> para presentarlo el día de la asamblea y registrar su asistencia de forma instantánea.</p></td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:8px 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td valign="top" style="padding-right:14px;padding-top:1px;" width="32">
                          <div style="width:26px;height:26px;background:#1a6faf;border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:800;color:#fff;">4</div>
                        </td>
                        <td><p style="margin:0;font-size:14px;color:#3d5166;line-height:1.6;">Si va a delegar su voto, cuenta con <strong>dos formas digitales</strong> de hacerlo en la plataforma.</p></td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:8px 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td valign="top" style="padding-right:14px;padding-top:1px;" width="32">
                          <div style="width:26px;height:26px;background:#1a6faf;border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:800;color:#fff;">5</div>
                        </td>
                        <td><p style="margin:0;font-size:14px;color:#3d5166;line-height:1.6;">Participe y <strong>vote en las decisiones de la asamblea</strong> desde su dispositivo móvil de forma segura y en tiempo real.</p></td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- CTA BUTTON -->
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <a href="{{appUrl}}/login" style="display:inline-block;background:linear-gradient(135deg,#1a6faf,#0d3b6e);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.5px;">
                Ingresar a la plataforma →
              </a>
            </td>
          </tr>

          <!-- DIVISOR -->
          <tr>
            <td style="padding:28px 40px 0;">
              <hr style="border:none;border-top:1px solid #e2eaf2;margin:0;" />
            </td>
          </tr>

          <!-- PODER ANTICIPADO -->
          <tr>
            <td style="padding:24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border-radius:10px;border:1px solid #fca5a5;overflow:hidden;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 14px;font-size:16px;font-weight:800;color:#991b1b;">🚨 ¡Muy importante: Si usted no puede asistir, a partir de hoy puede presentar su poder en la plataforma!</p>
                    <p style="margin:0 0 14px;font-size:13px;color:#7f1d1d;line-height:1.7;">
                      Le solicitamos cargarlo en la plataforma <strong>con anticipación</strong>.
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#991b1b;">¿Por qué hacerlo antes?</p>
                    <p style="margin:0 0 14px;font-size:13px;color:#7f1d1d;line-height:1.7;">
                      Tramitar poderes de forma presencial el mismo día genera filas y retrasa el inicio de la asamblea para todos. Si lo sube hoy mismo a través del enlace de arriba, su ingreso será inmediato y garantizaremos la puntualidad del evento.
                    </p>
                    <p style="margin:0;font-size:14px;font-weight:800;color:#991b1b;text-align:center;">¡Hagámoslo más práctico para todos!</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIVISOR -->
          <tr>
            <td style="padding:28px 40px 0;">
              <hr style="border:none;border-top:1px solid #e2eaf2;margin:0;" />
            </td>
          </tr>

          <!-- INFORMACIÓN CLAVE -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0d3b6e;">📋 Fecha, hora y lugar de la asamblea</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8f4fd;border-radius:10px;border-left:5px solid #1a6faf;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px;font-size:14px;color:#1a2e45;line-height:1.7;">
                      📅 <strong>Fecha:</strong> Sábado, 28 de febrero de 2026.
                    </p>
                    <p style="margin:0 0 10px;font-size:14px;color:#1a2e45;line-height:1.7;">
                      🕑 <strong>Hora de inicio:</strong> 2:00 PM.
                    </p>
                    <p style="margin:0 0 10px;font-size:14px;color:#1a2e45;line-height:1.7;">
                      ⏰ <strong>Registro de asistencia:</strong> Por favor, llegue 15 minutos antes <strong>(1:45 PM)</strong> para realizar su registro de entrada sin contratiempos.
                    </p>
                    <p style="margin:0;font-size:14px;color:#1a2e45;line-height:1.7;">
                      📍 <strong>Lugar:</strong> Cancha de microfútbol, zona social de {{assembly_name}}.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTACTO -->
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <p style="margin:0 0 16px;font-size:14px;color:#3d5166;line-height:1.7;">
                Si tiene alguna duda técnica antes del evento, no dude en contactarnos vía WhatsApp:
              </p>
              <a href="https://wa.me/573053601190" style="display:inline-block;background:linear-gradient(135deg,#25D366,#128C7E);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 30px;border-radius:8px;letter-spacing:0.5px;box-shadow:0 2px 10px rgba(37,211,102,0.3);">
                💬 Contactar Soporte
              </a>
            </td>
          </tr>

          <!-- FIRMA -->
          <tr>
            <td style="padding:32px 40px 0;">
              <img src="{{appUrl}}/icon-dark.png" alt="PH Core Icon" height="36" style="display:block;margin:0 0 12px; border:0;" />
              <p style="margin:0 0 2px;font-size:14px;color:#7a9bb5;">Cordialmente,</p>
              <p style="margin:0 0 2px;font-size:16px;font-weight:800;color:#0d3b6e;">Equipo PH Core</p>
              <p style="margin:0;font-size:13px;color:#7a9bb5;font-style:italic;">Soluciones tecnológicas para propiedades horizontales</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <hr style="border:none;border-top:1px solid #e2eaf2;margin:0 0 20px;" />
              <p style="margin:0;font-size:11px;color:#aab8c6;text-align:center;line-height:1.7;">
                Este correo contiene información confidencial y está dirigido exclusivamente a <strong style="color:#8da5b5;">{{name}}</strong>.<br/>
                Por favor no lo reenvíe a terceros. © 2026 PH Core.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
    },
    SMS: {
      subject: null,
      body: "Asamblea {{assembly_name}} | PH Core Latam\n\nSus datos para ingresar a la plataforma:\nUsuario: {{doc_number}}\nContrasena: {{password}}\nIngrese aqui: {{appUrl}}/login?user={{doc_number}}\nSi no puede asistir, suba su poder desde ya en la plataforma.\nRevise su correo para mas informacion."
    }
  },
  OTP_SIGN: {
    EMAIL: {
      subject: "Código de Verificación para Firma de Poder",
      body: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Código de verificación – Firma digital de poder</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d3b6e 0%,#1a6faf 100%);padding:36px 40px 28px;text-align:center;">
              <p style="margin:0 0 10px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#7ec8f7;font-weight:600;">PH Core Latam</p>
              <img src="{{appUrl}}/ph-core-logo.png" alt="PH Core Icon" height="52" style="display:block;margin:0 auto 16px; border:0;" />
              <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">Firma Digital de Poder</h1>
              <p style="margin:0;font-size:14px;color:#a8d4f0;line-height:1.5;">Asamblea General – <strong style="color:#ffffff;">{{assembly_name}}</strong></p>
            </td>
          </tr>

          <!-- SALUDO -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0 0 16px;font-size:17px;color:#1a2e45;font-weight:700;">Estimado/a <span style="color:#1a6faf;">{{name}}</span>,</p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#3d5166;">
                Hemos recibido su solicitud para autorizar digitalmente su poder de representación en la <strong>Asamblea General de {{assembly_name}}</strong> sobre las unidades <strong>{{units}}</strong> (Coef: {{coef}}). Para completar el proceso, ingrese el siguiente código de verificación en la plataforma.
              </p>
            </td>
          </tr>

          <!-- DIVISOR -->
          <tr>
            <td style="padding:24px 40px 0;">
              <hr style="border:none;border-top:1px solid #e2eaf2;margin:0;" />
            </td>
          </tr>

          <!-- CÓDIGO OTP -->
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#0d3b6e;">🔐 Su código de verificación es:</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:linear-gradient(135deg,#e8f4fd,#d0e8f9);border:2px solid #1a6faf;border-radius:14px;padding:24px 40px;">
                      <p style="margin:0;font-size:48px;font-weight:900;color:#0d3b6e;letter-spacing:10px;font-family:'Courier New',Courier,monospace;">{{otp_code}}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:16px 0 0;font-size:13px;color:#7a9bb5;font-style:italic;">Este código tiene una vigencia de <strong style="color:#3d5166;">30 minutos</strong> y es de uso único.</p>
            </td>
          </tr>

          <!-- FIRMA -->
          <tr>
            <td style="padding:32px 40px 0;">
              <img src="{{appUrl}}/icon-dark.png" alt="PH Core Icon" height="36" style="display:block;margin:0 0 12px; border:0;" />
              <p style="margin:0 0 2px;font-size:14px;color:#7a9bb5;">Cordialmente,</p>
              <p style="margin:0 0 2px;font-size:16px;font-weight:800;color:#0d3b6e;">Equipo PH Core</p>
              <p style="margin:0;font-size:13px;color:#7a9bb5;font-style:italic;">Soluciones tecnológicas para propiedades horizontales</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <hr style="border:none;border-top:1px solid #e2eaf2;margin:0 0 20px;" />
              <p style="margin:0;font-size:11px;color:#aab8c6;text-align:center;line-height:1.7;">
                Este correo contiene información confidencial y está dirigido exclusivamente a <strong style="color:#8da5b5;">{{name}}</strong>.<br/>
                Por favor no lo reenvíe a terceros. © 2026 PH Core.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
    },
    SMS: {
      subject: null,
      body: `PHCore\nSu codigo de firma es {{otp_code}}\nNo lo comparta.`
    }
  },
  PROXY_DOCUMENT: {
    EMAIL: {
      subject: "Poder para Representación",
      body: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <h2 style="text-align: center; text-transform: uppercase; color: #333;">PODER PARA REPRESENTACIÓN EN ASAMBLEA GENERAL DE COPROPIETARIOS</h2>
  <br/>
  <p style="line-height: 1.6; color: #444; font-size: 16px;">Yo, <strong>{{NOMBRE_PODERDANTE}}</strong>, mayor de edad, identificado(a) con cédula de ciudadanía No. <strong>{{CEDULA_PODERDANTE}}</strong>, en mi calidad de propietario(a) dentro de la copropiedad, por medio del presente escrito confiero poder amplio y suficiente a <strong>{{NOMBRE_APODERADO}}</strong>, identificado(a) con cédula de ciudadanía No. <strong>{{CEDULA_APODERADO}}</strong>, para que me represente con voz y voto en la Asamblea General de Copropietarios, ordinaria o extraordinaria, que se realizará el día <strong>{{FECHA_ASAMBLEA}}</strong>, o en la fecha en que esta sea aplazada o reanudada.</p>
  
  <p style="line-height: 1.6; color: #444; font-size: 16px;">Este poder se otorga de conformidad con lo dispuesto en el artículo 37 de la Ley 675 de 2001, que autoriza la representación mediante poder escrito.</p>
  
  <p style="line-height: 1.6; color: #444; font-size: 16px;">El(la) apoderado(a) queda facultado(a) para:</p>
  <ul style="line-height: 1.6; color: #444; font-size: 16px;">
    <li>Participar en las deliberaciones.</li>
    <li>Votar en mi nombre todas las proposiciones sometidas a consideración.</li>
    <li>Postular y elegir miembros del consejo de administración y demás órganos de la copropiedad, cuando sea el caso.</li>
    <li>Ejercer plenamente mis derechos como propietario(a) durante la asamblea.</li>
  </ul>
  
  <p style="line-height: 1.6; color: #444; font-size: 16px;">En constancia se firma en <strong>{{CIUDAD}}</strong>, el día <strong>{{DIA}}</strong> del mes de <strong>{{MES}}</strong> de <strong>{{ANIO}}</strong>.</p>
  <br/><br/>
  <div style="border: 2px dashed #1a6faf; padding: 15px; margin-bottom: 20px; background-color: #f4f9fd; border-radius: 8px; max-width: 400px; display: inline-block;">
    <p style="margin: 0 0 10px; font-weight: bold; color: #0d3b6e; font-size: 16px;">Firma Digital Verificada en Plataforma</p>
    <p style="margin: 0 0 5px; font-size: 15px; color: #333;"><strong>Código de Verificación OTP:</strong> <span style="font-family: monospace; font-size: 18px; color: #1a6faf;">{{OTP}}</span></p>
    <p style="margin: 0; font-size: 15px; color: #333;"><strong>Sello de tiempo:</strong> {{TIMESTAMP}}</p>
  </div>
  <p style="line-height: 1.6; color: #444; font-size: 16px;">___________________________________________________<br/>
  <strong>{{NOMBRE_PODERDANTE}}</strong><br/>
  C.C. No. <strong>{{CEDULA_PODERDANTE}}</strong></p>
  <br/>
</div>`
    },
    SMS: {
      subject: null,
      body: ""
    }
  }
};

export async function getTemplate(assemblyId: string, type: NotificationType, channel: NotificationChannel): Promise<NotificationTemplate> {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Fetch from DB
  const { data } = await admin
    .from('notification_templates')
    .select('*')
    .eq('assembly_id', assemblyId)
    .eq('type', type)
    .eq('channel', channel)
    .single();

  if (data) {
    return data as NotificationTemplate;
  }

  // Return Default if not found in DB
  const defaultVals = DEFAULT_TEMPLATES[type][channel];
  return {
    assembly_id: assemblyId,
    type,
    channel,
    subject: defaultVals.subject,
    body: defaultVals.body
  };
}

export async function saveTemplate(template: NotificationTemplate) {
  const supabase = await createClient();

  // Verify SuperAdmin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'SUPER_ADMIN') throw new Error("Forbidden");

  const { error } = await supabase
    .from('notification_templates')
    .upsert({
      assembly_id: template.assembly_id,
      type: template.type,
      channel: template.channel,
      subject: template.subject,
      body: template.body
    }, { onConflict: 'assembly_id, type, channel' });

  if (error) {
    console.error("Error saving template:", error);
    return { success: false, message: error.message };
  }

  revalidatePath(`/superadmin/assemblies/${template.assembly_id}`);
  return { success: true, message: "Plantilla guardada correctamente" };
}

export async function sendWelcomeNotifications(assemblyId: string) {
  const supabase = await createClient();

  // Verify SuperAdmin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'SUPER_ADMIN') throw new Error("Forbidden");

  try {
    // 1. Get templates
    const emailTemplate = await getTemplate(assemblyId, 'WELCOME', 'EMAIL');
    const smsTemplate = await getTemplate(assemblyId, 'WELCOME', 'SMS');

    // 2. Fetch Assembly Context
    const { data: assembly } = await supabase.from('assemblies').select('*').eq('id', assemblyId).single();
    if (!assembly) throw new Error("Assembly not found");

    // 3. Fetch all properties for this assembly and their representatives. Owners are stored strictly as text fields.
    const { data: properties } = await supabase
      .from('units')
      .select(`
        coefficient,
        number,
        owner_name,
        owner_document_number,
        owner_email,
        owner_phone,
        representative_id,
        representative:users!units_representative_id_fkey (
          id,
          full_name,
          email,
          document_number
        )
      `)
      .eq('assembly_id', assemblyId);

    if (!properties || properties.length === 0) {
      return { success: false, message: "No se encontraron unidades en esta asamblea." };
    }

    // Deduplicate actual target users.
    const uniqueRepsMap = new Map();
    properties.forEach((prop: any) => {
      let actualTargetUser;

      if (prop.representative) {
        actualTargetUser = {
          ...prop.representative,
          phone: prop.owner_phone // Map owner's phone to the representative for SMS
        };
      } else if (prop.owner_document_number || prop.owner_email || prop.owner_phone) {
        // Fallback to Owner Data if no representative exists
        actualTargetUser = {
          id: prop.owner_document_number, // Use document mapped as ID for deduplication
          full_name: prop.owner_name || "Propietario",
          email: prop.owner_email,
          phone: prop.owner_phone,
          document_number: prop.owner_document_number,
          // Owners might not have raw passwords if they haven't been created as users yet via Bulk Upload,
          // but we map it logically anyway
          raw_password: prop.owner_document_number
        };
      }

      if (actualTargetUser && actualTargetUser.id && !uniqueRepsMap.has(actualTargetUser.id)) {
        uniqueRepsMap.set(actualTargetUser.id, actualTargetUser);
      }
    });

    const reps = Array.from(uniqueRepsMap.values());

    console.log('--- DEBUG NOTIFICATIONS QUERY ---');
    console.log('Assembly ID:', assemblyId);
    console.log('Raw Properties fetched:', JSON.stringify(properties, null, 2));
    console.log('Reps extracted:', reps.length);
    console.log('--------------------------------');

    if (reps.length === 0) {
      return { success: false, message: "Las unidades encontradas no tienen usuarios (propietarios o apoderados) asignados." };
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.phcore.lat";

    let emailsSent = 0;
    let smsSent = 0;

    // 4. Send notifications
    for (const rep of reps) {
      // Variables replacement
      const variables = {
        "{{name}}": rep.full_name || "",
        "{{doc_number}}": rep.document_number || "",
        "{{password}}": rep.raw_password || rep.document_number || "Contraseña enviada previamente",
        "{{appUrl}}": appUrl,
        "{{assembly_name}}": assembly.name
      };

      let emailBody = emailTemplate.body;
      let smsBody = smsTemplate.body;

      for (const [key, value] of Object.entries(variables)) {
        emailBody = emailBody.replace(new RegExp(key, 'g'), value);
        smsBody = smsBody.replace(new RegExp(key, 'g'), value);
      }

      const promises = [];

      if (rep.email) {
        promises.push(sendEmail(rep.email, emailTemplate.subject || "Bienvenido a su Asamblea", emailBody)
          .then(res => {
            fs.appendFileSync('debug_notifications.log', `Email result for ${rep.email}: ${JSON.stringify(res)}\n`);
            return { type: 'email', success: res.success };
          })
          .catch(err => {
            fs.appendFileSync('debug_notifications.log', `Email error for ${rep.email}: ${err}\n`);
            return { type: 'email', success: false };
          })
        );
      } else {
        fs.appendFileSync('debug_notifications.log', `No email available for ${rep.id}\n`);
      }

      if (rep.phone) {
        promises.push(sendSMS(rep.phone, smsBody)
          .then(res => {
            fs.appendFileSync('debug_notifications.log', `SMS result for ${rep.phone}: ${JSON.stringify(res)}\n`);
            return { type: 'sms', success: res.success };
          })
          .catch(err => {
            fs.appendFileSync('debug_notifications.log', `SMS error for ${rep.phone}: ${err}\n`);
            return { type: 'sms', success: false };
          })
        );
      } else {
        fs.appendFileSync('debug_notifications.log', `No phone available for ${rep.id}\n`);
      }

      // Wait for user's individual dispatch
      const results = await Promise.all(promises);

      emailsSent += results.filter(r => r.type === 'email' && r.success).length;
      smsSent += results.filter(r => r.type === 'sms' && r.success).length;
    }

    console.log(`Final Sent Count - Emails: ${emailsSent}, SMS: ${smsSent}`);

    return {
      success: true,
      message: `Notificaciones procesadas. Correos enviados: ${emailsSent}, SMS enviados: ${smsSent}.`
    };

  } catch (err: any) {
    console.error("Error sending bulk notifications:", err);
    return { success: false, message: err?.message || 'Error al enviar notificaciones' };
  }
}

