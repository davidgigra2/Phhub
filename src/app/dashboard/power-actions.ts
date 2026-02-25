"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import crypto from 'crypto';
import { sendEmail, sendSMS } from "@/lib/notifications";

export type ProxyType = 'DIGITAL' | 'PDF' | 'OPERATOR';

function getServiceClient() {
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

// ─────────────────────────────────────────────
// Business Rule 1: Auto-create Representative
// ─────────────────────────────────────────────
async function getOrCreateRepresentative(admin: any, repDoc?: string, repName?: string): Promise<string | null> {
    if (!repDoc) return null;

    // First try finding an existing user in public.users
    const { data: repUser } = await admin
        .from("users")
        .select("id")
        .eq("document_number", repDoc)
        .single();

    if (repUser) {
        return repUser.id;
    }

    // CREATE NEW USER IN AUTH
    const email = `${repDoc}@phcore.local`;
    let targetId: string | undefined = undefined;

    const { data: newAuthData, error: authErr } = await admin.auth.admin.createUser({
        email: email,
        password: repDoc,
        email_confirm: true
    });

    if (authErr) {
        // If auth user exists but public does not (Ghost User Scenario)
        if (authErr.code === 'email_exists' || (authErr.message && authErr.message.includes('already been registered'))) {
            const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
                type: 'magiclink',
                email: email
            });
            if (linkData?.user?.id) {
                targetId = linkData.user.id;
            } else {
                console.error("Ghost recovery failed:", linkErr || authErr);
                return null;
            }
        } else {
            console.error("Error creating proxy auth user:", authErr);
            return null;
        }
    } else {
        targetId = newAuthData?.user?.id;
    }

    if (!targetId) return null;

    // Insert into public.users
    const { error: insertErr } = await admin.from("users").insert({
        id: targetId,
        document_number: repDoc,
        full_name: repName || "Apoderado",
        role: 'USER',
        email: email
    });

    if (insertErr) {
        console.error("Error inserting ghost into public.users:", insertErr);
    }

    return targetId;
}

// Helper to transfer rights
async function activateProxyRights(admin: any, principalId: string, representativeId: string) {
    // We must find the owner's document to only transfer their own units
    const { data: principal } = await admin.from("users").select("document_number").eq("id", principalId).single();
    if (!principal) return;

    // Transfer the principal's owned units to the new representative
    await admin.from("units").update({ representative_id: representativeId })
        .eq("owner_document_number", principal.document_number)
        .eq("representative_id", principalId); // Only if they currently hold the power
}

// Helper to restore rights
async function restoreProxyRights(admin: any, principalId: string, representativeId: string) {
    const { data: principal } = await admin.from("users").select("document_number").eq("id", principalId).single();
    if (!principal) return;

    // Revert the units back to the principal
    await admin.from("units").update({ representative_id: principalId })
        .eq("owner_document_number", principal.document_number)
        .eq("representative_id", representativeId);
}


// ─────────────────────────────────────────────
// OTP Actions
// ─────────────────────────────────────────────
export async function requestProxyOTP(params: {
    representativeDoc?: string;
    representativeId?: string;
    externalName?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticado" };

    const admin = getServiceClient();

    // Check if the current user has any units to their name to avoid chaining
    const { data: myUser } = await admin.from("users").select("document_number").eq("id", user.id).single();
    if (myUser) {
        const { data: ownUnits } = await admin.from("units")
            .select("id")
            .eq("owner_document_number", myUser.document_number)
            .limit(1);

        if (!ownUnits || ownUnits.length === 0) {
            return { success: false, message: "No eres propietario nativo, por lo que no puedes delegar facultades." };
        }
    }

    let representativeId = params.representativeId || null;
    if (!representativeId && params.representativeDoc) {
        const { data: repUser } = await admin
            .from("users")
            .select("id")
            .eq("document_number", params.representativeDoc)
            .single();

        if (repUser) {
            representativeId = repUser.id;
        }
    }

    if (representativeId && representativeId === user.id) {
        return { success: false, message: "No puedes representarte a ti mismo como tercero." };
    }

    const { data: units } = await admin.from("units")
        .select("owner_phone, owner_email, assembly_id, coefficient, number, owner_name, assemblies(name)")
        .eq("representative_id", user.id);

    if (!units || units.length === 0) {
        return { success: false, message: "No posees unidades asignadas para otorgar poder." };
    }

    const validUnit = units[0];
    const phone = validUnit?.owner_phone;
    const email = validUnit?.owner_email;
    const assemblyId = validUnit?.assembly_id;
    const assemblyName = validUnit?.assemblies?.name || "Asamblea General";

    const unitNumbers = units.map((u: any) => u.number).join(", ");
    const totalCoef = units.reduce((acc: number, u: any) => acc + (Number(u.coefficient) || 0), 0).toFixed(4);
    const ownerName = validUnit?.owner_name || "Propietario";

    if (!phone && !email) {
        return { success: false, message: "No tienes un número de celular ni correo registrado para recibir el OTP." };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 30 * 60000).toISOString();

    const { data: proxyData, error: proxyErr } = await admin.from("proxies").insert({
        principal_id: user.id,
        representative_id: representativeId,
        external_name: params.externalName,
        external_doc_number: params.representativeDoc,
        type: 'DIGITAL',
        status: 'PENDING',
        is_external: !representativeId
    }).select().single();

    if (proxyErr) return { success: false, message: proxyErr.message };

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = headersList.get('user-agent') || 'Unknown';

    const { data: sigData, error: sigErr } = await admin.from("digital_signatures").insert({
        proxy_id: proxyData.id,
        user_id: user.id,
        phone_number: phone || email || 'UNKNOWN',
        otp_code: otp,
        otp_expires_at: expiresAt,
        status: 'PENDING',
        ip_address: ip,
        user_agent: userAgent
    }).select().single();

    if (sigErr) return { success: false, message: sigErr.message };

    // Set up variables for templates
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.phcore.lat";
    const variables: Record<string, string> = {
        "{{name}}": ownerName,
        "{{units}}": unitNumbers,
        "{{coef}}": totalCoef,
        "{{otp_code}}": otp,
        "{{appUrl}}": appUrl,
        "{{assembly_name}}": assemblyName,
        "{{doc_number}}": params.representativeDoc || "",
        "{{password}}": ""
    };

    const { getTemplate } = await import("@/app/superadmin/assemblies/[id]/notifications/actions");

    let dispatchSuccess = false;
    let smsError = "";
    let emailError = "";

    // Fetch and send SMS Template
    if (phone) {
        try {
            const smsTpl = await getTemplate(assemblyId, 'OTP_SIGN', 'SMS');
            let smsBody = smsTpl.body;

            for (const [key, value] of Object.entries(variables)) {
                smsBody = smsBody.replace(new RegExp(key, 'g'), value);
            }

            const smsRes = await sendSMS(phone, smsBody);
            if (smsRes.success || smsRes.mocked) {
                dispatchSuccess = true;
            } else {
                smsError = smsRes.error || "SMS API Error";
            }
        } catch (e: any) {
            smsError = e.message;
        }
    }

    // Fetch and send EMAIL Template
    if (email) {
        try {
            const emailTpl = await getTemplate(assemblyId, 'OTP_SIGN', 'EMAIL');
            let emailSubject = emailTpl.subject || "Código de Verificación";
            let emailBody = emailTpl.body;

            for (const [key, value] of Object.entries(variables)) {
                emailBody = emailBody.replace(new RegExp(key, 'g'), value);
            }

            const emailRes = await sendEmail(email, emailSubject, emailBody);
            if (emailRes.success || emailRes.mocked) {
                dispatchSuccess = true;
            } else {
                emailError = emailRes.error || "Google SMTP Error";
            }
        } catch (e: any) {
            emailError = e.message;
        }
    }

    if (!dispatchSuccess) {
        let errMsg = "Fallo al enviar notificación.";
        if (smsError) errMsg += ` SMS: ${smsError}.`;
        if (emailError) errMsg += ` Email: ${emailError}.`;
        return { success: false, message: errMsg };
    }

    return {
        success: true,
        message: "Notificación OTP enviada",
        signatureId: sigData.id,
        phoneEnd: phone ? phone.slice(-4) : email?.split('@')[0].slice(-4)
    };
}

export async function verifyProxyOTP(signatureId: string, otpCode: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticado" };

    const admin = getServiceClient();

    const { data: intent } = await admin.from("digital_signatures")
        .select("*, proxies(*)")
        .eq("id", signatureId)
        .eq("user_id", user.id)
        .single();

    if (!intent) return { success: false, message: "Trámite de firma no encontrado." };
    if (intent.status !== 'PENDING') {
        console.log("OTP Verification Failed: Ya procesado");
        return { success: false, message: "El código ya fue procesado." };
    }

    console.log(`Checking expiration. Exp at: ${intent.otp_expires_at}. Now is: ${new Date().toISOString()}`);
    if (new Date(intent.otp_expires_at) < new Date()) {
        console.log("OTP Verification Failed: Expirado");
        await admin.from("digital_signatures").update({ status: 'EXPIRED' }).eq("id", signatureId);
        return { success: false, message: "El código ha expirado." };
    }

    const providedCode = String(otpCode || '').trim();
    const dbCode = String(intent.otp_code || '').trim();
    console.log(`Comparing codes. Provided: '${providedCode}' vs DB: '${dbCode}'`);
    if (dbCode !== providedCode) {
        return { success: false, message: "Código incorrecto." };
    }

    // Determine representative ID. If null, we create it now.
    let finalRepresentativeId = intent.proxies.representative_id;
    if (!finalRepresentativeId && intent.proxies.external_doc_number) {
        const createdId = await getOrCreateRepresentative(
            admin,
            intent.proxies.external_doc_number,
            intent.proxies.external_name
        );
        if (createdId) {
            finalRepresentativeId = createdId;
            // Update the proxy record with the actual ID
            await admin.from("proxies").update({ representative_id: finalRepresentativeId })
                .eq("id", intent.proxy_id);
        } else {
            return { success: false, message: "Falló la creación del usuario apoderado al verificar." };
        }
    }

    const contentToHash = JSON.stringify({
        proxy_id: intent.proxy_id,
        principal_id: user.id,
        representative_id: finalRepresentativeId,
        external_name: intent.proxies.external_name,
        ip: intent.ip_address,
        user_agent: intent.user_agent,
        timestamp: new Date().toISOString()
    });
    const hash = crypto.createHash('sha256').update(contentToHash).digest('hex');

    await admin.from("digital_signatures").update({
        status: 'VERIFIED',
        document_hash: hash,
        verified_at: new Date().toISOString()
    }).eq("id", signatureId);

    // Disable old powers
    const { data: oldProxies } = await admin.from("proxies").select("id, representative_id").eq("principal_id", user.id).eq("status", "APPROVED");
    if (oldProxies) {
        for (const op of oldProxies) {
            await restoreProxyRights(admin, user.id, op.representative_id);
            await admin.from("proxies").update({ status: 'REVOKED' }).eq("id", op.id);
        }
    }

    await admin.from("proxies").update({ status: 'APPROVED' }).eq("id", intent.proxy_id);
    if (finalRepresentativeId) {
        await activateProxyRights(admin, user.id, finalRepresentativeId);
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Firma digital verificada exitosamente. Poder activo.", proxyId: intent.proxy_id };
}

// ─────────────────────────────────────────────
// Other Manual/PDF Proxy Action
// ─────────────────────────────────────────────
export async function registerProxy(params: {
    representativeDoc?: string;
    representativeId?: string;
    type: ProxyType;
    externalName?: string;
    externalDoc?: string;
    documentUrl?: string;
}) {
    // Only used for PDF uploads and Manual Operator input now
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticado" };

    const admin = getServiceClient();

    try {
        let representativeId = params.representativeId;
        if (!representativeId && params.representativeDoc) {
            const createdId = await getOrCreateRepresentative(admin, params.representativeDoc, params.externalName);
            if (createdId) {
                representativeId = createdId;
            } else {
                return { success: false, message: "Falló la creación del usuario apoderado." };
            }
        }

        if (representativeId && representativeId === user.id) {
            return { success: false, message: "No puedes representarte a ti mismo como tercero." };
        }

        const { data: oldProxies } = await admin.from("proxies").select("id, representative_id, document_url").eq("principal_id", user.id).eq("status", "APPROVED");
        if (oldProxies) {
            for (const op of oldProxies) {
                await restoreProxyRights(admin, user.id, op.representative_id);

                // Cleanup old document if exists
                if (op.document_url) {
                    try {
                        const urlParts = op.document_url.split('/proxies/');
                        if (urlParts.length === 2) {
                            await admin.storage.from('proxies').remove([urlParts[1]]);
                        }
                    } catch (e) { console.error("Error deleting old proxy doc:", e); }
                }

                await admin.from("proxies").update({ status: 'REVOKED' }).eq("id", op.id);
            }
        }

        const { data: newProxy, error } = await admin.from("proxies").insert({
            principal_id: user.id,
            representative_id: representativeId,
            external_name: params.externalName,
            external_doc_number: params.externalDoc || params.representativeDoc,
            type: params.type,
            status: 'APPROVED',
            is_external: !representativeId,
            document_url: params.documentUrl
        }).select().single();

        if (error) throw error;

        // Activate Rights
        if (representativeId) {
            await activateProxyRights(admin, user.id, representativeId);
        }

        revalidatePath("/dashboard");
        return { success: true, message: "Poder registrado exitosamente." };

    } catch (error: any) {
        console.error("Error registering proxy:", error);
        return { success: false, message: error.message };
    }
}

export async function revokeProxy(proxyId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticado" };

    const admin = getServiceClient();

    // Verify ownership & get the rep
    const { data: proxy } = await admin.from("proxies").select("representative_id, document_url").eq("id", proxyId).eq("principal_id", user.id).single();
    if (!proxy) return { success: false, message: "No tienes permiso para revocar este poder." };

    await restoreProxyRights(admin, user.id, proxy.representative_id);

    // If there is a document_url, we should try to delete the file from Storage
    if (proxy.document_url) {
        try {
            // Public URLs look like: https://.../storage/v1/object/public/proxies/userId/filename.pdf
            // We need to extract the path: userId/filename.pdf
            const urlParts = proxy.document_url.split('/proxies/');
            if (urlParts.length === 2) {
                const filePath = urlParts[1];
                const { error: deleteError } = await admin.storage.from('proxies').remove([filePath]);
                if (deleteError) {
                    console.error("Failed to delete proxy document from storage:", deleteError);
                }
            }
        } catch (err) {
            console.error("Error parsing or deleting document URL:", err);
        }
    }

    const { error } = await admin.from("proxies").update({ status: 'REVOKED' }).eq("id", proxyId);

    if (error) return { success: false, message: error.message };

    revalidatePath("/dashboard");
    return { success: true, message: "Poder revocado." };
}

export async function getMyPowerStats(userId: string) {
    const admin = getServiceClient();

    const { data: currentUser } = await admin.from("users").select("document_number").eq("id", userId).single();

    const { data: representedUnitsData } = await admin
        .from("units")
        .select("number, coefficient, owner_document_number, owner_name")
        .eq("representative_id", userId);

    let ownWeight = 0;
    let representedWeight = 0;
    const representedUnits: any[] = [];

    representedUnitsData?.forEach((u: any) => {
        const coef = u.coefficient || 0;
        const isOwner = currentUser && u.owner_document_number === currentUser.document_number;

        if (isOwner) {
            ownWeight += coef;
        } else {
            representedWeight += coef;
            representedUnits.push({
                name: u.owner_name || u.owner_document_number || "Asambleísta Tercero",
                unit: u.number,
                coefficient: coef
            });
        }
    });

    return {
        ownWeight,
        representedWeight,
        totalWeight: ownWeight + representedWeight,
        representedUnits
    };
}

export async function linkGeneratedProxyPDF(proxyId: string, documentUrl: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticado" };

    const admin = getServiceClient();

    // Verify proxy belongs to user or was created for them
    const { data: proxy } = await admin.from("proxies").select("id, principal_id").eq("id", proxyId).single();
    if (!proxy) return { success: false, message: "Poder no encontrado" };
    // It's allowed if the current user is the principal
    if (proxy.principal_id !== user.id) return { success: false, message: "No autorizado" };

    try {
        await admin.from('proxies').update({ document_url: documentUrl }).eq('id', proxyId);
        return { success: true };
    } catch (e: any) {
        console.error("Error linking generated PDF:", e);
        return { success: false, message: e.message };
    }
}

export async function getProxyDocumentContent(params: { representativeDoc?: string; representativeName?: string; isPreview?: boolean; proxyId?: string; }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticado" };
    const admin = getServiceClient();

    const { data: myUser } = await admin.from("users").select("document_number, full_name").eq("id", user.id).single();
    if (!myUser) return { success: false, message: "Usuario no encontrado" };

    let unit;
    const res = await admin.from("units").select("assembly_id, assemblies(name, date, city)").eq("owner_document_number", myUser.document_number).limit(1).single();
    if (res.error && res.error.message && res.error.message.includes("does not exist")) {
        const fallbackRes = await admin.from("units").select("assembly_id, assemblies(name)").eq("owner_document_number", myUser.document_number).limit(1).single();
        unit = fallbackRes.data;
    } else {
        unit = res.data;
    }

    let assemblyId = unit?.assembly_id;
    let assemblyDateStr = (unit?.assemblies as any)?.date || null;
    let assemblyCity = (unit?.assemblies as any)?.city || "Bogotá";

    let otpValue = "Pendiente por firmar";
    let timestampValue = "Pendiente por firmar";
    let representativeDoc = params.representativeDoc || "";
    let representativeName = params.representativeName || "";

    if (params.proxyId) {
        const { data: proxyData } = await admin.from("proxies").select("*, digital_signatures(otp_code, verified_at)").eq("id", params.proxyId).single();
        if (!proxyData) return { success: false, message: "Poder no encontrado" };
        representativeDoc = proxyData.external_doc_number || "";
        representativeName = proxyData.external_name || "";

        let signature = proxyData.digital_signatures && Array.isArray(proxyData.digital_signatures) && proxyData.digital_signatures.length > 0 ? proxyData.digital_signatures[0] : null;
        if (proxyData.digital_signatures && !Array.isArray(proxyData.digital_signatures)) {
            signature = proxyData.digital_signatures;
        }

        if (signature?.verified_at) {
            otpValue = signature.otp_code || "Sin código";
            const dateObj = new Date(signature.verified_at);
            timestampValue = dateObj.toLocaleString('es-CO');
        }
    }

    const { getTemplate } = await import("@/app/superadmin/assemblies/[id]/notifications/actions");
    const docTpl = await getTemplate(assemblyId, 'PROXY_DOCUMENT', 'EMAIL');

    const asDate = new Date(assemblyDateStr || Date.now());
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const vars: Record<string, string> = {
        "{{NOMBRE_PODERDANTE}}": myUser.full_name || "Propietario",
        "{{CEDULA_PODERDANTE}}": myUser.document_number || "",
        "{{NOMBRE_APODERADO}}": representativeName,
        "{{CEDULA_APODERADO}}": representativeDoc,
        "{{FECHA_ASAMBLEA}}": asDate.toLocaleDateString('es-CO'),
        "{{CIUDAD}}": assemblyCity,
        "{{DIA}}": asDate.getDate().toString(),
        "{{MES}}": monthNames[asDate.getMonth()],
        "{{ANIO}}": asDate.getFullYear().toString(),
        "{{OTP}}": otpValue,
        "{{TIMESTAMP}}": timestampValue,
    };

    let body = docTpl.body;
    for (const [key, val] of Object.entries(vars)) {
        body = body.replace(new RegExp(key, 'g'), val);
    }

    return { success: true, html: body, htmlBase64: Buffer.from(body).toString('base64') };
}
